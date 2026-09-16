# frozen_string_literal: true

# == Schema Information
#
# Table name: items
#
#  id           :integer          not null, primary key
#  description  :text
#  discarded_at :datetime
#  name         :string           not null
#  phone_number :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  user_id      :integer          not null
#
# Indexes
#
#  index_items_on_discarded_at  (discarded_at)
#  index_items_on_user_id       (user_id)
#
# Foreign Keys
#
#  user_id  (user_id => users.id)
#
class ItemSerializer < BaseSerializer
  object_as :item, model: "Item"

  attributes :id, :name, :description, :phone_number, :created_at, :updated_at
end
