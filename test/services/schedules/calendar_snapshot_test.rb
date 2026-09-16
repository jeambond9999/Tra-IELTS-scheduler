# frozen_string_literal: true

require "test_helper"

class Schedules::CalendarSnapshotTest < ActiveSupport::TestCase
  test "returns visible teacher schedule and summary" do
    teacher = create_teacher("Snapshot Teacher", weekly_availability_target: 24)
    student = Student.create!(name: "Snapshot Student", code: "SNAP#{SecureRandom.hex(4)}")
    enrollment = Enrollment.create!(
      student: student,
      teacher: teacher,
      sales: users(:sales_nhien),
      course_name: "Snapshot Course",
      meet_link: "https://meet.google.com/snapshot",
      start_date: "2026-08-12",
      total_sessions: 1,
      frequency_per_week: 1,
      duration_minutes: 40,
      active: true
    )
    availability = TeacherAvailability.create!(
      teacher: teacher,
      available_on: "2026-08-12",
      start_time: "07:00",
      end_time: "07:40",
      duration_minutes: 40
    )
    lesson = LessonSession.create!(
      enrollment: enrollment,
      teacher: teacher,
      scheduled_on: "2026-08-12",
      start_time: "08:00",
      end_time: "08:40",
      duration_minutes: 40,
      day_label: "Day 1/1"
    )

    snapshot = Schedules::CalendarSnapshot.new(
      month_key: "2026-08",
      week_name: "Tuần 3",
      selected_teacher_id: teacher.id
    ).to_h

    assert_equal teacher, snapshot.fetch(:selected_teacher)
    assert_includes snapshot.fetch(:lesson_sessions), lesson
    assert_includes snapshot.fetch(:teacher_availabilities), availability
    assert_equal 1.0, snapshot.fetch(:week_summary).fetch(:available_ca)
    assert_equal 1.0, snapshot.fetch(:week_summary).fetch(:booked_ca)
    assert_equal 1.0, snapshot.fetch(:week_summary).fetch(:total_ca)

    week_kpi = snapshot.fetch(:weekly_kpis).find { |entry| entry.fetch(:week) == "Tuần 3" }
    assert_equal 24, week_kpi.fetch(:target)
    assert_equal 4, week_kpi.fetch(:pct)
  end

  test "returns student tracking rows" do
    snapshot = Schedules::CalendarSnapshot.new(
      month_key: "2026-08",
      week_name: "Tuần 3",
      selected_teacher_id: users(:ha_teacher).id
    ).to_h

    student = snapshot.fetch(:student_tracking).first

    assert_equal "Nguyễn Văn Minh", student.fetch(:student_name)
    assert_equal "HV001", student.fetch(:student_code)
    assert_equal 10, student.fetch(:total)
    assert_equal 0, student.fetch(:completed)
    assert_equal 10, student.fetch(:remaining)
  end

  test "reconciles monthly total ca with weekly kpi sum even when month has trailing days" do
    teacher = create_teacher("Reconcile Teacher", weekly_availability_target: 28)
    # 2026-08-31 is Monday, day 31 of August, which falls past the 5th Sunday (2026-08-30)
    TeacherAvailability.create!(
      teacher: teacher,
      available_on: "2026-08-31",
      start_time: "08:00",
      end_time: "08:40",
      duration_minutes: 40
    )
    TeacherAvailability.create!(
      teacher: teacher,
      available_on: "2026-08-10",
      start_time: "08:00",
      end_time: "08:40",
      duration_minutes: 40
    )

    snapshot = Schedules::CalendarSnapshot.new(
      month_key: "2026-08",
      week_name: "Tuần 5",
      selected_teacher_id: teacher.id
    ).to_h

    month_summary = snapshot.fetch(:month_summary)
    weekly_kpis = snapshot.fetch(:weekly_kpis)

    total_from_weeks = weekly_kpis.sum { |w| w.fetch(:count) }
    assert_equal month_summary.fetch(:total_ca), total_from_weeks
    assert_equal 2.0, total_from_weeks

    week_5_kpi = weekly_kpis.find { |w| w.fetch(:week) == "Tuần 5" }
    assert_equal 1.0, week_5_kpi.fetch(:count)
  end

  private

  def create_teacher(name, weekly_availability_target:)
    suffix = SecureRandom.hex(4)
    User.create!(
      name: "#{name} #{suffix}",
      email: "teacher-#{suffix}@example.com",
      password: "password123",
      roles: "teacher",
      weekly_availability_target: weekly_availability_target
    )
  end
end
