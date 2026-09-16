# frozen_string_literal: true

# == Schema Information
#
# Table name: teacher_availabilities
# Database name: primary
#
#  id               :bigint           not null, primary key
#  available_on     :date             not null
#  duration_minutes :integer          not null
#  end_time         :time             not null
#  start_time       :time             not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  teacher_id       :bigint           not null
#
# Indexes
#
#  index_availability_on_teacher_date_time        (teacher_id,available_on,start_time,end_time)
#  index_teacher_availabilities_on_teacher_id     (teacher_id)
#  teacher_availabilities_teacher_time_exclusion  (teacher_id, tsrange((available_on + start_time), (available_on + end_time), '[)'::text)) USING gist
#
# Foreign Keys
#
#  fk_rails_...  (teacher_id => users.id)
#
class TeacherAvailability < ApplicationRecord
  include ScheduleTimeRange

  belongs_to :teacher, class_name: "User"

  validates :available_on, :start_time, :end_time, presence: true
  validates :duration_minutes, inclusion: { in: [ 20, 40, 60, 80 ] }
  validate :teacher_role
  validate :no_availability_overlap

  private

  def teacher_role
    return if teacher&.teacher?

    errors.add(:teacher, "must be a teacher")
  end

  def no_availability_overlap
    return if teacher_id.blank? || available_on.blank? || start_time.blank? || end_time.blank?

    return unless overlapping_time_range?(TeacherAvailability.all, date_column: :available_on, date_value: available_on)

    t_start = start_time.respond_to?(:strftime) ? start_time.strftime("%H:%M") : start_time.to_s
    errors.add(:base, "Khung giờ #{t_start} ngày #{available_on.strftime('%d/%m/%Y')} đã có ca rảnh khác.")
  end
end
