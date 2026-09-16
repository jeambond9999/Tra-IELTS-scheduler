# frozen_string_literal: true

# == Schema Information
#
# Table name: students
# Database name: primary
#
#  id           :bigint           not null, primary key
#  actual_score :string
#  aim          :string
#  aim_achieved :boolean
#  baseline     :string
#  code         :string           not null
#  exam_date    :string
#  exam_status  :string           default("chưa thi")
#  name         :string           not null
#  student_note :text
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#
# Indexes
#
#  index_students_on_code  (code) UNIQUE
#
class StudentSerializer < BaseSerializer
  object_as :student, model: "Student"

  attributes :id, :name, :code, :baseline, :aim, :exam_date, :student_note, :exam_status, :actual_score, :aim_achieved
end
