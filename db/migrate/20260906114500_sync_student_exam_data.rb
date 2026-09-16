# frozen_string_literal: true

class SyncStudentExamData < ActiveRecord::Migration[8.1]
  def up
    unless column_exists?(:students, :exam_status)
      add_column :students, :exam_status, :string, default: "chưa thi"
    end
    unless column_exists?(:students, :actual_score)
      add_column :students, :actual_score, :string
    end
    unless column_exists?(:students, :aim_achieved)
      add_column :students, :aim_achieved, :boolean
    end

    Student.reset_column_information
    Student.find_each do |student|
      attrs = {}
      if student.student_note.present?
        if student.exam_date.blank?
          extracted_date = Student.extract_exam_date(student.student_note)
          attrs[:exam_date] = extracted_date if extracted_date.present?
        end
        if student.aim.blank?
          aim = Student.extract_aim(student.student_note)
          attrs[:aim] = aim if aim.present?
        end
        if student.baseline.blank?
          baseline = Student.extract_baseline(student.student_note)
          attrs[:baseline] = baseline if baseline.present?
        end
      end

      check_date = attrs[:exam_date] || student.exam_date
      if (student.exam_status.blank? || student.exam_status == "chưa thi") && check_date.present?
        if Student.upcoming_exam?(check_date)
          attrs[:exam_status] = "sắp thi"
        end
      end

      student.update_columns(attrs) if attrs.present?
    end
  rescue => e
    Rails.logger.warn("SyncStudentExamData backfill warning: #{e.message}")
  end

  def down
    # Nothing to rollback
  end
end
