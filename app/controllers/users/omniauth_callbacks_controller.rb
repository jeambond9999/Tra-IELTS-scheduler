# frozen_string_literal: true

class Users::OmniauthCallbacksController < Devise::OmniauthCallbacksController
  def google_oauth2
    @user = User.from_omniauth(request.env["omniauth.auth"])

    if @user
      flash[:notice] = I18n.t("devise.omniauth_callbacks.success", kind: "Google")
      sign_in_and_redirect @user, event: :authentication
    else
      redirect_to new_user_session_path, alert: "Tài khoản Google này chưa được cấp quyền truy cập. Vui lòng liên hệ Admin để được tạo tài khoản trước."
    end
  end

  def failure
    redirect_to root_path, alert: "Authentication failed, please try again."
  end
end
