# frozen_string_literal: true

# == Schema Information
#
# Table name: lesson_sessions
# Database name: primary
#
#  id                  :bigint           not null, primary key
#  cs_form             :string           default(""), not null
#  cs_status           :string           default(""), not null
#  day_label           :string           not null
#  duration_minutes    :integer          not null
#  end_time            :time             not null
#  lesson_notes        :text
#  lesson_status       :string           default(""), not null
#  scheduled_on        :date             not null
#  start_time          :time             not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  enrollment_id       :bigint           not null
#  rescheduled_from_id :bigint
#  teacher_id          :bigint           not null
#
# Indexes
#
#  index_lesson_sessions_on_enrollment_id        (enrollment_id)
#  index_lesson_sessions_on_rescheduled_from_id  (rescheduled_from_id)
#  index_lesson_sessions_on_teacher_id           (teacher_id)
#  index_lessons_on_teacher_date_time            (teacher_id,scheduled_on,start_time,end_time)
#  lesson_sessions_teacher_time_exclusion        (teacher_id, tsrange((scheduled_on + start_time), (scheduled_on + end_time), '[)'::text)) USING gist
#
# Foreign Keys
#
#  fk_rails_...  (enrollment_id => enrollments.id)
#  fk_rails_...  (rescheduled_from_id => lesson_sessions.id)
#  fk_rails_...  (teacher_id => users.id)
#
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
