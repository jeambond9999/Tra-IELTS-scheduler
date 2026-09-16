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
class LessonSession < ApplicationRecord
  include ScheduleTimeRange

  belongs_to :enrollment
  belongs_to :teacher, class_name: "User"
  belongs_to :rescheduled_from, class_name: "LessonSession", optional: true

  validates :scheduled_on, :start_time, :end_time, :day_label, presence: true
  validates :duration_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 10, less_than_or_equal_to: 240 }
  validate :teacher_role
  validate :no_lesson_overlap

  after_commit :recalculate_enrollment_days!, on: %i[create update destroy]

  # Returns the number of "ca" (teaching slots) for this session.
  # Double sessions (2 day labels, duration >= 50 min) count as 2 ca.
  # Writing courses with "học 2 day" have day_label like "Day 1 & 2/20" → caught by "&" check.
  def session_ca
    day_part = day_label.to_s.split("/").first.to_s
    is_double = duration_minutes >= 50 ||
                day_part.include?("&") ||
                day_part.include?("-") ||
                day_part.scan(/\d+/).length >= 2

    if is_double
      2
    elsif duration_minutes > 0
      val = (duration_minutes / 40.0).round(1)
      (val % 1).zero? ? val.to_i : val
    else
      1
    end
  end

  def update_subsequent_day_labels!(start_day_number)
    sessions = enrollment.lesson_sessions.order(scheduled_on: :asc, start_time: :asc).to_a
    current_idx = sessions.index { |s| s.id == id }
    return unless current_idx

    day = start_day_number
    sessions[current_idx..].each do |s|
      is_session_double = s.duration_minutes >= 50 || s.day_label.to_s.include?("&") || s.day_label.to_s.include?("-")
      step = is_session_double ? 2 : 1

      end_day = [ day + step - 1, enrollment.total_sessions ].min
      label = if day == end_day
        "Day #{day}/#{enrollment.total_sessions}"
      else
        "Day #{day} & #{end_day}/#{enrollment.total_sessions}"
      end
      s.update_column(:day_label, label)
      day = end_day + 1
    end
  end

  private

  def recalculate_enrollment_days!
    if destroyed? || previously_new_record? || saved_change_to_scheduled_on? || saved_change_to_start_time?
      enrollment.recalculate_day_labels!
    end
  end

  def teacher_role
    return if teacher&.teacher?

    errors.add(:teacher, "must be a teacher")
  end

  def no_lesson_overlap
    return if teacher_id.blank? || scheduled_on.blank? || start_time.blank? || end_time.blank?

    conflicting = LessonSession
      .where(teacher_id: teacher_id, scheduled_on: scheduled_on)
      .where.not(id: id)
      .where("start_time < ? AND end_time > ?", end_time, start_time)
      .includes(enrollment: :student)
      .first

    return unless conflicting

    student_desc = conflicting.enrollment&.student ? " (Lớp #{conflicting.enrollment.student.name} - #{conflicting.day_label})" : ""
    t_start = start_time.respond_to?(:strftime) ? start_time.strftime("%H:%M") : start_time.to_s
    t_end = end_time.respond_to?(:strftime) ? end_time.strftime("%H:%M") : end_time.to_s
    errors.add(:base, "Khung giờ #{t_start}-#{t_end} ngày #{scheduled_on.strftime('%d/%m/%Y')} đã có lịch#{student_desc}.")
  end
end
