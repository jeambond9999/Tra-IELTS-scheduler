# frozen_string_literal: true

class AddPhoneNumberToItems < ActiveRecord::Migration[8.1]
  def change
    add_column :items, :phone_number, :string
  end
end
