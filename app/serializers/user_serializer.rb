# frozen_string_literal: true

# == Schema Information
#
# Table name: users
# Database name: primary
#
#  id                         :bigint           not null, primary key
#  active                     :boolean          default(TRUE), not null
#  avatar_url                 :string
#  email                      :string           default(""), not null
#  encrypted_password         :string           default(""), not null
#  name                       :string
#  provider                   :string
#  remember_created_at        :datetime
#  reset_password_sent_at     :datetime
#  reset_password_token       :string
#  roles                      :string           default("teacher"), not null
#  uid                        :string
#  weekly_availability_target :integer
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#
# Indexes
#
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_provider_and_uid      (provider,uid) UNIQUE
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#
class UserSerializer < BaseSerializer
  object_as :user, model: "User"

  attributes :id, :name, :email, :avatar_url, :roles, :roles_list, :active, :is_admin, :is_pure_admin

  def roles_list
    user.roles_list
  end

  def is_admin
    user.admin?
  end

  def is_pure_admin
    user.pure_admin?
  end
end
