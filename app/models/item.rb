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
class Item < ApplicationRecord
  include Discard::Model

  belongs_to :user
  has_paper_trail save_changes: true

  validates :name, presence: true

  default_scope -> { kept }
end
