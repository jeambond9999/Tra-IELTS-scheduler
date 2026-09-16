# frozen_string_literal: true

class AllowFlexibleDurations < ActiveRecord::Migration[8.0]
  def up
    remove_check_constraint :enrollments, name: "enrollments_duration_check", if_exists: true
    remove_check_constraint :lesson_sessions, name: "lesson_sessions_duration_check", if_exists: true
    remove_check_constraint :teacher_availabilities, name: "teacher_availabilities_duration_check", if_exists: true

    add_check_constraint :enrollments, "duration_minutes > 0", name: "enrollments_duration_check"
    add_check_constraint :lesson_sessions, "duration_minutes > 0", name: "lesson_sessions_duration_check"
    add_check_constraint :teacher_availabilities, "duration_minutes > 0", name: "teacher_availabilities_duration_check"
  end

  def down
    remove_check_constraint :enrollments, name: "enrollments_duration_check", if_exists: true
    remove_check_constraint :lesson_sessions, name: "lesson_sessions_duration_check", if_exists: true
    remove_check_constraint :teacher_availabilities, name: "teacher_availabilities_duration_check", if_exists: true

    add_check_constraint :enrollments, "duration_minutes IN (20, 40, 60, 80)", name: "enrollments_duration_check"
    add_check_constraint :lesson_sessions, "duration_minutes IN (20, 40, 60, 80)", name: "lesson_sessions_duration_check"
    add_check_constraint :teacher_availabilities, "duration_minutes IN (20, 40, 60, 80)", name: "teacher_availabilities_duration_check"
  end
end
