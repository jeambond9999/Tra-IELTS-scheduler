# frozen_string_literal: true

class ChangeStudentExamDateToString < ActiveRecord::Migration[8.1]
  def up
    change_column :students, :exam_date, :string, using: "exam_date::varchar"
  end

  def down
    change_column :students, :exam_date, :date, using: "exam_date::date"
  end
end
