# frozen_string_literal: true

class AddExamStatusAndActualScoreToStudents < ActiveRecord::Migration[8.1]
  def change
    add_column :students, :exam_status, :string, default: "chưa thi"
    add_column :students, :actual_score, :string
    add_column :students, :aim_achieved, :boolean
  end
end
