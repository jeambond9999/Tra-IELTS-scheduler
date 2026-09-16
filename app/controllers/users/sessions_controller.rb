# frozen_string_literal: true

class Users::SessionsController < Devise::SessionsController
  def new
    render inertia: "auth/login", props: {
      alert: flash[:alert],
      notice: flash[:notice]
    }
  end

  def create
    self.resource = warden.authenticate(auth_options)
    if resource
      set_flash_message!(:notice, :signed_in)
      sign_in(resource_name, resource)
      yield resource if block_given?
      redirect_to after_sign_in_path_for(resource)
    else
      redirect_to new_user_session_path, alert: "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!"
    end
  end

  def destroy
    signed_out = (Devise.sign_out_all_scopes ? sign_out : sign_out(resource_name))
    flash[:notice] = "Đã đăng xuất thành công." if signed_out
    redirect_to new_user_session_path
  end
end
