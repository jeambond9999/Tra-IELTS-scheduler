# frozen_string_literal: true

class EnrollmentSerializer < BaseSerializer
  object_as :enrollment, model: "Enrollment"

  attributes :id, :course_name, :payment_status, :tuition_note,
             :start_date, :total_sessions, :frequency_per_week, :duration_minutes, :active

  attribute :status do
    enrollment.respond_to?(:status) ? (enrollment.status || "active") : "active"
  end

  attribute :reserved_from do
    rf = enrollment.reserved_from
    rf.respond_to?(:iso8601) ? rf.iso8601 : rf&.to_s
  end

  attribute :resume_date do
    rd = enrollment.resume_date
    rd.respond_to?(:iso8601) ? rd.iso8601 : rd&.to_s
  end

  attribute :reservation_note do
    enrollment.respond_to?(:reservation_note) ? enrollment.reservation_note : nil
  end

  attribute :pre_reservation_schedule do
    enrollment.respond_to?(:pre_reservation_schedule) ? enrollment.pre_reservation_schedule : nil
  end

  attribute :is_reserved do
    enrollment&.reserved? || false
  end

  attribute :reservation_days do
    enrollment&.reservation_days || 0
  end

  attribute :days_until_resume do
    enrollment&.days_until_resume
  end

  attribute :is_reservation_overdue do
    enrollment&.reservation_overdue? || false
  end

  attribute :is_reservation_expiring_soon do
    enrollment&.reservation_expiring_soon? || false
  end

  attribute :existing_sessions_count do
    enrollment.lesson_sessions.size
  end

  attribute :meet_link do
    enrollment.meet_link
  end

  attribute :student do
    StudentSerializer.one(enrollment.student)
  end

  attribute :teacher_id do
    enrollment.teacher_id
  end

  attribute :sales_id do
    enrollment.sales_id
  end

  attribute :sessions do
    enrollment.lesson_sessions.sort_by { |s| [s.scheduled_on.to_s, s.start_time.to_s] }.map do |s|
      sch = s.scheduled_on
      st = s.start_time
      et = s.end_time
      formatted_scheduled_on = sch.respond_to?(:iso8601) ? sch.iso8601 : sch&.to_s
      formatted_start_time = st.respond_to?(:strftime) ? st.strftime("%H:%M") : st.to_s
      formatted_end_time = et.respond_to?(:strftime) ? et.strftime("%H:%M") : et.to_s
      t_name = s.teacher&.name || enrollment.teacher&.name || ""
      {
        id: s.id,
        scheduledOn: formatted_scheduled_on,
        scheduled_on: formatted_scheduled_on,
        startTime: formatted_start_time,
        start_time: formatted_start_time,
        endTime: formatted_end_time,
        end_time: formatted_end_time,
        durationMinutes: s.duration_minutes,
        duration_minutes: s.duration_minutes,
        dayLabel: s.day_label,
        day_label: s.day_label,
        lessonStatus: s.lesson_status,
        lesson_status: s.lesson_status,
        lessonNotes: s.lesson_notes,
        lesson_notes: s.lesson_notes,
        csForm: s.cs_form,
        cs_form: s.cs_form,
        csStatus: s.cs_status,
        cs_status: s.cs_status,
        teacherId: s.teacher_id,
        teacher_id: s.teacher_id,
        teacherName: t_name,
        teacher_name: t_name
      }
    end
  end
end
