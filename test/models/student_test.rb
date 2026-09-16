# frozen_string_literal: true

# == Schema Information
#
# Table name: students
# Database name: primary
#
#  id           :bigint           not null, primary key
#  aim          :string
#  baseline     :string
#  code         :string           not null
#  exam_date    :date
#  name         :string           not null
#  student_note :text
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#
# Indexes
#
#  index_students_on_code  (code) UNIQUE
#
require "test_helper"

class StudentTest < ActiveSupport::TestCase
  test "requires a unique code" do
    student = Student.new(name: "Another Hà", code: students(:minh).code)

    assert_not student.valid?
    assert_includes student.errors[:code], "has already been taken"
  end
end
