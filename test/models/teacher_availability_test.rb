# frozen_string_literal: true

# == Schema Information
#
# Table name: teacher_availabilities
# Database name: primary
#
#  id               :bigint           not null, primary key
#  available_on     :date             not null
#  duration_minutes :integer          not null
#  end_time         :time             not null
#  start_time       :time             not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  teacher_id       :bigint           not null
#
# Indexes
#
#  index_availability_on_teacher_date_time        (teacher_id,available_on,start_time,end_time)
#  index_teacher_availabilities_on_teacher_id     (teacher_id)
#  teacher_availabilities_teacher_time_exclusion  (teacher_id, tsrange((available_on + start_time), (available_on + end_time), '[)'::text)) USING gist
#
# Foreign Keys
#
#  fk_rails_...  (teacher_id => users.id)
#
require "test_helper"

class TeacherAvailabilityTest < ActiveSupport::TestCase
  test "requires teacher person to have teacher role" do
    availability = TeacherAvailability.new(
      teacher: users(:sales_nhien),
      available_on: "2026-08-18",
      start_time: "07:00",
      end_time: "07:40",
      duration_minutes: 40
    )

    assert_not availability.valid?
    assert_includes availability.errors[:teacher], "must be a teacher"
  end

  test "rejects overlapping availability for the same teacher and date" do
    existing = create_existing_availability!(available_on: Date.new(2026, 8, 18))

    availability = TeacherAvailability.new(
      teacher: users(:ha_teacher),
      available_on: existing.available_on,
      start_time: "07:20",
      end_time: "08:00",
      duration_minutes: 40
    )

    assert_not availability.valid?
    assert availability.errors[:base].any? { |m| m.include?("đã có") }
  end

  test "allows availability over an existing lesson" do
    availability = TeacherAvailability.new(
      teacher: users(:ha_teacher),
      available_on: lesson_sessions(:minh_day_one).scheduled_on,
      start_time: lesson_sessions(:minh_day_one).start_time,
      end_time: lesson_sessions(:minh_day_one).end_time,
      duration_minutes: 40
    )

    assert availability.valid?
    assert availability.save
  end

  test "database rejects overlapping availability when validations are bypassed" do
    postgresql_only!

    existing = create_existing_availability!(available_on: Date.new(2026, 8, 19))

    error = assert_raises(ActiveRecord::StatementInvalid) do
      TeacherAvailability.insert_all!([ availability_attributes(available_on: existing.available_on, start_time: "07:20", end_time: "08:00") ])
    end

    assert_equal "teacher_availabilities_teacher_time_exclusion", constraint_name(error)
  end

  test "database allows availability that overlaps a lesson" do
    postgresql_only!

    assert_nothing_raised do
      TeacherAvailability.insert_all!([
        availability_attributes(
          available_on: lesson_sessions(:minh_day_one).scheduled_on,
          start_time: "08:00",
          end_time: "08:40"
        )
      ])
    end
  end

  private

  def postgresql_only!
    skip "PostgreSQL-only database constraint" unless ActiveRecord::Base.connection.adapter_name == "PostgreSQL"
  end

  def create_existing_availability!(available_on:)
    TeacherAvailability.where(teacher: users(:ha_teacher), available_on: available_on).delete_all
    TeacherAvailability.create!(
      teacher: users(:ha_teacher),
      available_on: available_on,
      start_time: "07:00",
      end_time: "07:40",
      duration_minutes: 40
    )
  end

  def availability_attributes(available_on:, start_time:, end_time:)
    {
      teacher_id: users(:ha_teacher).id,
      available_on: available_on,
      start_time: start_time,
      end_time: end_time,
      duration_minutes: 40,
      created_at: Time.current,
      updated_at: Time.current
    }
  end

  def constraint_name(error)
    error.cause.result.error_field(PG::Result::PG_DIAG_CONSTRAINT_NAME)
  end
end
