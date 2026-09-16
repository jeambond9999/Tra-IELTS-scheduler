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
require "test_helper"

class ItemTest < ActiveSupport::TestCase
  test "should not save item without name" do
    user = users(:one)
    item = Item.new(user: user)
    assert_not item.save, "Saved the item without a name"
  end

  test "should save item with name" do
    user = users(:one)
    item = Item.new(name: "Test Item", user: user)
    assert item.save, "Could not save the item with a name"
  end

  test "should not save item without user" do
    item = Item.new(name: "Test Item")
    assert_not item.save, "Saved the item without a user"
  end

  test "should belong to user" do
    item = items(:one)
    assert_equal users(:one), item.user
  end

  test "should allow blank description" do
    user = users(:one)
    item = Item.new(name: "Test Item", description: nil, user: user)
    assert item.save, "Could not save the item with blank description"
  end

  test "should allow description" do
    user = users(:one)
    item = Item.new(name: "Test Item", description: "A description", user: user)
    assert item.save, "Could not save the item with description"
    assert_equal "A description", item.description
  end

  test "fixture items should be valid" do
    assert items(:one).valid?
    assert items(:two).valid?
    assert items(:three).valid?
  end
end
