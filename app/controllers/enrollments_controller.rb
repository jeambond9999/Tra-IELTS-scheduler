# frozen_string_literal: true

class EnrollmentsController < InertiaController
  before_action :authenticate_user!
  before_action -> { authorize_roles!(:sales) }, only: %i[create destroy]
  before_action -> { authorize_roles!(:sales, :cs) }, only: %i[update recalculate_days reschedule_remaining reserve resume cancel_reservation]

  def create
    Schedules::BookEnrollment.call(enrollment_params.to_h.symbolize_keys)
    redirect_to_scheduler(notice: "Xếp lịch học thành công.")
  rescue Schedules::BookEnrollment::BookingError => error
    redirect_to_scheduler(alert: error.messages.first)
  rescue ActiveRecord::RecordInvalid => error
    redirect_to_scheduler(alert: error.record.errors.full_messages.first)
  rescue => error
    redirect_to_scheduler(alert: error.message)
  end

  def update
    enrollment = Enrollment.find(params[:id])

    ActiveRecord::Base.transaction do
      attrs = {}
      attrs[:course_name] = update_params[:course_name] if update_params.key?(:course_name)
      attrs[:total_sessions] = update_params[:total_sessions] if update_params.key?(:total_sessions)
      attrs[:payment_status] = update_params[:payment_status] if update_params.key?(:payment_status)
      attrs[:tuition_note] = update_params[:tuition_note] if update_params.key?(:tuition_note)
      attrs[:active] = update_params[:active] if update_params.key?(:active)

      enrollment.update!(attrs) if attrs.present?

      student_attrs = {}
      if (update_params.key?(:student_name) || update_params.key?(:student_code)) && current_user.present? && !current_user.pure_admin? && !current_user.admin? && !current_user.sales? && !current_user.cs?
        return redirect_to_scheduler(alert: "Chỉ Sales và CS mới có quyền chỉnh sửa tên và mã học viên.")
      end
      student_attrs[:name] = update_params[:student_name].to_s.strip if update_params.key?(:student_name) && update_params[:student_name].present?
      student_attrs[:code] = update_params[:student_code].to_s.strip if update_params.key?(:student_code) && update_params[:student_code].present?
      student_attrs[:baseline] = update_params[:baseline] if update_params.key?(:baseline)
      student_attrs[:aim] = update_params[:aim] if update_params.key?(:aim)
      if update_params.key?(:exam_date)
        raw_val = update_params[:exam_date].to_s.strip
        if raw_val.blank?
          student_attrs[:exam_date] = nil
        else
          col = Student.columns_hash["exam_date"]
          if col&.type == :date
            parsed = if raw_val =~ /\A(\d{1,2})\/(\d{4})\z/
              Date.new($2.to_i, $1.to_i, 1) rescue nil
            elsif raw_val =~ /\A(\d{4})-(\d{1,2})\z/
              Date.new($1.to_i, $2.to_i, 1) rescue nil
            elsif raw_val =~ /\A(\d{1,2})\/(\d{1,2})\/(\d{4})\z/
              Date.new($3.to_i, $2.to_i, $1.to_i) rescue nil
            elsif raw_val =~ /(?:tháng|thang|t)\s*(\d{1,2})(?:\/|[- ])?(\d{4})?/i
              month = $1.to_i
              year = $2.present? ? $2.to_i : Date.current.year
              Date.new(year, month, 1) rescue nil
            else
              Date.parse(raw_val) rescue nil
            end
            student_attrs[:exam_date] = parsed || raw_val
          else
            student_attrs[:exam_date] = raw_val
          end
        end
      end
      student_attrs[:student_note] = update_params[:student_note] if update_params.key?(:student_note)

      if update_params.key?(:student_note) && student_attrs[:exam_date].blank? && enrollment.student.exam_date.blank?
        extracted = Student.extract_exam_date(update_params[:student_note])
        if extracted.present?
          col = Student.columns_hash["exam_date"]
          if col&.type == :date
            if extracted =~ /\A(\d{1,2})\/(\d{4})\z/
              student_attrs[:exam_date] = Date.new($2.to_i, $1.to_i, 1) rescue nil
            end
          else
            student_attrs[:exam_date] = extracted
          end
          if Student.column_names.include?("exam_status") && (!update_params.key?(:exam_status) || update_params[:exam_status] == "chưa thi")
            if Student.upcoming_exam?(extracted)
              student_attrs[:exam_status] = "sắp thi"
            end
          end
        end
      end

      if update_params.key?(:exam_status)
        raw_status = update_params[:exam_status].to_s.strip.downcase
        if Student.column_names.include?("exam_status")
          student_attrs[:exam_status] = raw_status.presence || "chưa thi"
        end
      elsif update_params.key?(:exam_date) && Student.column_names.include?("exam_status") && enrollment.student.exam_status != "đã thi"
        if student_attrs[:exam_date].present? && Student.upcoming_exam?(student_attrs[:exam_date])
          student_attrs[:exam_status] = "sắp thi"
        elsif student_attrs[:exam_date].blank? && enrollment.student.exam_status == "sắp thi"
          student_attrs[:exam_status] = "chưa thi"
        end
      end

      if update_params.key?(:actual_score)
        val = update_params[:actual_score].to_s.strip
        if Student.column_names.include?("actual_score")
          student_attrs[:actual_score] = val.presence
        end
        if val.present? && Student.column_names.include?("exam_status")
          student_attrs[:exam_status] = "đã thi"
        end
        if Student.column_names.include?("aim_achieved")
          aim_to_check = student_attrs[:aim] || enrollment.student.aim
          student_attrs[:aim_achieved] = Student.evaluate_aim(aim_to_check, val.presence)
        end
      end

      enrollment.student.update!(student_attrs) if student_attrs.present?

      if enrollment.saved_change_to_total_sessions?
        enrollment.recalculate_day_labels!
      end
    end

    status_msg = if update_params.key?(:active) && update_params.keys.size == 1
      enrollment.active? ? "✅ Đã mở lại khóa học cho học viên." : "🎓 Đã chuyển học viên sang trạng thái Đã end khóa."
    elsif update_params.key?(:actual_score) || update_params.key?(:exam_status)
      "✅ Đã cập nhật kết quả thi của học viên thành công."
    elsif update_params.key?(:exam_date) || update_params.key?(:student_note)
      "✅ Đã cập nhật thông tin học viên thành công."
    elsif update_params.key?(:baseline) || update_params.key?(:aim)
      "✅ Đã cập nhật đầu vào / mục tiêu của học viên thành công."
    else
      "Cập nhật thông tin khóa học thành công."
    end

    redirect_to_scheduler(notice: status_msg)
  rescue ActiveRecord::RecordInvalid => e
    redirect_to_scheduler(alert: e.record.errors.full_messages.first)
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  def destroy
    enrollment = Enrollment.find(params[:id])
    student_name = enrollment.student&.name || "học viên"
    total = enrollment.lesson_sessions.count

    enrollment.destroy!
    redirect_to_scheduler(notice: "🗑️ Đã xóa toàn bộ khóa học (#{total} buổi) của học viên #{student_name}.")
  rescue ActiveRecord::RecordNotDestroyed => e
    redirect_to_scheduler(alert: e.record.errors.full_messages.first)
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  def recalculate_days
    enrollment = Enrollment.find(params[:id])
    enrollment.recalculate_day_labels!
    redirect_to_scheduler(notice: "✅ Đã tự động sắp xếp lại nhãn Day cho khóa học.")
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  def reschedule_remaining
    result = Schedules::RescheduleRemainingSessions.call(reschedule_params.to_h.symbolize_keys.merge(enrollment_id: params[:id]))
    redirect_to_scheduler(notice: "⚡ Đã xếp lại #{result[:created_count]} buổi học theo lịch và tần suất mới thành công.")
  rescue Schedules::RescheduleRemainingSessions::RescheduleError => error
    redirect_to_scheduler(alert: error.messages.first)
  rescue ActiveRecord::RecordInvalid => error
    redirect_to_scheduler(alert: error.record.errors.full_messages.first)
  rescue => error
    redirect_to_scheduler(alert: error.message)
  end

  def reserve
    result = Schedules::ReserveEnrollment.call(
      enrollment_id: params[:id],
      action: "reserve",
      reserved_from: params.dig(:reservation, :reserved_from),
      resume_date: params.dig(:reservation, :resume_date),
      reservation_note: params.dig(:reservation, :reservation_note)
    )
    redirect_to_scheduler(notice: "⏸️ Đã bảo lưu khóa học cho học viên (gỡ #{result[:removed_count]} buổi chưa học).")
  rescue Schedules::ReserveEnrollment::ReservationError => e
    redirect_to_scheduler(alert: e.messages.first)
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  def resume
    result = Schedules::ReserveEnrollment.call(
      reschedule_params.to_h.symbolize_keys.merge(
        enrollment_id: params[:id],
        action: "resume",
        resume_date: params.dig(:reschedule, :resume_date) || params.dig(:reschedule, :start_date)
      )
    )
    redirect_to_scheduler(notice: "🚀 Đã kích hoạt học lại và xếp #{result[:created_count]} buổi học mới thành công.")
  rescue Schedules::ReserveEnrollment::ReservationError => e
    redirect_to_scheduler(alert: e.messages.first)
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  def cancel_reservation
    Schedules::ReserveEnrollment.call(
      enrollment_id: params[:id],
      action: "cancel_reservation"
    )
    redirect_to_scheduler(notice: "✅ Đã hủy bảo lưu khóa học.")
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  private

  def reschedule_params
    params.require(:reschedule).permit(
      :from_session_id, :from_day_number, :start_day_number, :start_date, :resume_date, :frequency_per_week, :duration_minutes, :teacher_id, :double_session,
      schedule_patterns: %i[day time]
    )
  end

  def enrollment_params
    params.require(:enrollment).permit(
      :enrollment_id, :sessions_to_add,
      :teacher_id, :sales_id, :student_name, :student_code, :course_name,
      :meet_link, :duration_minutes, :start_date, :total_sessions, :frequency_per_week,
      :baseline, :aim, :exam_date, :student_note, :payment_status, :tuition_note,
      :exam_status, :actual_score, :aim_achieved,
      :start_day_number, :direction, :double_session,
      schedule_patterns: %i[day time]
    )
  end

  def update_params
    params.require(:enrollment).permit(
      :course_name, :total_sessions, :payment_status, :tuition_note, :active,
      :student_name, :student_code,
      :baseline, :aim, :exam_date, :student_note,
      :exam_status, :actual_score, :aim_achieved
    )
  end

  def redirect_params
    {
      role: params[:role],
      person_id: params[:person_id] || params[:personId],
      teacher_id: params[:teacher_id] || params[:teacherId],
      month_key: params[:month_key] || params[:monthKey],
      week_name: params[:week_name] || params[:weekName]
    }.compact
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
