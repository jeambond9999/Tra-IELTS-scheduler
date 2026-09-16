# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  avatar_url             :string
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  name                   :string
#  provider               :string
#  remember_created_at    :datetime
#  reset_password_sent_at :datetime
#  reset_password_token   :string
#  uid                    :string
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#
# Indexes
#
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_provider_and_uid      (provider,uid) UNIQUE
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#
class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [ :google_oauth2 ]

  belongs_to :person, optional: true
  has_many :items, dependent: :destroy

  def roles_list
    (roles.presence || "teacher").split(",").map(&:strip).map(&:downcase)
  end

  def admin?
    roles_list.include?("admin")
  end

  def is_admin
    admin?
  end

  def pure_admin?
    roles_list == ["admin"]
  end

  def is_pure_admin
    pure_admin?
  end

  def teacher?
    roles_list.include?("teacher")
  end

  def sales?
    roles_list.include?("sales")
  end

  def cs?
    roles_list.include?("cs")
  end

  def has_role?(target_role)
    roles_list.include?(target_role.to_s.downcase)
  end

  def person_name
    person&.name
  end

  # Google sign-in never creates a new account. An Admin must first create the
  # User record (with the matching email) from the "Quản Lý Tài Khoản" tab, then
  # that person can sign in with the same Gmail address. This links the Google
  # identity to the pre-provisioned account on first sign-in.
  def self.from_omniauth(auth)
    existing_by_provider = find_by(provider: auth.provider, uid: auth.uid)
    return existing_by_provider if existing_by_provider

    invited = find_by(email: auth.info.email.to_s.strip.downcase)
    return nil unless invited

    invited.update(provider: auth.provider, uid: auth.uid, avatar_url: auth.info.image.presence || invited.avatar_url)
    invited
  end
end
