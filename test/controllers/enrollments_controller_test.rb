# frozen_string_literal: true

require "test_helper"

class EnrollmentsControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in users(:one) }

  test "sales booking accepts scheduler snake_case params without a meet link and preserves redirect params" do
    assert_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ], 1) do
      post enrollments_url, params: {
        enrollment: {
          teacher_id: users(:giang_teacher).id,
          sales_id: users(:sales_nhien).id,
          student_name: "Lê Quốc Bảo",
          student_code: "HV200",
          course_name: "IELTS Writing Intensive",
          duration_minutes: 40,
          start_date: "2026-08-12",
          total_sessions: 1,
          frequency_per_week: 1,
          baseline: "5.0",
          aim: "7.0",
          exam_date: "2026-12-30",
          student_note: "Needs grammar",
          payment_status: "Đã đóng Full",
          tuition_note: "",
          schedule_patterns: [
            { day: "Thứ 4", time: "10:00" }
          ]
        },
        role: "sales",
        person_id: users(:sales_nhien).id,
        teacher_id: users(:giang_teacher).id,
        month_key: "2026-08",
        week_name: "Tuần 2"
      }
    end

    enrollment = Enrollment.joins(:student).find_by!(students: { code: "HV200" })
    assert_equal "https://meet.google.com/new", enrollment.meet_link
    assert_redirected_to root_path(role: "sales", person_id: users(:sales_nhien).id, teacher_id: users(:giang_teacher).id, month_key: "2026-08", week_name: "Tuần 2")
  end

  test "sales booking stores a submitted meet link" do
    assert_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ], 1) do
      post enrollments_url, params: {
        enrollment: {
          teacher_id: users(:giang_teacher).id,
          sales_id: users(:sales_nhien).id,
          student_name: "Trần Minh Khang",
          student_code: "HV201",
          course_name: "IELTS Speaking",
          meet_link: "https://meet.google.com/khang-speaking",
          duration_minutes: 40,
          start_date: "2026-08-12",
          total_sessions: 1,
          frequency_per_week: 1,
          baseline: "5.5",
          aim: "7.0",
          exam_date: "2026-12-30",
          student_note: "",
          payment_status: "Đã đóng Full",
          tuition_note: "",
          schedule_patterns: [
            { day: "Thứ 4", time: "10:00" }
          ]
        },
        role: "sales",
        person_id: users(:sales_nhien).id,
        teacher_id: users(:giang_teacher).id,
        month_key: "2026-08",
        week_name: "Tuần 2"
      }
    end

    enrollment = Enrollment.joins(:student).find_by!(students: { code: "HV201" })
    assert_equal "https://meet.google.com/khang-speaking", enrollment.meet_link
  end

  test "allows sales to create an enrollment" do
    sign_in users(:sales_nhien)

    assert_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ], 1) do
      post enrollments_url, params: {
        enrollment: {
          teacher_id: users(:giang_teacher).id,
          sales_id: users(:sales_nhien).id,
          student_name: "Phạm Gia Huy",
          student_code: "HV202",
          course_name: "IELTS Reading",
          duration_minutes: 40,
          start_date: "2026-08-12",
          total_sessions: 1,
          frequency_per_week: 1,
          payment_status: "Đã đóng Full",
          schedule_patterns: [ { day: "Thứ 4", time: "10:00" } ]
        }
      }
    end
  end

  test "rejects teacher from creating an enrollment" do
    sign_in users(:ha_teacher)

    assert_no_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ]) do
      post enrollments_url, params: {
        enrollment: {
          teacher_id: users(:giang_teacher).id,
          sales_id: users(:sales_nhien).id,
          student_name: "Không Được Phép",
          student_code: "HV203",
          course_name: "IELTS Reading",
          duration_minutes: 40,
          start_date: "2026-08-12",
          total_sessions: 1,
          frequency_per_week: 1,
          payment_status: "Đã đóng Full",
          schedule_patterns: [ { day: "Thứ 4", time: "10:00" } ]
        }
      }
    end

    assert_redirected_to root_path
    assert_equal "Bạn không có quyền thực hiện thao tác này.", flash[:alert]
  end

  test "rejects cs from destroying an enrollment" do
    sign_in users(:cs_mai)
    enrollment = enrollments(:writing_minh)

    assert_no_difference("Enrollment.count") do
      delete enrollment_url(enrollment)
    end

    assert_redirected_to root_path
  end

  test "allows cs to update an enrollment" do
    sign_in users(:cs_mai)
    enrollment = enrollments(:writing_minh)

    patch enrollment_url(enrollment), params: { enrollment: { tuition_note: "CS updated note" } }

    assert_equal "CS updated note", enrollment.reload.tuition_note
  end
end
