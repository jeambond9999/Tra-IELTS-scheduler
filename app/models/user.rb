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
class User < ApplicationRecord
  ROLES = %w[teacher sales cs admin].freeze
  DEFAULT_WEEKLY_AVAILABILITY_TARGET = 28

  devise :database_authenticatable,
         :recoverable, :rememberable, :validatable,
         :omniauthable, omniauth_providers: [ :google_oauth2 ]

  has_many :teacher_enrollments, class_name: "Enrollment", foreign_key: :teacher_id, dependent: :restrict_with_error, inverse_of: :teacher
  has_many :sales_enrollments, class_name: "Enrollment", foreign_key: :sales_id, dependent: :restrict_with_error, inverse_of: :sales
  has_many :lesson_sessions, foreign_key: :teacher_id, dependent: :restrict_with_error, inverse_of: :teacher
  has_many :teacher_availabilities, foreign_key: :teacher_id, dependent: :destroy, inverse_of: :teacher
  has_many :items, dependent: :destroy

  validates :weekly_availability_target, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true

  scope :active, -> { where(active: true) }
  scope :with_role, ->(role) { where("',' || REPLACE(roles, ' ', '') || ',' LIKE ?", "%,#{role},%") }
  scope :teachers, -> { with_role("teacher") }
  scope :sales_people, -> { with_role("sales") }
  scope :cs_people, -> { with_role("cs") }

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
    roles_list == [ "admin" ]
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

  def weekly_availability_target
    super || DEFAULT_WEEKLY_AVAILABILITY_TARGET
  end

  def active_for_authentication?
    super && active?
  end

  def inactive_message
    active? ? super : :deactivated
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
