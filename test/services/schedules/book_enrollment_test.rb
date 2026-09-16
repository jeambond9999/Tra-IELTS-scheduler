# frozen_string_literal: true

require "test_helper"

class Schedules::BookEnrollmentTest < ActiveSupport::TestCase
  test "creates student enrollment and recurring lessons" do
    assert_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ], 1) do
      Schedules::BookEnrollment.call(
        teacher_id: people(:giang_teacher).id,
        sales_id: people(:sales_nhien).id,
        student_name: "Lê Quốc Bảo",
        student_code: "HV100",
        course_name: "IELTS Writing Intensive",
        meet_link: "https://meet.google.com/bao-writing",
        duration_minutes: 40,
        start_date: "2026-08-12",
        total_sessions: 1,
        frequency_per_week: 1,
        baseline: "5.0",
        aim: "7.0",
        exam_date: "2026-12-30",
        student_note: "Needs grammar support",
        payment_status: "Đã đóng Full",
        tuition_note: "",
        schedule_patterns: [
          { day: "Thứ 4", time: "10:00" }
        ]
      )
    end

    enrollment = Enrollment.find_by!(course_name: "IELTS Writing Intensive", student: Student.find_by!(code: "HV100"))
    lesson = enrollment.lesson_sessions.first

    assert_equal "https://meet.google.com/bao-writing", enrollment.meet_link
    assert_equal Date.new(2026, 8, 12), lesson.scheduled_on
    assert_equal "10:00", lesson.start_time.strftime("%H:%M")
    assert_equal "10:40", lesson.end_time.strftime("%H:%M")
    assert_equal "Day 1/1", lesson.day_label
  end

  test "uses the shared Google Meet launch URL when the booking omits a meet link" do
    enrollment = Schedules::BookEnrollment.call(
      booking_attributes(
        student_code: "HV100A",
        meet_link: nil
      ).except(:meet_link)
    )

    assert_equal "https://meet.google.com/new", enrollment.meet_link
  end

  test "stores submitted meet links" do
    enrollment = Schedules::BookEnrollment.call(
      booking_attributes(
        student_code: "HV100B",
        meet_link: "https://meet.google.com/custom-room"
      )
    )

    assert_equal "https://meet.google.com/custom-room", enrollment.meet_link
  end

  test "day one uses the requested start date even when it does not match the recurring day" do
    enrollment = Schedules::BookEnrollment.call(
      teacher_id: people(:giang_teacher).id,
      sales_id: people(:sales_nhien).id,
      student_name: "Phạm Minh Anh",
      student_code: "HV101",
      course_name: "IELTS Speaking",
      meet_link: "https://meet.google.com/minh-anh",
      duration_minutes: 40,
      start_date: "2026-08-12",
      total_sessions: 2,
      frequency_per_week: 1,
      baseline: "5.0",
      aim: "6.5",
      exam_date: "2026-12-01",
      student_note: "",
      payment_status: "Đã đóng Đợt 1",
      tuition_note: "",
      schedule_patterns: [
        { day: "Thứ 2", time: "09:00" }
      ]
    )

    assert_equal [ Date.new(2026, 8, 12), Date.new(2026, 8, 17) ], enrollment.lesson_sessions.order(:scheduled_on).pluck(:scheduled_on)
  end

  test "rejects booking conflicts" do
    error = assert_raises(Schedules::BookEnrollment::BookingError) do
      Schedules::BookEnrollment.call(
        teacher_id: people(:ha_teacher).id,
        sales_id: people(:sales_nhien).id,
        student_name: "Conflict Student",
        student_code: "HV102",
        course_name: "IELTS Writing",
        meet_link: "https://meet.google.com/conflict",
        duration_minutes: 40,
        start_date: "2026-08-10",
        total_sessions: 1,
        frequency_per_week: 1,
        baseline: "5.0",
        aim: "7.0",
        exam_date: "2026-12-30",
        student_note: "",
        payment_status: "Đã đóng Full",
        tuition_note: "",
        schedule_patterns: [
          { day: "Thứ 2", time: "08:00" }
        ]
      )
    end

    assert error.messages.any? { |m| m.include?("đã có lịch") }
  end

  test "rejects existing student code with a different name" do
    error = assert_raises(Schedules::BookEnrollment::BookingError) do
      Schedules::BookEnrollment.call(
        teacher_id: people(:giang_teacher).id,
        sales_id: people(:sales_nhien).id,
        student_name: "Different Name",
        student_code: students(:minh).code,
        course_name: "IELTS Reading",
        meet_link: "https://meet.google.com/different",
        duration_minutes: 40,
        start_date: "2026-08-20",
        total_sessions: 1,
        frequency_per_week: 1,
        baseline: "5.0",
        aim: "7.0",
        exam_date: "2026-12-30",
        student_note: "",
        payment_status: "Đã đóng Full",
        tuition_note: "",
        schedule_patterns: [
          { day: "Thứ 5", time: "10:00" }
        ]
      )
    end

    assert_includes error.messages, "Mã học viên đã tồn tại với thông tin khác."
  end

  test "consumes an open availability before creating its lesson" do
    TeacherAvailability.where(teacher: people(:ha_teacher), available_on: "2026-08-17", start_time: "07:00").delete_all
    availability = TeacherAvailability.create!(
      teacher: people(:ha_teacher),
      available_on: "2026-08-17",
      start_time: "07:00",
      end_time: "07:40",
      duration_minutes: 40
    )
    enrollment = nil

    assert_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ], 1) do
      assert_difference("TeacherAvailability.count", -1) do
        enrollment = Schedules::BookEnrollment.call(
          booking_attributes(
            teacher_id: people(:ha_teacher).id,
            student_code: "HV103",
            start_date: "2026-08-17",
            schedule_patterns: [ { day: "Thứ 2", time: "07:00" } ]
          )
        )
      end
    end

    assert_predicate enrollment, :persisted?
    assert_not TeacherAvailability.exists?(availability.id)
    assert_equal "07:00", enrollment.lesson_sessions.first.start_time.strftime("%H:%M")
  end

  test "creates twice-weekly recurring lessons from two weekday patterns" do
    enrollment = Schedules::BookEnrollment.call(
      booking_attributes(
        student_code: "HV104",
        total_sessions: 3,
        frequency_per_week: 2,
        schedule_patterns: [
          { day: "Thứ 4", time: "10:00" },
          { day: "Thứ 6", time: "11:00" }
        ]
      )
    )

    lessons = enrollment.lesson_sessions.order(:scheduled_on)

    assert_equal [ Date.new(2026, 8, 12), Date.new(2026, 8, 14), Date.new(2026, 8, 19) ], lessons.pluck(:scheduled_on)
    assert_equal [ "10:00", "11:00", "10:00" ], lessons.map { |lesson| lesson.start_time.strftime("%H:%M") }
  end

  test "rejects a schedule pattern count that differs from the weekly frequency" do
    error = assert_raises(Schedules::BookEnrollment::BookingError) do
      Schedules::BookEnrollment.call(
        booking_attributes(
          student_code: "HV105",
          frequency_per_week: 2,
          schedule_patterns: [ { day: "Thứ 4", time: "10:00" } ]
        )
      )
    end

    assert_includes error.messages, "Cần chọn đúng số khung lịch mỗi tuần."
  end

  test "allows same weekday schedule patterns with different times" do
    enrollment = Schedules::BookEnrollment.call(
      booking_attributes(
        student_code: "HV106",
        start_date: "2026-08-05", # Wednesday
        total_sessions: 4,
        frequency_per_week: 2,
        schedule_patterns: [
          { day: "Thứ 4", time: "10:00" },
          { day: "Thứ 4", time: "11:00" }
        ]
      )
    )

    assert_equal 4, enrollment.lesson_sessions.count
    sessions = enrollment.lesson_sessions.order(:scheduled_on, :start_time).to_a
    assert_equal "Day 1/4", sessions[0].day_label
    assert_equal "10:00", sessions[0].start_time.strftime("%H:%M")
    assert_equal "Day 2/4", sessions[1].day_label
    assert_equal "11:00", sessions[1].start_time.strftime("%H:%M")
  end

  test "rejects identical weekday and time schedule patterns" do
    error = assert_raises(Schedules::BookEnrollment::BookingError) do
      Schedules::BookEnrollment.call(
        booking_attributes(
          student_code: "HV107",
          frequency_per_week: 2,
          schedule_patterns: [
            { day: "Thứ 4", time: "10:00" },
            { day: "Thứ 4", time: "10:00" }
          ]
        )
      )
    end

    assert_includes error.messages, "Các khung lịch mỗi tuần không được trùng cả thứ và giờ."
  end

  test "supports double session booking with 2 curriculum lessons per slot" do
    enrollment = Schedules::BookEnrollment.call(
      booking_attributes(
        student_code: "HV108",
        start_date: "2026-08-05",
        total_sessions: 8,
        frequency_per_week: 1,
        double_session: true,
        duration_minutes: 80,
        schedule_patterns: [
          { day: "Thứ 4", time: "10:00" }
        ]
      )
    )

    assert_equal 4, enrollment.lesson_sessions.count
    sessions = enrollment.lesson_sessions.order(:scheduled_on, :start_time).to_a
    assert_equal "Day 1 & 2/8", sessions[0].day_label
    assert_equal 80, sessions[0].duration_minutes
    assert_equal "Day 3 & 4/8", sessions[1].day_label
    assert_equal "Day 5 & 6/8", sessions[2].day_label
    assert_equal "Day 7 & 8/8", sessions[3].day_label
  end

  test "returns booking errors for malformed schedule input" do
    [
      { start_date: "not-a-date" },
      { schedule_patterns: nil },
      { schedule_patterns: [ {} ] },
      { schedule_patterns: [ "not-a-pattern" ] },
      { schedule_patterns: [ { day: "Monday", time: "10:00" } ] },
      { schedule_patterns: [ { day: "Thứ 4", time: "invalid" } ] }
    ].each_with_index do |overrides, index|
      error = assert_raises(Schedules::BookEnrollment::BookingError) do
        Schedules::BookEnrollment.call(booking_attributes({ student_code: "HV10#{index + 7}" }.merge(overrides)))
      end

      assert_predicate error.messages, :present?
    end
  end

  private

  def booking_attributes(overrides = {})
    {
      teacher_id: people(:giang_teacher).id,
      sales_id: people(:sales_nhien).id,
      student_name: "Test Student",
      student_code: "HV999",
      course_name: "IELTS Writing",
      meet_link: "https://meet.google.com/test-student",
      duration_minutes: 40,
      start_date: "2026-08-12",
      total_sessions: 1,
      frequency_per_week: 1,
      baseline: "5.0",
      aim: "7.0",
      exam_date: "2026-12-30",
      student_note: "",
      payment_status: "Đã đóng Full",
      tuition_note: "",
      schedule_patterns: [ { day: "Thứ 4", time: "10:00" } ]
    }.merge(overrides)
  end
end
