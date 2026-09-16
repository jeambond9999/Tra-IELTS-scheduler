# frozen_string_literal: true

# == Schema Information
#
# Table name: enrollments
# Database name: primary
#
#  id                 :bigint           not null, primary key
#  active             :boolean          default(TRUE), not null
#  course_name        :string           not null
#  duration_minutes   :integer          not null
#  frequency_per_week :integer          not null
#  meet_link          :string           not null
#  payment_status     :string           default("Đã đóng Full"), not null
#  start_date         :date             not null
#  total_sessions     :integer          not null
#  tuition_note       :text
#  created_at         :datetime         not null
#  updated_at         :datetime         not null
#  sales_id           :bigint           not null
#  student_id         :bigint           not null
#  teacher_id         :bigint           not null
#
# Indexes
#
#  index_enrollments_on_sales_id    (sales_id)
#  index_enrollments_on_student_id  (student_id)
#  index_enrollments_on_teacher_id  (teacher_id)
#
# Foreign Keys
#
#  fk_rails_...  (sales_id => people.id)
#  fk_rails_...  (student_id => students.id)
#  fk_rails_...  (teacher_id => people.id)
#
class Enrollment < ApplicationRecord
  GOOGLE_MEET_LAUNCH_URL = "https://meet.google.com/new"

  belongs_to :student
  belongs_to :teacher, class_name: "Person"
  belongs_to :sales, class_name: "Person"

  has_many :lesson_sessions, dependent: :destroy

  validates :course_name, :meet_link, :start_date, presence: true
  validates :total_sessions, numericality: { only_integer: true, greater_than: 0 }
  validates :frequency_per_week, inclusion: { in: [ 1, 2 ] }
  validates :duration_minutes, numericality: { only_integer: true, greater_than_or_equal_to: 10, less_than_or_equal_to: 240 }
  validates :active, inclusion: { in: [ true, false ] }
  validate :teacher_role
  validate :sales_role

  def status
    has_attribute?(:status) ? (self[:status] || "active") : "active"
  end

  def reserved_from
    val = has_attribute?(:reserved_from) ? self[:reserved_from] : nil
    return nil if val.blank?
    val.is_a?(Date) ? val : (Date.parse(val.to_s) rescue nil)
  end

  def resume_date
    val = has_attribute?(:resume_date) ? self[:resume_date] : nil
    return nil if val.blank?
    val.is_a?(Date) ? val : (Date.parse(val.to_s) rescue nil)
  end

  def reservation_note
    has_attribute?(:reservation_note) ? self[:reservation_note] : nil
  end

  def pre_reservation_schedule
    has_attribute?(:pre_reservation_schedule) ? self[:pre_reservation_schedule] : nil
  end

  def reserved?
    status == "reserved" || reserved_from.present?
  end

  def reservation_days
    r_from = reserved_from
    return 0 unless r_from.present?

    (Date.current - r_from).to_i
  rescue
    0
  end

  def days_until_resume
    r_date = resume_date
    return nil unless r_date.present?

    (r_date - Date.current).to_i
  rescue
    nil
  end

  def reservation_overdue?
    reserved? && reservation_days > 60
  rescue
    false
  end

  def reservation_expiring_soon?
    return false unless reserved?

    (days_until_resume.present? && days_until_resume.between?(0, 7)) || reservation_days.between?(50, 60)
  rescue
    false
  end

  def recalculate_day_labels!
    sessions = lesson_sessions.order(scheduled_on: :asc, start_time: :asc).to_a
    return if sessions.empty?

    current_day = 1
    sessions.each do |session|
      is_session_double = session.duration_minutes >= 50 || session.day_label.to_s.include?("&") || session.day_label.to_s.include?("-")
      step = is_session_double ? 2 : 1

      end_day = [ current_day + step - 1, total_sessions ].min
      expected_label = if current_day == end_day
        "Day #{current_day}/#{total_sessions}"
      else
        "Day #{current_day} & #{end_day}/#{total_sessions}"
      end
      session.update_column(:day_label, expected_label) if session.day_label != expected_label
      current_day = end_day + 1
    end
  end

  private

  def teacher_role
    return if teacher&.teacher?

    errors.add(:teacher, "must be a teacher")
  end

  def sales_role
    return if sales&.sales?

    errors.add(:sales, "must be sales")
  end
end
