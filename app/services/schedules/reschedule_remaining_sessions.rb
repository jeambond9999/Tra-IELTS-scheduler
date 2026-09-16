# frozen_string_literal: true

module Schedules
  class RescheduleRemainingSessions
    class RescheduleError < StandardError
      attr_reader :record, :messages

      def initialize(messages, record: nil)
        @messages = Array(messages)
        @record = record
        super(@messages.join(", "))
      end
    end

    DAY_INDEX = {
      "Thứ 2" => 1,
      "Thứ 3" => 2,
      "Thứ 4" => 3,
      "Thứ 5" => 4,
      "Thứ 6" => 5,
      "Thứ 7" => 6,
      "Chủ Nhật" => 0,
      "Chủ nhật" => 0,
      "CN" => 0,
      "T2" => 1,
      "T3" => 2,
      "T4" => 3,
      "T5" => 4,
      "T6" => 5,
      "T7" => 6,
      "Monday" => 1,
      "Tuesday" => 2,
      "Wednesday" => 3,
      "Thursday" => 4,
      "Friday" => 5,
      "Saturday" => 6,
      "Sunday" => 0
    }.freeze

    def self.call(attributes)
      new(attributes).call
    end

    def initialize(attributes)
      @attributes = attributes.to_h.symbolize_keys
    end

    def call
      validate!

      Enrollment.transaction do
        # 1. Destroy sessions to replace
        sessions_to_replace.each(&:destroy!)

        # 2. Auto remove teacher availability that clashes with new session slots
        remove_consumed_availability_for!(new_sessions)

        # 3. Save new sessions
        new_sessions.each(&:save!)

        # 4. Update enrollment frequency & duration if provided
        enrollment_updates = {}
        if attributes[:frequency_per_week].present? && attributes[:frequency_per_week].to_i.positive?
          enrollment_updates[:frequency_per_week] = attributes[:frequency_per_week].to_i
        end
        enrollment_updates[:teacher] = target_teacher if target_teacher != enrollment.teacher
        enrollment.update!(enrollment_updates) if enrollment_updates.present?

        # 5. Recalculate Day labels continuously
        enrollment.recalculate_day_labels!

        {
          enrollment: enrollment,
          replaced_count: sessions_to_replace.size,
          created_count: new_sessions.size
        }
      end
    rescue RescheduleError
      raise
    rescue ActiveRecord::RecordInvalid => error
      raise RescheduleError.new(error.record.errors.full_messages, record: error.record)
    rescue => error
      raise RescheduleError.new(error.message)
    end

    private

    attr_reader :attributes

    def enrollment
      @enrollment ||= Enrollment.includes(:student, :teacher, lesson_sessions: :teacher).find(attributes.fetch(:enrollment_id))
    end

    def target_teacher
      @target_teacher ||= if attributes[:teacher_id].present?
        Person.teachers.find(attributes[:teacher_id])
      else
        enrollment.teacher
      end
    end

    def all_sessions
      @all_sessions ||= enrollment.lesson_sessions.order(:scheduled_on, :start_time).to_a
    end

    def from_session
      @from_session ||= if attributes[:from_session_id].present?
        all_sessions.find { |s| s.id.to_s == attributes[:from_session_id].to_s }
      end
    end

    def from_day_number
      @from_day_number ||= if attributes[:from_day_number].present? || attributes[:start_day_number].present?
        (attributes[:from_day_number] || attributes[:start_day_number]).to_i
      elsif from_session.present?
        day_num_from_label(from_session) || (all_sessions.index(from_session) + 1)
      end
    end

    def day_num_from_label(session)
      digits = session.day_label.to_s.split("/").first.to_s.scan(/\d+/).map(&:to_i)
      digits.min
    end

    def sessions_to_keep
      @sessions_to_keep ||= if from_day_number.present? && from_day_number > 0
        all_sessions.select do |s|
          min_day = day_num_from_label(s)
          min_day ? min_day < from_day_number : (all_sessions.index(s) < from_day_number - 1)
        end
      elsif from_session.present?
        idx = all_sessions.index(from_session)
        idx ? all_sessions[0...idx] : all_sessions.select { |s| completed_session?(s) }
      else
        all_sessions.select { |s| completed_session?(s) }
      end
    end

    def sessions_to_replace
      @sessions_to_replace ||= all_sessions - sessions_to_keep
    end

    def completed_session?(s)
      s.cs_status == "completed" || s.lesson_status == "completed"
    end

    def kept_curriculum_days
      if from_day_number.present? && from_day_number > 0
        from_day_number - 1
      else
        sessions_to_keep.sum do |s|
          is_double = s.duration_minutes >= 50 || s.day_label.to_s.include?("&") || s.day_label.to_s.include?("-") || s.day_label.to_s.scan(/\d+/).length >= 2
          is_double ? 2 : 1
        end
      end
    end

    def total_target_days
      enrollment.total_sessions.to_i.positive? ? enrollment.total_sessions.to_i : all_sessions.size
    end

    def remaining_days_to_schedule
      [total_target_days - kept_curriculum_days, 0].max
    end

    def start_date
      @start_date ||= begin
        val = attributes[:start_date] || attributes["start_date"]
        val.is_a?(Date) ? val : Date.parse(val.to_s)
      rescue
        Date.current
      end
    end

    def schedule_patterns
      @schedule_patterns ||= begin
        patterns = attributes[:schedule_patterns] || attributes["schedule_patterns"] || []
        patterns = patterns.values if patterns.is_a?(Hash)
        patterns.filter_map do |p|
          next unless p.respond_to?(:[])

          day_val = (p[:day] || p["day"]).to_s.strip
          time_val = (p[:time] || p["time"]).to_s.strip
          next if day_val.blank? || time_val.blank?

          { day: day_val, time: time_val }
        end
      end
    end

    def double_session?
      attributes[:double_session].to_s == "true" || attributes[:double_session] == true || duration_minutes >= 80
    end

    def duration_minutes
      @duration_minutes ||= if attributes[:duration_minutes].present?
        Integer(attributes[:duration_minutes])
      elsif double_session?
        [enrollment.duration_minutes * 2, 80].max
      else
        enrollment.duration_minutes
      end
    end

    def new_sessions
      @new_sessions ||= begin
        dates = []
        cursor = start_date
        current_day = kept_curriculum_days + 1
        step = double_session? ? 2 : 1
        total = total_target_days

        patterns_by_wday = schedule_patterns.group_by { |p| DAY_INDEX[p.fetch(:day).to_s] || 1 }
        patterns_by_wday.transform_values! { |list| list.sort_by { |p| p.fetch(:time) } }

        first_time = schedule_patterns.first&.fetch(:time)

        while current_day <= total && cursor <= start_date + 180.days
          matching = patterns_by_wday[cursor.wday] || []
          if cursor == start_date && first_time.present?
            matching = matching.select { |p| p.fetch(:time) >= first_time }
          end

          matching.each do |pattern|
            break if current_day > total

            day_start = current_day
            day_end = [current_day + step - 1, total].min
            label = day_start == day_end ? "Day #{day_start}/#{total}" : "Day #{day_start} & #{day_end}/#{total}"

            dates << {
              date: cursor,
              time: pattern.fetch(:time),
              day_label: label
            }
            current_day = day_end + 1
          end
          cursor += 1.day
        end

        if current_day <= total
          raise RescheduleError.new("Không thể xếp đủ #{remaining_days_to_schedule} buổi học trong khoảng thời gian tìm kiếm. Vui lòng chọn thêm khung giờ hoặc lùi ngày bắt đầu.")
        end

        dates.map do |entry|
          LessonSession.new(
            enrollment: enrollment,
            teacher: target_teacher,
            scheduled_on: entry.fetch(:date),
            start_time: entry.fetch(:time),
            end_time: Calendar.end_time(entry.fetch(:time), duration_minutes),
            duration_minutes: duration_minutes,
            day_label: entry.fetch(:day_label)
          )
        end
      end
    end

    def remove_consumed_availability_for!(sessions)
      sessions.each do |session|
        TeacherAvailability
          .where(teacher: session.teacher, available_on: session.scheduled_on)
          .where("start_time < ? AND end_time > ?", session.end_time, session.start_time)
          .destroy_all
      end
    end

    def validate!
      raise RescheduleError.new("Không tìm thấy khóa học.") if enrollment.blank?
      raise RescheduleError.new("Ngày bắt đầu không hợp lệ.") if start_date.blank?
      raise RescheduleError.new("Vui lòng chọn ít nhất một khung giờ trong tuần.") if schedule_patterns.empty?
      raise RescheduleError.new("Không còn buổi học nào cần xếp lại.") if remaining_days_to_schedule <= 0
    end
  end
end
