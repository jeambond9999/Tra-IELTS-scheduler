# frozen_string_literal: true

require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]

  def sign_in_as(user, password: "password123")
    visit new_user_session_path
    fill_in "Email đăng nhập", with: user.email
    fill_in "Mật khẩu", with: password
    click_button "Đăng nhập"
  end
end
