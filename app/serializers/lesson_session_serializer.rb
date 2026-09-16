# frozen_string_literal: true

class LessonSessionSerializer < BaseSerializer
  object_as :lesson_session, model: "LessonSession"

  attributes :id, :scheduled_on, :duration_minutes,
             :day_label, :lesson_status, :lesson_notes, :cs_form, :cs_status

  attribute :start_time do
    lesson_session.start_time.respond_to?(:strftime) ? lesson_session.start_time.strftime("%H:%M") : lesson_session.start_time.to_s
  end

  attribute :end_time do
    lesson_session.end_time.respond_to?(:strftime) ? lesson_session.end_time.strftime("%H:%M") : lesson_session.end_time.to_s
  end

  attribute :teacher_id do
    lesson_session.teacher_id
  end

  attribute :teacher_name do
    lesson_session.teacher&.name || ""
  end

  attribute :enrollment do
    EnrollmentSerializer.one(lesson_session.enrollment)
  end
end
