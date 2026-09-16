# frozen_string_literal: true

module ScheduleTimeRange
  extend ActiveSupport::Concern

  included do
    validate :end_time_after_start_time
  end

  def save(**options)
    with_schedule_conflict_handling { super }
  end

  def save!(**options)
    return true if with_schedule_conflict_handling { super }

    raise ActiveRecord::RecordInvalid, self
  end

  private

  def end_time_after_start_time
    return if start_time.blank? || end_time.blank?
    return if end_time > start_time

    errors.add(:end_time, "must be after start time")
  end

  def overlapping_time_range?(scope, date_column:, date_value:)
    return false if teacher_id.blank? || date_value.blank? || start_time.blank? || end_time.blank?

    scope
      .where(teacher_id: teacher_id, date_column => date_value)
      .where.not(id: id)
      .where("start_time < ? AND end_time > ?", end_time, start_time)
      .exists?
  end

  def with_schedule_conflict_handling
    self.class.transaction(requires_new: true) { yield }
  rescue ActiveRecord::StatementInvalid => error
    if defined?(PG::ExclusionViolation) && error.cause.is_a?(PG::ExclusionViolation)
      errors.add(:base, "Khung giờ này đã có lịch.")
      false
    else
      raise
    end
  end
end
