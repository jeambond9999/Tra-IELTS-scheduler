# frozen_string_literal: true

class PersonSerializer < BaseSerializer
  object_as :person, model: "Person"

  attributes :id, :name, :role, :active, :weekly_availability_target
end
