# frozen_string_literal: true

# == Schema Information
#
# Table name: users
# Database name: primary
#
#  id                         :bigint           not null, primary key
#  active                     :boolean          default(TRUE), not null
#  avatar_url                 :string
#  email                      :string           default(""), not null
#  encrypted_password         :string           default(""), not null
#  name                       :string
#  provider                   :string
#  remember_created_at        :datetime
#  reset_password_sent_at     :datetime
#  reset_password_token       :string
#  roles                      :string           default("teacher"), not null
#  uid                        :string
#  weekly_availability_target :integer
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#
# Indexes
#
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_provider_and_uid      (provider,uid) UNIQUE
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#
require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "role scopes match any role in the comma separated list" do
    multi_role = User.create!(name: "Multi", email: "multi@example.com", password: "password123", roles: "sales, cs")

    assert_includes User.teachers, users(:ha_teacher)
    assert_not_includes User.teachers, users(:sales_nhien)
    assert_includes User.sales_people, multi_role
    assert_includes User.cs_people, multi_role
    assert_not_includes User.teachers, multi_role
  end

  test "role scopes do not match a role that is only a substring of another" do
    aide = User.create!(name: "Aide", email: "aide@example.com", password: "password123", roles: "teachers_aide")

    assert_not_includes User.teachers, aide
  end

  test "active scope excludes deactivated staff" do
    users(:giang_teacher).update!(active: false)

    assert_includes User.active.teachers, users(:ha_teacher)
    assert_not_includes User.active.teachers, users(:giang_teacher)
  end

  test "defaults weekly availability target to 28" do
    assert_equal 28, User.new.weekly_availability_target
  end

  test "requires positive weekly availability target" do
    user = users(:ha_teacher)
    user.weekly_availability_target = 0

    assert_not user.valid?
    assert_includes user.errors[:weekly_availability_target], "must be greater than 0"
  end

  test "deactivated accounts cannot sign in" do
    user = users(:ha_teacher)
    assert user.active_for_authentication?

    user.active = false
    assert_not user.active_for_authentication?
    assert_equal :deactivated, user.inactive_message
  end

  test "cannot delete staff who already have lessons" do
    teacher = users(:ha_teacher)
    assert teacher.lesson_sessions.exists?

    assert_not teacher.destroy
    assert User.exists?(teacher.id)
  end
end
