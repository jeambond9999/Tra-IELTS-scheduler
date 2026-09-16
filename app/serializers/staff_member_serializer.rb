# frozen_string_literal: true

class StaffMemberSerializer < BaseSerializer
  object_as :user, model: "User"

  attributes :id, :name, :active, :weekly_availability_target

  attribute def role
    options[:role]
  end
end
