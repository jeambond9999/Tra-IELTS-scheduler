# frozen_string_literal: true

class ItemPolicy < ApplicationPolicy
  # Inherits all rules from ApplicationPolicy
  # Items are owned by users, so the default owner? check works

  # Customize scopes if needed
  relation_scope do |relation|
    relation.where(user: user)
  end
end
