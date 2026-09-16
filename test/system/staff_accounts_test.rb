# frozen_string_literal: true

require "application_system_test_case"

class StaffAccountsTest < ApplicationSystemTestCase
  # A fresh headless browser swallows native clicks on its first admin page, so load one up front.
  setup do
    sign_in_as users(:one)
    visit root_path(role: "admin")
    assert_text "Cổng Quản Trị Admin"
    Capybara.reset_sessions!
  end

  test "admin creates a staff account with only name, gmail and roles" do
    sign_in_as users(:one)
    open_account_management

    assert_no_text "Nhân sự liên kết"
    click_on "Thêm tài khoản mới"

    within("[role=dialog]") do
      assert_no_text "Gắn với Nhân sự"
      fill_in "Họ và tên *", with: "Giáo Viên Thử"
      fill_in "Gmail đăng nhập *", with: "gvthu@gmail.com"
      click_on "Tạo tài khoản"
    end

    within("tr", text: "gvthu@gmail.com") do
      assert_text "Giáo Viên Thử"
      assert_text "Đang hoạt động"
    end
    assert_equal "teacher", User.find_by!(email: "gvthu@gmail.com").roles
  end

  test "admin deactivates a staff account and it can no longer sign in" do
    sign_in_as users(:one)
    open_account_management

    within("tr", text: "giang_teacher@example.com") { click_on "Sửa" }
    within("[role=dialog]") do
      click_on "Ngừng hoạt động"
      click_on "Lưu thay đổi"
    end

    within("tr", text: "giang_teacher@example.com") { assert_text "Ngừng hoạt động" }
    assert_not users(:giang_teacher).reload.active?

    Capybara.using_session(:deactivated_teacher) do
      sign_in_as users(:giang_teacher)
      assert_current_path new_user_session_path
      assert_no_text "Lịch Dạy"
    end
  end

  test "a teacher only ever sees their own students" do
    sign_in_as users(:ha_teacher)
    visit root_path(month_key: "2026-08", week_name: "Tuần 3")
    click_on "👥 Học Viên"
    assert_text "Nguyễn Văn Minh"

    newcomer = User.create!(name: "Test Giáo Viên", email: "newcomer@example.com", password: "password123", roles: "teacher")
    Capybara.using_session(:newcomer) do
      sign_in_as newcomer
      visit root_path(month_key: "2026-08", week_name: "Tuần 3", teacher_id: users(:ha_teacher).id, person_id: users(:ha_teacher).id)
      assert_text "Test Giáo Viên"
      click_on "👥 Học Viên"
      assert_no_text "Nguyễn Văn Minh"
    end
  end

  private

  def open_account_management
    visit root_path(role: "admin")
    assert_text "Cổng Quản Trị Admin"
    click_on "👥 Quản Lý Tài Khoản"
    assert_text "Quản lý Tài khoản & Phân quyền"
  end
end
