# frozen_string_literal: true

require "test_helper"

class Admin::UsersControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in users(:one) }

  test "creates a staff account that immediately appears in its role list" do
    assert_difference("User.count", 1) do
      post admin_users_url, params: {
        name: "Giáo Viên Mới",
        email: "Newbie@Gmail.com",
        password: "TraIELTS@123",
        roles: [ "teacher" ]
      }
    end

    created = User.find_by!(email: "newbie@gmail.com")
    assert_equal "teacher", created.roles
    assert_includes User.active.teachers, created
  end

  test "refuses to create an account without any valid role" do
    assert_no_difference("User.count") do
      post admin_users_url, params: { name: "No Role", email: "norole@gmail.com", password: "TraIELTS@123", roles: [ "superuser" ] }
    end

    assert_equal "Vui lòng chọn ít nhất 1 vai trò cho tài khoản.", flash[:alert]
  end

  test "deactivates a staff account" do
    patch admin_user_url(users(:giang_teacher)), params: { active: false }

    assert_not users(:giang_teacher).reload.active?
  end

  test "admin cannot deactivate their own account" do
    patch admin_user_url(users(:one)), params: { active: false }

    assert users(:one).reload.active?
  end

  test "refuses to delete staff who already have lessons" do
    assert_no_difference("User.count") do
      delete admin_user_url(users(:ha_teacher))
    end

    assert_match(/Ngừng hoạt động/, flash[:alert])
  end

  test "rejects non-admins" do
    sign_in users(:sales_nhien)

    assert_no_difference("User.count") do
      post admin_users_url, params: { name: "X", email: "x@gmail.com", password: "TraIELTS@123", roles: [ "admin" ] }
    end
  end
end
