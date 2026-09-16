# frozen_string_literal: true

require "test_helper"

class ItemsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @item = items(:one)
    @other_user_item = items(:three)
  end

  # Unauthenticated tests
  test "should redirect to login when not authenticated for index" do
    get items_url
    assert_response :redirect
  end

  test "should redirect to login when not authenticated for new" do
    get new_item_url
    assert_response :redirect
  end

  test "should redirect to login when not authenticated for create" do
    post items_url, params: { item: { name: "New Item" } }
    assert_response :redirect
  end

  # Authenticated tests
  test "should get index" do
    sign_in @user
    get items_url
    assert_response :success
  end

  test "should get new" do
    sign_in @user
    get new_item_url
    assert_response :success
  end

  test "should create item" do
    sign_in @user
    assert_difference("Item.count") do
      post items_url, params: { item: { name: "New Item", description: "Description" } }
    end
    assert_redirected_to items_path
  end

  test "should not create item without name" do
    sign_in @user
    assert_no_difference("Item.count") do
      post items_url, params: { item: { name: "", description: "Description" } }
    end
    assert_redirected_to new_item_path
  end

  test "should show item" do
    sign_in @user
    get item_url(@item)
    assert_response :success
  end

  test "should not show other user item" do
    sign_in @user
    get item_url(@other_user_item)
    assert_response :not_found
  end

  test "should get edit" do
    sign_in @user
    get edit_item_url(@item)
    assert_response :success
  end

  test "should not edit other user item" do
    sign_in @user
    get edit_item_url(@other_user_item)
    assert_response :not_found
  end

  test "should update item" do
    sign_in @user
    patch item_url(@item), params: { item: { name: "Updated Name" } }
    assert_redirected_to items_path
    @item.reload
    assert_equal "Updated Name", @item.name
  end

  test "should not update other user item" do
    sign_in @user
    patch item_url(@other_user_item), params: { item: { name: "Hacked" } }
    assert_response :not_found
  end

  test "should destroy item" do
    sign_in @user
    assert_difference("Item.count", -1) do
      delete item_url(@item)
    end
    assert_redirected_to items_path
  end

  test "should not destroy other user item" do
    sign_in @user
    delete item_url(@other_user_item)
    assert_response :not_found
  end

  test "items should be scoped to current user" do
    sign_in @user
    get items_url
    assert_response :success
    # User one should only see their items (one and two), not user two's item (three)
  end
end
