# frozen_string_literal: true

module Admin
  class UsersController < AdminController
    def create
      roles = Array(params[:roles]).flatten.map(&:to_s).map(&:strip).reject(&:blank?).join(",")
      roles = "teacher" if roles.blank?

      user = User.new(
        name: params[:name].presence || params[:email].to_s.split("@").first,
        email: params[:email].to_s.strip.downcase,
        password: params[:password],
        password_confirmation: params[:password],
        roles: roles,
        person_id: params[:person_id].presence
      )

      if user.save
        redirect_to root_path(role: "admin"), notice: "Đã tạo tài khoản #{user.email} thành công!"
      else
        redirect_to root_path(role: "admin"), alert: "Lỗi tạo tài khoản: #{user.errors.full_messages.join(', ')}"
      end
    end

    def update
      user = User.find(params[:id])
      update_params = {}
      update_params[:name] = params[:name] if params[:name].present?
      update_params[:email] = params[:email].to_s.strip.downcase if params[:email].present?

      if params[:roles].present?
        roles = Array(params[:roles]).flatten.map(&:to_s).map(&:strip).reject(&:blank?).join(",")
        update_params[:roles] = roles.presence || "teacher"
      end

      if params.key?(:person_id)
        update_params[:person_id] = params[:person_id].presence
      end

      if params[:password].present?
        update_params[:password] = params[:password]
        update_params[:password_confirmation] = params[:password]
      end

      if user.update(update_params)
        redirect_to root_path(role: "admin"), notice: "Đã cập nhật tài khoản #{user.email} thành công!"
      else
        redirect_to root_path(role: "admin"), alert: "Lỗi cập nhật: #{user.errors.full_messages.join(', ')}"
      end
    end

    def destroy
      user = User.find(params[:id])
      if user.id == current_user.id
        redirect_to root_path(role: "admin"), alert: "Không thể tự xóa tài khoản của chính mình!"
        return
      end

      user.destroy
      redirect_to root_path(role: "admin"), notice: "Đã xóa tài khoản #{user.email}!"
    end
  end
end
