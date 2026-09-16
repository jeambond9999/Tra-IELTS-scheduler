# frozen_string_literal: true

class InertiaController < ApplicationController
  inertia_share flash: -> {
    {
      notice: flash[:notice],
      alert: flash[:alert]
    }
  }

  inertia_share user: -> {
    return nil unless current_user

    UserSerializer.one(current_user)
  }

  private

  # Allows the action when current_user is an admin or holds at least one of
  # the given roles (matches how RolePersonSelector/LessonDetailDialog already
  # gate the corresponding buttons on the frontend).
  def authorize_roles!(*allowed_roles)
    return if current_user.admin?
    return if allowed_roles.any? { |role| current_user.has_role?(role) }

    redirect_to root_path, alert: "Bạn không có quyền thực hiện thao tác này."
  end
end
