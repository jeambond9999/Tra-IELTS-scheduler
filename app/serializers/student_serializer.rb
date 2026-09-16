# frozen_string_literal: true

class StudentSerializer < BaseSerializer
  object_as :student, model: "Student"

  attributes :id, :name, :code, :baseline, :aim, :exam_date, :student_note, :exam_status, :actual_score, :aim_achieved
end
