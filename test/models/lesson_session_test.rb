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
require "test_helper"

class LessonSessionTest < ActiveSupport::TestCase
  test "requires end time after start time" do
    session = lesson_sessions(:minh_day_one)
    session.end_time = session.start_time

    assert_not session.valid?
    assert_includes session.errors[:end_time], "must be after start time"
  end

  test "rejects overlapping sessions for the same teacher and date" do
    session = LessonSession.new(
      enrollment: enrollments(:writing_minh),
      teacher: users(:ha_teacher),
      scheduled_on: lesson_sessions(:minh_day_one).scheduled_on,
      start_time: "08:20",
      end_time: "09:00",
      duration_minutes: 40,
      day_label: "Day 2/10"
    )

    assert_not session.valid?
    assert session.errors[:base].any? { |m| m.include?("đã có lịch") }
  end

  test "allows same time for a different teacher" do
    session = LessonSession.new(
      enrollment: enrollments(:speaking_lan),
      teacher: users(:giang_teacher),
      scheduled_on: lesson_sessions(:minh_day_one).scheduled_on,
      start_time: lesson_sessions(:minh_day_one).start_time,
      end_time: lesson_sessions(:minh_day_one).end_time,
      duration_minutes: 40,
      day_label: "Day 1/8"
    )

    assert session.valid?
  end

  test "database rejects overlapping sessions when validations are bypassed" do
    postgresql_only!

    error = assert_raises(ActiveRecord::StatementInvalid) do
      LessonSession.insert_all!([ lesson_attributes(start_time: "08:20", end_time: "09:00") ])
    end

    assert_equal "lesson_sessions_teacher_time_exclusion", constraint_name(error)
  end

  test "database allows a lesson that overlaps teacher availability" do
    postgresql_only!

    availability = create_availability_for_conflict!(available_on: Date.new(2026, 8, 15))

    assert_nothing_raised do
      LessonSession.insert_all!([
        lesson_attributes(
          scheduled_on: availability.available_on,
          start_time: "07:20",
          end_time: "08:00"
        )
      ])
    end
  end

  test "translates a database overlap violation to the existing validation message" do
    postgresql_only!

    session = LessonSession.new(
      enrollment: enrollments(:writing_minh),
      teacher: users(:ha_teacher),
      scheduled_on: lesson_sessions(:minh_day_one).scheduled_on,
      start_time: "08:20",
      end_time: "09:00",
      duration_minutes: 40,
      day_label: "Database translation"
    )

    assert_not session.save(validate: false)
    assert_includes session.errors[:base], "Khung giờ này đã có lịch."
  end

  test "translates a cross-table database conflict to the existing validation message" do
    postgresql_only!

    availability = create_availability_for_conflict!(available_on: Date.new(2026, 8, 16))

    session = LessonSession.new(
      enrollment: enrollments(:writing_minh),
      teacher: users(:ha_teacher),
      scheduled_on: availability.available_on,
      start_time: "07:20",
      end_time: "08:00",
      duration_minutes: 40,
      day_label: "Cross-table translation"
    )

    assert_not session.save(validate: false)
    assert_includes session.errors[:base], "Khung giờ này đã có lịch."
  end

  private

  def postgresql_only!
    skip "PostgreSQL-only database constraint" unless ActiveRecord::Base.connection.adapter_name == "PostgreSQL"
  end

  def create_availability_for_conflict!(available_on:)
    TeacherAvailability.where(teacher: users(:ha_teacher), available_on: available_on).delete_all
    TeacherAvailability.create!(
      teacher: users(:ha_teacher),
      available_on: available_on,
      start_time: "07:00",
      end_time: "07:40",
      duration_minutes: 40
    )
  end

  def lesson_attributes(scheduled_on: lesson_sessions(:minh_day_one).scheduled_on, start_time:, end_time:)
    {
      enrollment_id: enrollments(:writing_minh).id,
      teacher_id: users(:ha_teacher).id,
      scheduled_on: scheduled_on,
      start_time: start_time,
      end_time: end_time,
      duration_minutes: 40,
      day_label: "Database test",
      lesson_status: "",
      cs_form: "",
      cs_status: "",
      created_at: Time.current,
      updated_at: Time.current
    }
  end

  def constraint_name(error)
    error.cause.result.error_field(PG::Result::PG_DIAG_CONSTRAINT_NAME)
  end
end
