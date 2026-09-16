# frozen_string_literal: true

# == Schema Information
#
# Table name: people
# Database name: primary
#
#  id                         :bigint           not null, primary key
#  active                     :boolean          default(TRUE), not null
#  name                       :string           not null
#  role                       :string           not null
#  weekly_availability_target :integer
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#
# Indexes
#
#  index_people_on_role_and_name  (role,name) UNIQUE
#
class Person < ApplicationRecord
  DEFAULT_WEEKLY_AVAILABILITY_TARGET = 28

  enum :role, { teacher: "teacher", sales: "sales", cs: "cs" }, validate: true

  attribute :weekly_availability_target, :integer, default: DEFAULT_WEEKLY_AVAILABILITY_TARGET

  has_many :teacher_enrollments, class_name: "Enrollment", foreign_key: :teacher_id, dependent: :restrict_with_error, inverse_of: :teacher
  has_many :sales_enrollments, class_name: "Enrollment", foreign_key: :sales_id, dependent: :restrict_with_error, inverse_of: :sales
  has_many :lesson_sessions, foreign_key: :teacher_id, dependent: :restrict_with_error, inverse_of: :teacher
  has_many :teacher_availabilities, foreign_key: :teacher_id, dependent: :destroy, inverse_of: :teacher

  before_validation :default_weekly_availability_target

  validates :name, presence: true, uniqueness: { scope: :role }
  validates :active, inclusion: { in: [ true, false ] }
  validates :weekly_availability_target, numericality: { only_integer: true, greater_than: 0 }

  scope :active, -> { where(active: true) }
  scope :teachers, -> { where(role: :teacher) }
  scope :sales_people, -> { where(role: :sales) }
  scope :cs_people, -> { where(role: :cs) }

  def weekly_availability_target
    super || DEFAULT_WEEKLY_AVAILABILITY_TARGET
  end

  private

  def default_weekly_availability_target
    self.weekly_availability_target ||= DEFAULT_WEEKLY_AVAILABILITY_TARGET
  end
end
