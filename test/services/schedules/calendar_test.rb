# frozen_string_literal: true

require "test_helper"

class Schedules::CalendarTest < ActiveSupport::TestCase
  test "calculates end time" do
    assert_equal "08:40", Schedules::Calendar.end_time("08:00", 40)
  end

  test "builds Monday based week days for August 2026 week 2" do
    days = Schedules::Calendar.week_days(month_key: "2026-08", week_name: "Tuần 2")

    assert_equal "2026-08-03", days.first.fetch(:iso_date)
    assert_equal "Thứ 2 (03/08)", days.first.fetch(:header_label)
    assert_equal "2026-08-09", days.last.fetch(:iso_date)
  end

  test "keeps days before the first Monday in week 1 and names August 10 week 3" do
    assert_equal "Tuần 1", Schedules::Calendar.week_name(Date.new(2026, 8, 1))
    assert_equal "Tuần 1", Schedules::Calendar.week_name(Date.new(2026, 8, 2))
    assert_equal "Tuần 3", Schedules::Calendar.week_name(Date.new(2026, 8, 10))
  end
end
