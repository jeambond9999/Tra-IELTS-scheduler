# frozen_string_literal: true

require "test_helper"

class Schedules::RescheduleRemainingSessionsTest < ActiveSupport::TestCase
  setup do
    @teacher = users(:giang_teacher)
    @sales = users(:sales_nhien)
    @student = Student.create!(name: "Nguyễn Phạm Thanh Vân", code: "TRA83")
    @enrollment = Enrollment.create!(
      student: @student,
      teacher: @teacher,
      sales: @sales,
      course_name: "SF3 - Speaking",
      meet_link: "https://meet.google.com/test",
      duration_minutes: 40,
      start_date: "2026-06-22",
      total_sessions: 12,
      frequency_per_week: 1,
      active: true
    )

    # Create 12 weekly sessions
    @sessions = (1..12).map do |i|
      date = Date.new(2026, 6, 22) + ((i - 1) * 7).days
      LessonSession.create!(
        enrollment: @enrollment,
        teacher: @teacher,
        scheduled_on: date,
        start_time: "14:00",
        end_time: "14:40",
        duration_minutes: 40,
        day_label: "Day #{i}/12",
        lesson_status: i <= 2 ? "completed" : "",
        cs_status: i <= 2 ? "completed" : ""
      )
    end
  end

  test "reschedules from Day 3 onwards preserving completed Day 1 and Day 2" do
    day3_session = @sessions[2] # 3rd session (Day 3)
    day1_session = @sessions[0]
    day2_session = @sessions[1]

    result = Schedules::RescheduleRemainingSessions.call(
      enrollment_id: @enrollment.id,
      from_session_id: day3_session.id,
      start_date: "2026-07-01",
      frequency_per_week: 2,
      duration_minutes: 40,
      teacher_id: @teacher.id,
      schedule_patterns: [
        { day: "Thứ 4", time: "14:00" },
        { day: "Thứ 6", time: "14:00" }
      ]
    )

    assert_equal 10, result[:created_count]
    assert_equal 10, result[:replaced_count]

    # Reload all sessions
    all_sessions = @enrollment.lesson_sessions.order(:scheduled_on, :start_time).to_a
    assert_equal 12, all_sessions.size

    # Day 1 and Day 2 remain completed and unchanged
    assert_equal day1_session.id, all_sessions[0].id
    assert_equal "Day 1/12", all_sessions[0].day_label
    assert_equal "completed", all_sessions[0].lesson_status
    assert_equal Date.new(2026, 6, 22), all_sessions[0].scheduled_on

    assert_equal day2_session.id, all_sessions[1].id
    assert_equal "Day 2/12", all_sessions[1].day_label
    assert_equal "completed", all_sessions[1].lesson_status
    assert_equal Date.new(2026, 6, 29), all_sessions[1].scheduled_on

    # Day 3 through Day 12 are new sessions scheduled on Wed & Fri
    assert_equal "Day 3/12", all_sessions[2].day_label
    assert_equal Date.new(2026, 7, 1), all_sessions[2].scheduled_on # Wednesday
    assert_equal "14:00", all_sessions[2].start_time.strftime("%H:%M")

    assert_equal "Day 4/12", all_sessions[3].day_label
    assert_equal Date.new(2026, 7, 3), all_sessions[3].scheduled_on # Friday
    assert_equal "14:00", all_sessions[3].start_time.strftime("%H:%M")

    assert_equal "Day 12/12", all_sessions[11].day_label
    assert_equal 2, @enrollment.reload.frequency_per_week
  end

  test "updates frequency_per_week when setting 2 sessions per week" do
    day3_session = @sessions[2]

    Schedules::RescheduleRemainingSessions.call(
      enrollment_id: @enrollment.id,
      from_session_id: day3_session.id,
      start_date: "2026-07-01",
      frequency_per_week: 2,
      duration_minutes: 40,
      teacher_id: @teacher.id,
      schedule_patterns: [
        { day: "Thứ 2", time: "14:00" },
        { day: "Thứ 4", time: "14:00" }
      ]
    )

    assert_equal 2, @enrollment.reload.frequency_per_week
    assert_equal 12, @enrollment.lesson_sessions.count
  end

  test "reschedules using from_day_number when only 2 completed sessions exist in DB" do
    # Delete sessions 3..12 to simulate a partially scheduled course
    @sessions[2..].each(&:destroy!)
    assert_equal 2, @enrollment.lesson_sessions.count

    result = Schedules::RescheduleRemainingSessions.call(
      enrollment_id: @enrollment.id,
      from_day_number: 3,
      start_date: "2026-06-24",
      frequency_per_week: 2,
      duration_minutes: 40,
      teacher_id: @teacher.id,
      schedule_patterns: [
        { day: "Thứ 4", time: "14:00" },
        { day: "Thứ 6", time: "14:00" }
      ]
    )

    assert_equal 10, result[:created_count]
    assert_equal 0, result[:replaced_count]

    all_sessions = @enrollment.lesson_sessions.order(:scheduled_on, :start_time).to_a
    assert_equal 12, all_sessions.size
    assert_equal "Day 1/12", all_sessions[0].day_label
    assert_equal "Day 2/12", all_sessions[1].day_label
    assert_equal "Day 3/12", all_sessions[2].day_label
    assert_equal "Day 12/12", all_sessions[11].day_label
  end

  test "reschedules from Day 1 replacing everything when from_day_number is 1" do
    result = Schedules::RescheduleRemainingSessions.call(
      enrollment_id: @enrollment.id,
      from_day_number: 1,
      start_date: "2026-06-24",
      frequency_per_week: 2,
      duration_minutes: 40,
      teacher_id: @teacher.id,
      schedule_patterns: [
        { day: "Thứ 4", time: "14:00" },
        { day: "Thứ 6", time: "14:00" }
      ]
    )

    assert_equal 12, result[:created_count]
    assert_equal 12, result[:replaced_count]

    all_sessions = @enrollment.lesson_sessions.order(:scheduled_on, :start_time).to_a
    assert_equal 12, all_sessions.size
    assert_equal "Day 1/12", all_sessions[0].day_label
    assert_equal "Day 12/12", all_sessions[11].day_label
  end
end
