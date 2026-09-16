# frozen_string_literal: true

class CreateSchedulerTables < ActiveRecord::Migration[8.1]
  def change
    create_table :people do |t|
      t.string :name, null: false
      t.string :role, null: false
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :people, %i[role name], unique: true
    add_check_constraint :people, "role IN ('teacher', 'sales', 'cs')", name: "people_role_check"

    create_table :students do |t|
      t.string :name, null: false
      t.string :code, null: false
      t.string :baseline
      t.string :aim
      t.date :exam_date
      t.text :student_note

      t.timestamps
    end

    add_index :students, :code, unique: true

    create_table :enrollments do |t|
      t.references :student, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: { to_table: :people }
      t.references :sales, null: false, foreign_key: { to_table: :people }
      t.string :course_name, null: false
      t.string :payment_status, null: false, default: "Đã đóng Full"
      t.text :tuition_note
      t.string :meet_link, null: false
      t.date :start_date, null: false
      t.integer :total_sessions, null: false
      t.integer :frequency_per_week, null: false
      t.integer :duration_minutes, null: false
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_check_constraint :enrollments, "total_sessions > 0", name: "enrollments_total_sessions_positive"
    add_check_constraint :enrollments, "frequency_per_week IN (1, 2)", name: "enrollments_frequency_check"
    add_check_constraint :enrollments, "duration_minutes IN (20, 40, 60, 80)", name: "enrollments_duration_check"

    create_table :lesson_sessions do |t|
      t.references :enrollment, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: { to_table: :people }
      t.date :scheduled_on, null: false
      t.time :start_time, null: false
      t.time :end_time, null: false
      t.integer :duration_minutes, null: false
      t.string :day_label, null: false
      t.string :lesson_status, null: false, default: ""
      t.text :lesson_notes
      t.string :cs_form, null: false, default: ""
      t.string :cs_status, null: false, default: ""
      t.references :rescheduled_from, foreign_key: { to_table: :lesson_sessions }

      t.timestamps
    end

    add_index :lesson_sessions, %i[teacher_id scheduled_on start_time end_time], name: "index_lessons_on_teacher_date_time"
    add_check_constraint :lesson_sessions, "duration_minutes IN (20, 40, 60, 80)", name: "lesson_sessions_duration_check"

    create_table :teacher_availabilities do |t|
      t.references :teacher, null: false, foreign_key: { to_table: :people }
      t.date :available_on, null: false
      t.time :start_time, null: false
      t.time :end_time, null: false
      t.integer :duration_minutes, null: false

      t.timestamps
    end

    add_index :teacher_availabilities, %i[teacher_id available_on start_time end_time], name: "index_availability_on_teacher_date_time"
    add_check_constraint :teacher_availabilities, "duration_minutes IN (20, 40, 60, 80)", name: "teacher_availabilities_duration_check"
  end
end
