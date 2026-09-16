# frozen_string_literal: true

class AddWeeklyAvailabilityTargetToPeople < ActiveRecord::Migration[8.1]
  def change
    add_column :people, :weekly_availability_target, :integer
    add_check_constraint :people,
      "weekly_availability_target IS NULL OR weekly_availability_target > 0",
      name: "people_weekly_availability_target_positive"
  end
end
