# frozen_string_literal: true

class TeacherAvailabilitiesController < InertiaController
  before_action :authenticate_user!
  before_action -> { authorize_roles!(:teacher, :sales) }

  def create
    availability = TeacherAvailability.new(availability_params)
    availability.end_time = Schedules::Calendar.end_time(availability_params.fetch(:start_time), availability.duration_minutes)

    if availability.save
      redirect_to_scheduler(notice: "Đã mở ca rảnh.")
    else
      redirect_to_scheduler(alert: availability.errors.full_messages.first)
    end
  end

  def update
    availability = TeacherAvailability.find(params[:id])
    availability.assign_attributes(update_params)
    availability.end_time = Schedules::Calendar.end_time(
      update_params.fetch(:start_time, availability.start_time),
      availability.duration_minutes
    )

    if availability.save
      redirect_to_scheduler(notice: "✨ Đã di chuyển ca rảnh thành công!")
    else
      redirect_to_scheduler(alert: availability.errors.full_messages.first)
    end
  end

  def batch_create
    teacher_id       = params.require(:teacher_id).to_i
    duration_minutes = params.require(:duration_minutes).to_i
    slots            = params.require(:slots)

    created_count = 0
    skipped_count = 0

    slots.each do |slot|
      availability = TeacherAvailability.new(
        teacher_id:       teacher_id,
        available_on:     slot[:available_on],
        start_time:       slot[:start_time],
        duration_minutes: duration_minutes
      )
      availability.end_time = Schedules::Calendar.end_time(slot[:start_time], duration_minutes)

      if availability.save
        created_count += 1
      else
        skipped_count += 1
      end
    end

    notice = "✅ Đã lưu #{created_count} ca rảnh."
    notice += " Bỏ qua #{skipped_count} slot bị trùng." if skipped_count > 0

    redirect_to_scheduler(notice: notice)
  end

  def sync_week
    teacher_id       = params.require(:teacher_id).to_i
    source_week_name = params.require(:source_week_name)
    month_key        = params.require(:month_key)
    duration         = params[:duration_minutes].to_i.positive? ? params[:duration_minutes].to_i : 40

    saved_pending_count = 0
    created_count = 0
    skipped_count = 0

    ActiveRecord::Base.transaction do
      # 1. First, save any pending slots in the source week so they are NEVER lost!
      if params[:pending_slots].present?
        pending_list = params[:pending_slots]
        pending_list = pending_list.values if pending_list.respond_to?(:values)
        pending_list.each do |slot|
          av_date = slot[:available_on] || slot["available_on"]
          st_time = slot[:start_time] || slot["start_time"]
          next if av_date.blank? || st_time.blank?

          av = TeacherAvailability.new(
            teacher_id:       teacher_id,
            available_on:     av_date,
            start_time:       st_time,
            duration_minutes: duration
          )
          av.end_time = Schedules::Calendar.end_time(st_time, duration)
          if av.save
            saved_pending_count += 1
          end
        end
      end

      # 2. Get all source week dates reliably
      source_week_days = Schedules::Calendar.week_days(month_key: month_key, week_name: source_week_name)
      source_dates     = source_week_days.map { |d| Date.iso8601(d[:iso_date]) }

      # Query all availabilities for this teacher in the source week
      source_availabilities = TeacherAvailability
        .where(teacher_id: teacher_id, available_on: source_dates)
        .order(:available_on, :start_time)
        .to_a

      if source_availabilities.empty?
        return redirect_to_scheduler(alert: "Không có ca rảnh nào trong #{source_week_name} để đồng bộ.")
      end

      # 3. Determine target weeks / dates
      until_date = params[:until_date].present? ? (Date.parse(params[:until_date].to_s) rescue nil) : nil

      target_week_configs = if params[:target_weeks].present?
        raw_tw = params[:target_weeks]
        raw_tw = raw_tw.values if raw_tw.respond_to?(:values)
        raw_tw.map do |tw|
          if tw.is_a?(ActionController::Parameters) || tw.is_a?(Hash)
            {
              week_name: tw[:week_name] || tw["week_name"],
              month_key: tw[:month_key] || tw["month_key"] || month_key
            }
          else
            { week_name: tw.to_s, month_key: month_key }
          end
        end
      else
        # Default fallback: all subsequent weeks in the current month
        all_weeks    = Schedules::Calendar::WEEKS
        source_index = all_weeks.index(source_week_name) || 0
        all_weeks[(source_index + 1)..].map { |w| { week_name: w, month_key: month_key } }
      end

      target_week_configs.each do |config|
        t_week_name = config[:week_name]
        t_month_key = config[:month_key]
        next if t_week_name == source_week_name && t_month_key == month_key

        week_days = Schedules::Calendar.week_days(month_key: t_month_key, week_name: t_week_name)

        source_availabilities.each do |source|
          source_date = Date.parse(source.available_on.to_s)
          source_day_index = source_date.cwday - 1 # 0=Mon ... 6=Sun
          target_day = week_days[source_day_index]
          next unless target_day

          target_date = Date.iso8601(target_day[:iso_date])
          next if until_date.present? && target_date > until_date
          next if target_date == source_date

          slot_duration = source.duration_minutes.to_i.positive? ? source.duration_minutes : duration
          availability = TeacherAvailability.new(
            teacher_id:       teacher_id,
            available_on:     target_date,
            start_time:       source.start_time,
            end_time:         source.end_time,
            duration_minutes: slot_duration
          )

          if availability.save
            created_count += 1
          else
            skipped_count += 1
          end
        end
      end
    end

    notice = "✅ Đã sync thành công #{created_count} ca rảnh."
    notice += " (Đã lưu #{saved_pending_count} ca mới chọn)" if saved_pending_count > 0
    notice += " Bỏ qua #{skipped_count} slot bị trùng." if skipped_count > 0

    redirect_to_scheduler(notice: notice)
  rescue => e
    redirect_to_scheduler(alert: "Lỗi khi đồng bộ lịch: #{e.message}")
  end

  def destroy
    TeacherAvailability.find(params[:id]).destroy
    redirect_to_scheduler(notice: "Đã xóa ca rảnh.")
  end

  def batch_destroy
    ids = params.require(:ids)
    rel = TeacherAvailability.where(id: ids)
    if params[:teacher_id].present? && params[:teacher_id].to_s != "all"
      rel = rel.where(teacher_id: params[:teacher_id].to_i)
    end

    destroyed = rel.destroy_all
    notice = "✅ Đã xóa thành công #{destroyed.size} ca rảnh."

    redirect_to_scheduler(notice: notice)
  end

  private

  def availability_params
    params.require(:teacher_availability).permit(:teacher_id, :available_on, :start_time, :duration_minutes)
  end

  def update_params
    params.require(:teacher_availability).permit(:available_on, :start_time)
  end

  def redirect_params
    params.permit(:role, :person_id, :teacher_id, :month_key, :week_name)
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
