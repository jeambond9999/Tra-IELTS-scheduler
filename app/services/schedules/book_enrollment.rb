# frozen_string_literal: true

module Schedules
  class BookEnrollment
    class BookingError < StandardError
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
      "Chủ Nhật" => 0
    }.freeze
    def self.call(attributes)
      new(attributes).call
    end

    def initialize(attributes)
      @attributes = attributes
    end

    def call
      if existing_enrollment?
        add_to_existing_enrollment!
      else
        create_new_enrollment!
      end
    end

    private

    attr_reader :attributes

    def existing_enrollment?
      attributes[:enrollment_id].present? || attributes["enrollment_id"].present?
    end

    def existing_enrollment
      @existing_enrollment ||= Enrollment.find(attributes[:enrollment_id] || attributes["enrollment_id"])
    end

    def add_to_existing_enrollment!
      validate_existing_booking_attributes!

      Enrollment.transaction do
        existing_days = existing_enrollment.total_sessions.to_i.positive? ? existing_enrollment.total_sessions.to_i : existing_enrollment.lesson_sessions.count
        sessions_to_add = Integer(attributes[:sessions_to_add] || attributes["sessions_to_add"] || attributes.fetch(:total_sessions))
        new_total = existing_days + sessions_to_add

        dur = if attributes[:duration_minutes].present?
          Integer(attributes[:duration_minutes])
        elsif double_session?
          [existing_enrollment.duration_minutes * 2, 80].max
        else
          existing_enrollment.duration_minutes
        end

        existing_enrollment.update!(
          total_sessions: new_total,
          duration_minutes: dur,
          payment_status: attributes[:payment_status].presence || existing_enrollment.payment_status,
          tuition_note: attributes[:tuition_note].presence || existing_enrollment.tuition_note
        )

        if attributes[:student_note].present? || attributes[:aim].present? || attributes[:baseline].present? || attributes[:exam_date].present?
          existing_enrollment.student.update!(
            student_note: attributes[:student_note].presence || existing_enrollment.student.student_note,
            aim: attributes[:aim].presence || existing_enrollment.student.aim,
            baseline: attributes[:baseline].presence || existing_enrollment.student.baseline,
            exam_date: attributes[:exam_date].presence || existing_enrollment.student.exam_date
          )
        end

        new_sessions = generate_additional_sessions(
          start_day: existing_days + 1,
          count: sessions_to_add,
          total: new_total,
          duration_minutes: dur
        )
        remove_consumed_availability_for!(new_sessions)
        new_sessions.each(&:save!)

        existing_enrollment.recalculate_day_labels!
        existing_enrollment
      rescue ActiveRecord::RecordInvalid => error
        raise BookingError.new(error.record.errors.full_messages, record: error.record)
      end
    end

    def double_session?
      attributes[:double_session].to_s == "true" || attributes["double_session"].to_s == "true" || attributes[:double_session] == true || duration_minutes >= 80
    end

    def generate_additional_sessions(start_day:, count:, total:, duration_minutes: nil)
      dates = []
      cursor = start_date
      current_day = start_day
      step = double_session? ? 2 : 1

      patterns_by_wday = schedule_patterns.group_by { |p| DAY_INDEX.fetch(p.fetch(:day)) }
      patterns_by_wday.transform_values! { |list| list.sort_by { |p| p.fetch(:time) } }

      while current_day <= total && cursor <= start_date + 180.days
        matching = patterns_by_wday[cursor.wday] || []
        if cursor == start_date
          first_time = schedule_patterns.first.fetch(:time)
          matching = matching.select { |p| p.fetch(:time) >= first_time }
        end

        matching.each do |pattern|
          break if current_day > total

          day_start = current_day
          day_end = [current_day + step - 1, total].min
          label = day_start == day_end ? "Day #{day_start}/#{total}" : "Day #{day_start} & #{day_end}/#{total}"

          dates << { date: cursor, time: pattern.fetch(:time), day_number: day_start, day_label: label }
          current_day = day_end + 1
        end
        cursor += 1.day
      end

      if current_day <= total
        raise BookingError.new("Không thể xếp đủ #{count} buổi học trong khoảng thời gian tìm kiếm.")
      end

      dur = duration_minutes || (double_session? ? [existing_enrollment.duration_minutes * 2, 80].max : existing_enrollment.duration_minutes)

      dates.map do |entry|
        LessonSession.new(
          enrollment: existing_enrollment,
          teacher: existing_enrollment.teacher,
          scheduled_on: entry.fetch(:date),
          start_time: entry.fetch(:time),
          end_time: Calendar.end_time(entry.fetch(:time), dur),
          duration_minutes: dur,
          day_label: entry.fetch(:day_label)
        )
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

    def validate_existing_booking_attributes!
      raise BookingError.new("Thông tin đặt lịch không hợp lệ.") unless attributes.respond_to?(:fetch)

      start_date
      frequency_per_week
      schedule_patterns
      existing_enrollment
    end

    def create_new_enrollment!
      validate_booking_attributes!
      validate_people!
      validate_student_identity!

      Enrollment.transaction do
        student.save!
        enrollment.save!
        remove_consumed_availability!
        generated_sessions.each(&:save!)
        enrollment
      rescue ActiveRecord::RecordInvalid => error
        raise BookingError.new(error.record.errors.full_messages, record: error.record)
      end
    end

    def teacher
      @teacher ||= Person.teachers.find(attributes.fetch(:teacher_id))
    end

    def sales
      @sales ||= Person.sales_people.find(attributes.fetch(:sales_id))
    end

    def student
      @student ||= begin
        found = Student.find_or_initialize_by(code: attributes.fetch(:student_code))
        found.assign_attributes(
          name: attributes.fetch(:student_name),
          baseline: attributes[:baseline],
          aim: attributes[:aim],
          exam_date: attributes[:exam_date],
          student_note: attributes[:student_note]
        )
        found
      end
    end

    def enrollment
      @enrollment ||= Enrollment.new(
        student: student,
        teacher: teacher,
        sales: sales,
        course_name: attributes.fetch(:course_name),
        payment_status: attributes.fetch(:payment_status),
        tuition_note: attributes[:tuition_note],
        meet_link: meet_link,
        start_date: start_date,
        total_sessions: total_sessions,
        frequency_per_week: frequency_per_week,
        duration_minutes: duration_minutes,
        active: true
      )
    end

    def generated_sessions
      @generated_sessions ||= session_dates.map do |entry|
        LessonSession.new(
          enrollment: enrollment,
          teacher: teacher,
          scheduled_on: entry.fetch(:date),
          start_time: entry.fetch(:time),
          end_time: Calendar.end_time(entry.fetch(:time), duration_minutes),
          duration_minutes: duration_minutes,
          day_label: entry.fetch(:day_label)
        )
      end
    end

    def session_dates
      dates = []
      step = double_session? ? 2 : 1

      patterns_by_wday = schedule_patterns.group_by { |p| DAY_INDEX.fetch(p.fetch(:day)) }
      patterns_by_wday.transform_values! { |list| list.sort_by { |p| p.fetch(:time) } }

      if %w[backward both].include?(direction)
        cursor = start_date
        current_day = start_day_number - step

        while current_day >= 1 && cursor >= start_date - 180.days
          matching = (patterns_by_wday[cursor.wday] || []).reverse
          if cursor == start_date
            first_time = schedule_patterns.first.fetch(:time)
            matching = matching.select { |p| p.fetch(:time) < first_time }
          end

          matching.each do |pattern|
            break if current_day < 1

            day_start = current_day
            day_end = [current_day + step - 1, total_sessions].min
            label = day_start == day_end ? "Day #{day_start}/#{total_sessions}" : "Day #{day_start} & #{day_end}/#{total_sessions}"

            dates << { date: cursor, time: pattern.fetch(:time), day_number: day_start, day_label: label }
            current_day -= step
          end
          cursor -= 1.day
        end
        raise BookingError.new("Không thể xếp đủ số buổi lùi về Day 1 trong khoảng tìm kiếm.") if current_day >= 1
      end

      if %w[forward both].include?(direction)
        cursor = start_date
        current_day = start_day_number

        while current_day <= total_sessions && cursor <= start_date + 180.days
          matching = patterns_by_wday[cursor.wday] || []
          if cursor == start_date && current_day == start_day_number && matching.empty?
            matching = [schedule_patterns.first]
          elsif cursor == start_date
            first_time = schedule_patterns.first.fetch(:time)
            matching = matching.select { |p| p.fetch(:time) >= first_time }
          end

          matching.each do |pattern|
            break if current_day > total_sessions

            day_start = current_day
            day_end = [current_day + step - 1, total_sessions].min
            label = day_start == day_end ? "Day #{day_start}/#{total_sessions}" : "Day #{day_start} & #{day_end}/#{total_sessions}"

            dates << { date: cursor, time: pattern.fetch(:time), day_number: day_start, day_label: label }
            current_day = day_end + 1
          end
          cursor += 1.day
        end
        raise BookingError.new("Không thể xếp đủ số buổi tiến tới Day #{total_sessions} trong khoảng tìm kiếm.") if current_day <= total_sessions
      end

      dates.sort_by! { |entry| [entry.fetch(:date), entry.fetch(:time)] }
      dates
    end

    def sessions_to_generate
      direction == "both" ? total_sessions : (direction == "backward" ? start_day_number : total_sessions - start_day_number + 1)
    end

    def remove_consumed_availability!
      generated_sessions.each do |session|
        TeacherAvailability
          .where(teacher: teacher, available_on: session.scheduled_on)
          .where("start_time < ? AND end_time > ?", session.end_time, session.start_time)
          .destroy_all
      end
    end

    def validate_booking_attributes!
      raise BookingError.new("Thông tin đặt lịch không hợp lệ.") unless attributes.respond_to?(:fetch)

      start_date
      total_sessions
      frequency_per_week
      duration_minutes
      schedule_patterns
    end

    def validate_people!
      teacher
      sales
    rescue ActiveRecord::RecordNotFound
      raise BookingError.new("Không tìm thấy giáo viên đã chọn.")
    end

    def validate_student_identity!
      existing_student = Student.find_by(code: attributes.fetch(:student_code))
      return unless existing_student
      return if existing_student.name == attributes.fetch(:student_name)

      raise BookingError.new("Mã học viên đã tồn tại với thông tin khác.", record: existing_student)
    end

    def schedule_patterns
      @schedule_patterns ||= begin
        patterns = attributes[:schedule_patterns] || attributes["schedule_patterns"]
        raise BookingError.new("Cần chọn đúng số khung lịch mỗi tuần.") unless patterns.is_a?(Array) && patterns.length == frequency_per_week

        normalized_patterns = patterns.map do |pattern|
          raise BookingError.new("Khung lịch không hợp lệ.") unless pattern.is_a?(Hash)

          day = pattern[:day] || pattern["day"]
          time = pattern[:time] || pattern["time"]

          unless DAY_INDEX.key?(day) && Calendar::TIME_INTERVALS.include?(time)
            raise BookingError.new("Khung lịch không hợp lệ.")
          end

          { day: day, time: time }
        end

        if normalized_patterns.map { |p| [p.fetch(:day), p.fetch(:time)] }.uniq.length != frequency_per_week
          raise BookingError.new("Các khung lịch mỗi tuần không được trùng cả thứ và giờ.")
        end

        normalized_patterns
      end
    end

    def start_date
      @start_date ||= Date.parse(attributes.fetch(:start_date).to_s)
    rescue ArgumentError, TypeError, KeyError
      raise BookingError.new("Ngày bắt đầu không hợp lệ.")
    end

    def total_sessions
      @total_sessions ||= begin
        value = Integer(attributes.fetch(:total_sessions))
        raise BookingError.new("Tổng số buổi không hợp lệ.") unless value.positive?

        value
      end
    rescue ArgumentError, TypeError, KeyError
      raise BookingError.new("Tổng số buổi không hợp lệ.")
    end

    def frequency_per_week
      @frequency_per_week ||= begin
        value = Integer(attributes.fetch(:frequency_per_week))
        raise BookingError.new("Tần suất học không hợp lệ.") unless [ 1, 2 ].include?(value)

        value
      end
    rescue ArgumentError, TypeError, KeyError
      raise BookingError.new("Tần suất học không hợp lệ.")
    end

    def duration_minutes
      @duration_minutes ||= begin
        value = Integer(attributes.fetch(:duration_minutes))
        raise BookingError.new("Thời lượng buổi học không hợp lệ.") unless value.positive? && value <= 240

        value
      end
    rescue ArgumentError, TypeError, KeyError
      raise BookingError.new("Thời lượng buổi học không hợp lệ.")
    end

    def start_day_number
      @start_day_number ||= begin
        value = Integer(attributes.fetch(:start_day_number, 1))
        raise BookingError.new("Số thứ tự buổi học không hợp lệ.") unless value >= 1 && value <= total_sessions

        value
      end
    rescue ArgumentError, TypeError
      raise BookingError.new("Số thứ tự buổi học không hợp lệ.")
    end

    def direction
      @direction ||= begin
        dir = attributes.fetch(:direction, "forward").to_s
        %w[forward backward both].include?(dir) ? dir : "forward"
      end
    end

    def meet_link
      attributes[:meet_link].presence || attributes["meet_link"].presence || Enrollment::GOOGLE_MEET_LAUNCH_URL
    end
  end
end
