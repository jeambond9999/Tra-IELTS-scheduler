# frozen_string_literal: true

module Schedules
  class ReserveEnrollment
    class ReservationError < StandardError
      attr_reader :messages, :record

      def initialize(messages, record: nil)
        @messages = Array(messages)
        @record = record
        super(@messages.join(", "))
      end
    end

    def self.call(attributes)
      new(attributes).call
    end

    def initialize(attributes)
      @attributes = attributes.to_h.symbolize_keys
    end

    def call
      case action
      when "reserve"
        process_reserve!
      when "cancel_reservation"
        process_cancel_reservation!
      when "resume"
        process_resume!
      else
        raise ReservationError.new("Hành động không hợp lệ: #{action}")
      end
    end

    private

    attr_reader :attributes

    def action
      @action ||= (attributes[:action] || "reserve").to_s
    end

    def enrollment
      @enrollment ||= Enrollment.includes(:student, :teacher, lesson_sessions: :teacher).find(attributes.fetch(:enrollment_id))
    end

    def reserved_from
      @reserved_from ||= begin
        val = attributes[:reserved_from]
        val.is_a?(Date) ? val : Date.parse(val.to_s)
      rescue
        Date.current
      end
    end

    def resume_date
      @resume_date ||= begin
        val = attributes[:resume_date]
        val.present? ? (val.is_a?(Date) ? val : Date.parse(val.to_s)) : nil
      rescue
        nil
      end
    end

    def reservation_note
      attributes[:reservation_note].to_s.strip
    end

    def process_reserve!
      Enrollment.transaction do
        # 1. Calculate kept completed sessions and curriculum days
        completed_sessions = enrollment.lesson_sessions.where("cs_status = 'completed' OR lesson_status = 'completed'").order(:scheduled_on, :start_time).to_a
        completed_days = completed_sessions.sum do |s|
          is_double = s.duration_minutes >= 50 || s.day_label.to_s.include?("&") || s.day_label.to_s.include?("-") || s.day_label.to_s.scan(/\d+/).length >= 2
          is_double ? 2 : 1
        end

        # 2. Build pre-reservation schedule summary
        pre_summary = [
          "Lịch trước bảo lưu: #{enrollment.frequency_per_week} buổi/tuần",
          "GV: #{enrollment.teacher&.name}",
          "Đã học xong Day #{completed_days}/#{enrollment.total_sessions} buổi"
        ].join(" • ")

        # 3. Destroy uncompleted upcoming sessions on or after reserved_from
        sessions_to_remove = enrollment.lesson_sessions
          .where("scheduled_on >= ?", reserved_from)
          .where.not(cs_status: "completed")
          .where.not(lesson_status: "completed")

        removed_count = sessions_to_remove.count
        sessions_to_remove.destroy_all

        enrollment_updates = {
          reserved_from: reserved_from,
          resume_date: resume_date,
          reservation_note: reservation_note,
          pre_reservation_schedule: pre_summary
        }
        enrollment_updates[:status] = "reserved" if enrollment.has_attribute?(:status)
        enrollment.update!(enrollment_updates)

        {
          enrollment: enrollment,
          action: "reserve",
          removed_count: removed_count,
          completed_days: completed_days
        }
      end
    rescue ReservationError
      raise
    rescue ActiveRecord::RecordInvalid => error
      raise ReservationError.new(error.record.errors.full_messages, record: error.record)
    rescue => error
      raise ReservationError.new(error.message)
    end

    def process_cancel_reservation!
      cancel_updates = {
        reserved_from: nil,
        resume_date: nil
      }
      cancel_updates[:status] = "active" if enrollment.has_attribute?(:status)
      enrollment.update!(cancel_updates)
      { enrollment: enrollment, action: "cancel_reservation" }
    rescue => error
      raise ReservationError.new(error.message)
    end

    def process_resume!
      # Call RescheduleRemainingSessions with resume_date as start_date
      reschedule_attrs = attributes.except(:action, :reserved_from, :reservation_note).merge(
        enrollment_id: enrollment.id,
        start_date: resume_date || attributes[:start_date] || Date.current
      )

      reschedule_result = Schedules::RescheduleRemainingSessions.call(reschedule_attrs)

      # Mark enrollment as active again
      resume_note_entry = "Đã đi học lại từ ngày #{(resume_date || Date.current).strftime('%d/%m/%Y')}"
      updated_notes = [enrollment.reservation_note, resume_note_entry].compact_blank.join(" | ")

      resume_updates = {
        reserved_from: nil,
        resume_date: nil,
        reservation_note: updated_notes
      }
      resume_updates[:status] = "active" if enrollment.has_attribute?(:status)
      enrollment.update!(resume_updates)

      {
        enrollment: enrollment,
        action: "resume",
        created_count: reschedule_result[:created_count]
      }
    rescue Schedules::RescheduleRemainingSessions::RescheduleError => error
      raise ReservationError.new(error.messages)
    rescue ActiveRecord::RecordInvalid => error
      raise ReservationError.new(error.record.errors.full_messages, record: error.record)
    rescue => error
      raise ReservationError.new(error.message)
    end
  end
end
