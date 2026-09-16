# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_16_180000) do
  create_table "enrollments", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "course_name", null: false
    t.datetime "created_at", null: false
    t.integer "duration_minutes", null: false
    t.integer "frequency_per_week", null: false
    t.string "meet_link", null: false
    t.string "payment_status", default: "Đã đóng Full", null: false
    t.text "pre_reservation_schedule"
    t.text "reservation_note"
    t.date "reserved_from"
    t.date "resume_date"
    t.integer "sales_id", null: false
    t.date "start_date", null: false
    t.string "status", default: "active", null: false
    t.integer "student_id", null: false
    t.integer "teacher_id", null: false
    t.integer "total_sessions", null: false
    t.text "tuition_note"
    t.datetime "updated_at", null: false
    t.index ["sales_id"], name: "index_enrollments_on_sales_id"
    t.index ["student_id"], name: "index_enrollments_on_student_id"
    t.index ["teacher_id"], name: "index_enrollments_on_teacher_id"
    t.check_constraint "duration_minutes > 0", name: "enrollments_duration_check"
    t.check_constraint "frequency_per_week IN (1, 2)", name: "enrollments_frequency_check"
    t.check_constraint "total_sessions > 0", name: "enrollments_total_sessions_positive"
  end

  create_table "items", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.text "description"
    t.datetime "discarded_at"
    t.string "name", null: false
    t.string "phone_number"
    t.datetime "updated_at", null: false
    t.integer "user_id", null: false
    t.index ["discarded_at"], name: "index_items_on_discarded_at"
    t.index ["user_id"], name: "index_items_on_user_id"
  end

  create_table "lesson_sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "cs_form", default: "", null: false
    t.string "cs_status", default: "", null: false
    t.string "day_label", null: false
    t.integer "duration_minutes", null: false
    t.time "end_time", null: false
    t.integer "enrollment_id", null: false
    t.text "lesson_notes"
    t.string "lesson_status", default: "", null: false
    t.integer "rescheduled_from_id"
    t.date "scheduled_on", null: false
    t.time "start_time", null: false
    t.integer "teacher_id", null: false
    t.datetime "updated_at", null: false
    t.index ["enrollment_id"], name: "index_lesson_sessions_on_enrollment_id"
    t.index ["rescheduled_from_id"], name: "index_lesson_sessions_on_rescheduled_from_id"
    t.index ["teacher_id", "scheduled_on", "start_time", "end_time"], name: "index_lessons_on_teacher_date_time"
    t.index ["teacher_id"], name: "index_lesson_sessions_on_teacher_id"
    t.check_constraint "duration_minutes > 0", name: "lesson_sessions_duration_check"
  end

  create_table "students", force: :cascade do |t|
    t.string "actual_score"
    t.string "aim"
    t.boolean "aim_achieved"
    t.string "baseline"
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.string "exam_date"
    t.string "exam_status", default: "chưa thi"
    t.string "name", null: false
    t.text "student_note"
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_students_on_code", unique: true
  end

  create_table "teacher_availabilities", force: :cascade do |t|
    t.date "available_on", null: false
    t.datetime "created_at", null: false
    t.integer "duration_minutes", null: false
    t.time "end_time", null: false
    t.time "start_time", null: false
    t.integer "teacher_id", null: false
    t.datetime "updated_at", null: false
    t.index ["teacher_id", "available_on", "start_time", "end_time"], name: "index_availability_on_teacher_date_time"
    t.index ["teacher_id"], name: "index_teacher_availabilities_on_teacher_id"
    t.check_constraint "duration_minutes > 0", name: "teacher_availabilities_duration_check"
  end

  create_table "users", force: :cascade do |t|
    t.boolean "active", default: true, null: false
    t.string "avatar_url"
    t.datetime "created_at", null: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "name"
    t.string "provider"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.string "roles", default: "teacher", null: false
    t.string "uid"
    t.datetime "updated_at", null: false
    t.integer "weekly_availability_target"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.check_constraint "weekly_availability_target IS NULL OR weekly_availability_target > 0", name: "users_weekly_availability_target_positive"
  end

  create_table "versions", force: :cascade do |t|
    t.datetime "created_at"
    t.string "event", null: false
    t.bigint "item_id", null: false
    t.string "item_type", null: false
    t.text "object", limit: 1073741823
    t.text "object_changes"
    t.string "whodunnit"
    t.index ["item_type", "item_id"], name: "index_versions_on_item_type_and_item_id"
  end

  add_foreign_key "enrollments", "students"
  add_foreign_key "enrollments", "users", column: "sales_id"
  add_foreign_key "enrollments", "users", column: "teacher_id"
  add_foreign_key "items", "users"
  add_foreign_key "lesson_sessions", "enrollments"
  add_foreign_key "lesson_sessions", "lesson_sessions", column: "rescheduled_from_id"
  add_foreign_key "lesson_sessions", "users", column: "teacher_id"
  add_foreign_key "teacher_availabilities", "users", column: "teacher_id"
end
