# frozen_string_literal: true

require "test_helper"

class LessonSessionsControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in users(:one) }

  test "updates lesson with scheduler snake_case params and preserves redirect params" do
    patch lesson_session_url(lesson_sessions(:minh_day_one)), params: {
      lesson_session: {
        cs_form: "normal",
        cs_status: "completed",
        lesson_notes: "Done"
      },
      role: "cs",
      person_id: users(:cs_mai).id,
      teacher_id: users(:giang_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 2"
    }

    assert_redirected_to root_path(role: "cs", person_id: users(:cs_mai).id, teacher_id: users(:giang_teacher).id, month_key: "2026-08", week_name: "Tuần 2")

    lesson_sessions(:minh_day_one).reload
    assert_equal "normal", lesson_sessions(:minh_day_one).cs_form
    assert_equal "completed", lesson_sessions(:minh_day_one).cs_status
    assert_equal "Done", lesson_sessions(:minh_day_one).lesson_notes
  end

  test "reschedules lesson with scheduler snake_case params and preserves redirect params" do
    patch reschedule_lesson_session_url(lesson_sessions(:minh_day_one)), params: {
      lesson_session: {
        scheduled_on: "2026-08-12",
        start_time: "10:00"
      },
      role: "cs",
      person_id: users(:cs_mai).id,
      teacher_id: users(:giang_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 2"
    }

    assert_redirected_to root_path(role: "cs", person_id: users(:cs_mai).id, teacher_id: users(:giang_teacher).id, month_key: "2026-08", week_name: "Tuần 2")

    lesson = lesson_sessions(:minh_day_one).reload
    assert_equal Date.new(2026, 8, 12), lesson.scheduled_on
    assert_equal "10:00", lesson.start_time.strftime("%H:%M")
    assert_equal "10:40", lesson.end_time.strftime("%H:%M")
  end

  test "rejects reschedule conflict" do
    patch reschedule_lesson_session_url(lesson_sessions(:minh_day_two)), params: {
      lesson_session: {
        scheduled_on: lesson_sessions(:minh_day_one).scheduled_on,
        start_time: lesson_sessions(:minh_day_one).start_time.strftime("%H:%M")
      }
    }

    assert_redirected_to root_path
    assert_match(/đã có lịch/, flash[:alert])
  end

  test "allows teacher to write lesson notes" do
    sign_in users(:ha_teacher)
    lesson = lesson_sessions(:minh_day_one)

    patch lesson_session_url(lesson), params: { lesson_session: { lesson_notes: "Reviewed outline" } }

    assert_equal "Reviewed outline", lesson.reload.lesson_notes
  end

  test "rejects teacher from editing another teacher's lesson" do
    sign_in users(:giang_teacher)
    lesson = lesson_sessions(:minh_day_one)

    assert_no_changes -> { lesson.reload.lesson_notes } do
      patch lesson_session_url(lesson), params: { lesson_session: { lesson_notes: "Not my class" } }
    end

    assert_equal "Bạn chỉ được cập nhật buổi học của chính mình.", flash[:alert]
  end

  test "rejects teacher from rescheduling a lesson" do
    sign_in users(:ha_teacher)
    lesson = lesson_sessions(:minh_day_one)
    original_date = lesson.scheduled_on

    patch reschedule_lesson_session_url(lesson), params: {
      lesson_session: { scheduled_on: "2026-08-12", start_time: "10:00" }
    }

    assert_redirected_to root_path
    assert_equal original_date, lesson.reload.scheduled_on
  end

  test "allows cs to reschedule a lesson" do
    sign_in users(:cs_mai)
    lesson = lesson_sessions(:minh_day_one)

    patch reschedule_lesson_session_url(lesson), params: {
      lesson_session: { scheduled_on: "2026-08-12", start_time: "10:00" }
    }

    assert_equal Date.new(2026, 8, 12), lesson.reload.scheduled_on
  end
end
