# frozen_string_literal: true

class AdminController < ApplicationController
  before_action :authenticate_admin!

  private

  def authenticate_admin!
    authenticate_user!
    redirect_to root_path, alert: "Bạn không có quyền truy cập trang quản trị." unless current_user&.admin?
  end
end
