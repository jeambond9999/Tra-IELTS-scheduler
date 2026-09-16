# frozen_string_literal: true

require "test_helper"

class LegalControllerTest < ActionDispatch::IntegrationTest
  test "privacy policy is public and server-rendered" do
    get privacy_url

    assert_response :success
    assert_includes response.body, "Chính sách quyền riêng tư"
    assert_includes response.body, "Limited Use"
    assert_includes response.body, LegalController::CONTACT_EMAIL
  end

  test "terms of service is public and server-rendered" do
    get terms_url

    assert_response :success
    assert_includes response.body, "Điều khoản sử dụng"
  end

  test "pages are served to non-browser clients such as Google's verification fetcher" do
    get privacy_url, headers: { "User-Agent" => "Google-Site-Verification/1.0" }

    assert_response :success
  end
end
