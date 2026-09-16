# frozen_string_literal: true

class ApplicationPolicy < ActionPolicy::Base
  # Configure authorization context
  authorize :user

  # Define common predicates
  def owner?
    record.user_id == user.id
  end

  # Default rules - deny everything by default
  def index?
    true
  end

  def show?
    owner?
  end

  def create?
    true
  end

  def new?
    create?
  end

  def update?
    owner?
  end

  def edit?
    update?
  end

  def destroy?
    owner?
  end

  # Define scopes for collections
  relation_scope do |relation|
    relation.where(user: user)
  end
end
