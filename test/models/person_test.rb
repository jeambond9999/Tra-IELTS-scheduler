# frozen_string_literal: true

# == Schema Information
#
# Table name: people
# Database name: primary
#
#  id                         :bigint           not null, primary key
#  active                     :boolean          default(TRUE), not null
#  name                       :string           not null
#  role                       :string           not null
#  weekly_availability_target :integer
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#
# Indexes
#
#  index_people_on_role_and_name  (role,name) UNIQUE
#
require "test_helper"

class PersonTest < ActiveSupport::TestCase
  test "requires a unique name per role" do
    person = Person.new(name: people(:ha_teacher).name, role: :teacher)

    assert_not person.valid?
    assert_includes person.errors[:name], "has already been taken"
  end

  test "filters active teachers" do
    assert_includes Person.active.teachers, people(:ha_teacher)
    assert_not_includes Person.active.teachers, people(:sales_nhien)
  end

  test "defaults weekly availability target to 28" do
    person = Person.new(name: "Target Teacher", role: :teacher)

    assert_equal 28, person.weekly_availability_target
  end

  test "requires positive weekly availability target" do
    person = Person.new(name: "Target Teacher", role: :teacher, weekly_availability_target: 0)

    assert_not person.valid?
    assert_includes person.errors[:weekly_availability_target], "must be greater than 0"
  end
end
