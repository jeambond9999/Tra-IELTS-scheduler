# frozen_string_literal: true

class AddReservationFieldsToEnrollments < ActiveRecord::Migration[8.1]
  def change
    add_column :enrollments, :status, :string, default: "active", null: false
    add_column :enrollments, :reserved_from, :date
    add_column :enrollments, :resume_date, :date
    add_column :enrollments, :reservation_note, :text
    add_column :enrollments, :pre_reservation_schedule, :text
  end
end
