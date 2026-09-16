# frozen_string_literal: true

require "test_helper"

class TeacherAvailabilitiesControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in users(:one) }

  test "creates teacher availability with scheduler snake_case params" do
    assert_difference("TeacherAvailability.count", 1) do
      post teacher_availabilities_url, params: {
        teacher_availability: {
          teacher_id: people(:giang_teacher).id,
          available_on: "2026-08-12",
          start_time: "10:00",
          duration_minutes: 40
        },
        role: "teacher",
        person_id: people(:giang_teacher).id,
        teacher_id: people(:giang_teacher).id,
        month_key: "2026-08",
        week_name: "Tuần 2"
      }
    end

    assert_redirected_to root_path(role: "teacher", person_id: people(:giang_teacher).id, teacher_id: people(:giang_teacher).id, month_key: "2026-08", week_name: "Tuần 2")
  end

  test "rejects conflicting availability" do
    assert_no_difference("TeacherAvailability.count") do
      post teacher_availabilities_url, params: {
        teacher_availability: {
          teacher_id: people(:ha_teacher).id,
          available_on: teacher_availabilities(:ha_monday_open).available_on,
          start_time: "07:20",
          duration_minutes: 40
        }
      }
    end

    assert_redirected_to root_path
    assert_match(/đã có lịch|đã có ca rảnh/, flash[:alert])
  end

  test "updates teacher availability with scheduler snake_case params and preserves redirect params" do
    patch teacher_availability_url(teacher_availabilities(:ha_monday_open)), params: {
      teacher_availability: {
        available_on: "2026-08-12",
        start_time: "09:20"
      },
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    }

    assert_redirected_to root_path(role: "teacher", person_id: people(:ha_teacher).id, teacher_id: people(:ha_teacher).id, month_key: "2026-08", week_name: "Tuần 3")

    availability = teacher_availabilities(:ha_monday_open).reload
    assert_equal Date.new(2026, 8, 12), availability.available_on
    assert_equal "09:20", availability.start_time.strftime("%H:%M")
    assert_equal "10:00", availability.end_time.strftime("%H:%M")
  end

  test "destroys teacher availability and preserves scheduler redirect params" do
    availability = TeacherAvailability.create!(
      teacher: people(:giang_teacher),
      available_on: "2026-08-12",
      start_time: "11:00",
      end_time: "11:40",
      duration_minutes: 40
    )

    assert_difference("TeacherAvailability.count", -1) do
      delete teacher_availability_url(availability), params: {
        role: "teacher",
        person_id: people(:giang_teacher).id,
        teacher_id: people(:giang_teacher).id,
        month_key: "2026-08",
        week_name: "Tuần 2"
      }
    end

    assert_redirected_to root_path(role: "teacher", person_id: people(:giang_teacher).id, teacher_id: people(:giang_teacher).id, month_key: "2026-08", week_name: "Tuần 2")
  end

  test "creates teacher availability even when lesson session exists on the same slot" do
    lesson = lesson_sessions(:minh_day_one)

    assert_difference("TeacherAvailability.count", 1) do
      post teacher_availabilities_url, params: {
        teacher_availability: {
          teacher_id: lesson.teacher_id,
          available_on: lesson.scheduled_on,
          start_time: lesson.start_time.strftime("%H:%M"),
          duration_minutes: lesson.duration_minutes
        }
      }
    end

    assert_redirected_to root_path
    assert_equal "Đã mở ca rảnh.", flash[:notice]
  end

  test "batch creates teacher availabilities even when lesson session exists" do
    lesson = lesson_sessions(:minh_day_one)

    assert_difference("TeacherAvailability.count", 1) do
      post batch_create_teacher_availabilities_url, params: {
        teacher_id: lesson.teacher_id,
        duration_minutes: lesson.duration_minutes,
        slots: [
          { available_on: lesson.scheduled_on, start_time: lesson.start_time.strftime("%H:%M") }
        ]
      }
    end

    assert_redirected_to root_path(teacher_id: lesson.teacher_id)
    assert_equal "✅ Đã lưu 1 ca rảnh.", flash[:notice]
  end

  test "allows sales to create teacher availability on behalf of a teacher" do
    sign_in users(:three)

    assert_difference("TeacherAvailability.count", 1) do
      post teacher_availabilities_url, params: {
        teacher_availability: {
          teacher_id: people(:giang_teacher).id,
          available_on: "2026-08-12",
          start_time: "10:00",
          duration_minutes: 40
        }
      }
    end
  end

  test "rejects cs from creating teacher availability" do
    sign_in users(:four)

    assert_no_difference("TeacherAvailability.count") do
      post teacher_availabilities_url, params: {
        teacher_availability: {
          teacher_id: people(:giang_teacher).id,
          available_on: "2026-08-12",
          start_time: "10:00",
          duration_minutes: 40
        }
      }
    end

    assert_redirected_to root_path
    assert_equal "Bạn không có quyền thực hiện thao tác này.", flash[:alert]
  end
end
