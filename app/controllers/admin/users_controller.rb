# frozen_string_literal: true

module Admin
  class UsersController < AdminController
    def create
      roles = submitted_roles
      if roles.blank?
        return redirect_to root_path(role: "admin"), alert: "Vui lòng chọn ít nhất 1 vai trò cho tài khoản."
      end

      user = User.new(
        name: params[:name].presence || params[:email].to_s.split("@").first,
        email: params[:email].to_s.strip.downcase,
        password: params[:password],
        password_confirmation: params[:password],
        roles: roles
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
        roles = submitted_roles
        update_params[:roles] = roles if roles.present?
      end

      if params.key?(:active)
        update_params[:active] = ActiveModel::Type::Boolean.new.cast(params[:active])
        if user == current_user && update_params[:active] == false
          return redirect_to root_path(role: "admin"), alert: "Không thể tự ngừng hoạt động tài khoản của chính mình!"
        end
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

      if user.destroy
        redirect_to root_path(role: "admin"), notice: "Đã xóa tài khoản #{user.email}!"
      else
        redirect_to root_path(role: "admin"),
          alert: "Không thể xóa #{user.email} vì tài khoản này đã có khóa học hoặc buổi dạy. Hãy chuyển sang \"Ngừng hoạt động\" để giữ lại lịch sử."
      end
    end

    private

    def submitted_roles
      Array(params[:roles]).flatten.map { |role| role.to_s.strip.downcase }.select { |role| User::ROLES.include?(role) }.uniq.join(",")
    end
  end
end
