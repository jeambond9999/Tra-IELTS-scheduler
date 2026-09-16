# frozen_string_literal: true

class LessonSessionsController < InertiaController
  before_action :authenticate_user!
  before_action -> { authorize_roles!(:teacher, :sales, :cs) }, only: %i[update]
  before_action -> { authorize_roles!(:sales, :cs) }, only: %i[reschedule shift_subsequent batch_update destroy]

  def update
    lesson = LessonSession.find(params[:id])
    enrollment = lesson.enrollment
    student = enrollment.student

    ActiveRecord::Base.transaction do
      if params[:lesson_session].present?
        if params[:lesson_session][:day_label].present?
          raw_label = params[:lesson_session][:day_label].to_s.strip
          # If user typed 'Day 1' or 'Day 1 & 2' without '/total', format properly
          day_part = raw_label.split("/").first.to_s.strip
          formatted_label = if enrollment.total_sessions.to_i > 0 && !raw_label.include?("/")
            "#{day_part}/#{enrollment.total_sessions}"
          else
            raw_label
          end

          lesson.update_column(:day_label, formatted_label)

          if params[:cascade].to_s == "true"
            digits = day_part.scan(/\d+/).map(&:to_i)
            last_day = digits.max || 1

            sessions = enrollment.lesson_sessions.order(scheduled_on: :asc, start_time: :asc).to_a
            current_idx = sessions.index { |s| s.id == lesson.id }
            if current_idx
              next_day = last_day + 1
              sessions[(current_idx + 1)..].each do |s|
                is_sub_double = s.duration_minutes >= 50
                step = is_sub_double ? 2 : 1
                end_d = [ next_day + step - 1, enrollment.total_sessions ].min
                sub_label = next_day == end_d ? "Day #{next_day}/#{enrollment.total_sessions}" : "Day #{next_day} & #{end_d}/#{enrollment.total_sessions}"
                s.update_column(:day_label, sub_label)
                next_day = end_d + 1
              end
            end
          end
        end

        lesson.update!(lesson_session_params.except(:day_label))

        if params[:lesson_session][:day_number].present? && !params[:lesson_session][:day_label].present?
          day_num = params[:lesson_session][:day_number].to_s[/\d+/].to_i
          lesson.update_subsequent_day_labels!(day_num) if day_num > 0
        end
      end

      if params[:enrollment].present?
        enrollment.update!(enrollment_params)
        enrollment.recalculate_day_labels! if params[:enrollment][:total_sessions].present? && !params.dig(:lesson_session, :day_number).present? && !params.dig(:lesson_session, :day_label).present?
      end

      if params[:student].present?
        if (params[:student][:name].present? || params[:student][:code].present?) && current_user.present? && !current_user.pure_admin? && !current_user.admin? && !current_user.sales? && !current_user.cs?
          return redirect_to_scheduler(alert: "Chỉ Sales và CS mới có quyền chỉnh sửa tên và mã học viên.")
        end
        student.update!(student_params)
      end
    end

    redirect_to_scheduler(notice: "Đã cập nhật buổi học.")
  rescue ActiveRecord::RecordInvalid => e
    redirect_to_scheduler(alert: e.record.errors.full_messages.first)
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  def reschedule
    lesson = LessonSession.find(params[:id])
    old_date = lesson.scheduled_on
    old_time = lesson.start_time
    new_date = Date.parse(reschedule_params[:scheduled_on].to_s) rescue nil
    new_time = reschedule_params[:start_time]
    new_teacher_id = reschedule_params[:teacher_id].presence || lesson.teacher_id

    unless new_date && new_time.present?
      return redirect_to_scheduler(alert: "Vui lòng chọn ngày và giờ hợp lệ.")
    end

    shift_subsequent = params[:shift_subsequent].to_s == "true" || params[:shift_subsequent].to_s == "1"
    delta_days = (new_date - old_date).to_i

    ActiveRecord::Base.transaction do
      update_attrs = {
        scheduled_on: new_date,
        start_time: new_time,
        end_time: Schedules::Calendar.end_time(new_time, lesson.duration_minutes),
        teacher_id: new_teacher_id
      }

      if shift_subsequent && delta_days != 0
        subsequent_sessions = lesson.enrollment.lesson_sessions
                                     .where.not(id: lesson.id)
                                     .where("scheduled_on > ? OR (scheduled_on = ? AND start_time > ?)", old_date, old_date, old_time)

        if delta_days > 0
          # Move subsequent sessions from farthest future first so slots are free
          ordered_sessions = subsequent_sessions.order(scheduled_on: :desc, start_time: :desc)
          ordered_sessions.each do |s|
            s.update!(scheduled_on: s.scheduled_on + delta_days.days)
          end

          lesson.update!(update_attrs)
        else
          # Move lesson first, then subsequent sessions from nearest to farthest
          lesson.update!(update_attrs)

          ordered_sessions = subsequent_sessions.order(scheduled_on: :asc, start_time: :asc)
          ordered_sessions.each do |s|
            s.update!(scheduled_on: s.scheduled_on + delta_days.days)
          end
        end
      else
        lesson.update!(update_attrs)
      end

      lesson.enrollment.recalculate_day_labels!
    end

    msg = if shift_subsequent && delta_days != 0
      diff_str = delta_days > 0 ? "+#{delta_days}" : delta_days.to_s
      "✅ Đã dời lịch buổi học và tự động dời #{diff_str} ngày cho toàn bộ các buổi sau."
    else
      "Đã dời lịch học."
    end
    redirect_to_scheduler(notice: msg)
  rescue ActiveRecord::RecordInvalid => e
    redirect_to_scheduler(alert: e.record.errors.full_messages.first)
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  def shift_subsequent
    lesson = LessonSession.find(params[:id])

    ActiveRecord::Base.transaction do
      lessons_to_shift = lesson.enrollment.lesson_sessions
                               .where("scheduled_on >= ?", lesson.scheduled_on)
                               .order(scheduled_on: :desc)

      lessons_to_shift.each do |l|
        l.update!(scheduled_on: l.scheduled_on + 7.days)
      end
    end

    redirect_to_scheduler(notice: "Đã đẩy lùi 1 tuần cho buổi học này và các buổi sau.")
  rescue ActiveRecord::RecordInvalid => e
    redirect_to_scheduler(alert: e.record.errors.full_messages.first)
  end

  def batch_update
    session_ids = Array(params[:session_ids]).map(&:to_i).reject(&:zero?)
    if session_ids.empty?
      return redirect_to_scheduler(alert: "Chưa chọn buổi học nào để cập nhật.")
    end

    if params[:tag_to_apply].present?
      tag = params[:tag_to_apply].to_s.strip
      ActiveRecord::Base.transaction do
        LessonSession.where(id: session_ids).find_each do |session|
          current_note = session.lesson_notes.to_s.strip
          cleaned_note = current_note.gsub(/\[Take notes[^\]]*\]/i, "").gsub(/\s{2,}/, " ").strip
          new_note = cleaned_note.present? ? "#{tag} #{cleaned_note}" : tag
          session.update!(lesson_notes: new_note)
        end
      end
      return redirect_to_scheduler(notice: "✅ Đã gắn tag #{tag} cho #{session_ids.length} buổi học.")
    end

    if params[:tag_to_toggle].present?
      tag = params[:tag_to_toggle].to_s.strip
      ActiveRecord::Base.transaction do
        LessonSession.where(id: session_ids).find_each do |session|
          current_note = session.lesson_notes.to_s.strip
          new_note = if current_note.include?(tag)
            current_note.gsub(tag, "").gsub(/\s{2,}/, " ").strip
          else
            current_note.present? ? "#{tag} #{current_note}" : tag
          end
          session.update!(lesson_notes: new_note)
        end
      end
      return redirect_to_scheduler(notice: "✅ Đã cập nhật tag #{tag} cho #{session_ids.length} buổi học.")
    end

    updates = params.fetch(:updates, {}).permit(:lesson_status, :cs_status, :cs_form, :lesson_notes)
    clean_updates = updates.to_h.compact_blank

    if clean_updates.empty?
      return redirect_to_scheduler(alert: "Không có thông tin thay đổi.")
    end

    ActiveRecord::Base.transaction do
      LessonSession.where(id: session_ids).find_each do |session|
        session.update!(clean_updates)
      end
    end

    redirect_to_scheduler(notice: "✅ Đã cập nhật hàng loạt #{session_ids.length} buổi học.")
  rescue ActiveRecord::RecordInvalid => e
    redirect_to_scheduler(alert: e.record.errors.full_messages.first)
  end

  def destroy
    lesson = LessonSession.find(params[:id])
    lesson.destroy
    redirect_to_scheduler(notice: "🗑️ Đã xóa buổi học.")
  end

  private

  def lesson_session_params
    params.require(:lesson_session).permit(:lesson_status, :lesson_notes, :cs_form, :cs_status, :day_label)
  end

  def enrollment_params
    params.require(:enrollment).permit(:course_name, :total_sessions, :payment_status, :tuition_note)
  end

  def student_params
    params.require(:student).permit(:name, :code, :baseline, :aim, :exam_date, :student_note)
  end

  def reschedule_params
    params.require(:lesson_session).permit(:scheduled_on, :start_time, :teacher_id)
  end

  def redirect_params
    params.permit(:role, :person_id, :teacher_id, :month_key, :week_name)
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
