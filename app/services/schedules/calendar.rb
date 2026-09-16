# frozen_string_literal: true

module Schedules
  module Calendar
    TIME_INTERVALS = %w[
      07:00 07:20 07:40
      08:00 08:20 08:40 09:00 09:20 09:40
      10:00 10:20 10:40 11:00 11:20 11:40
      12:00 12:20 12:40 13:00 13:20 13:40
      14:00 14:20 14:40 15:00 15:20 15:40
      16:00 16:20 16:40 17:00 17:20 17:40
      18:00 18:20 18:40 19:00 19:20 19:40
      20:00 20:20 20:40 21:00 21:20 21:40
      22:00 22:20 22:40
    ].freeze

    DAYS = [ "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật" ].freeze
    WEEKS = [ "Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5" ].freeze

    module_function

    def end_time(start_time, duration_minutes)
      time_str = if start_time.respond_to?(:strftime)
        start_time.strftime("%H:%M")
      else
        str = start_time.to_s.strip
        str.include?(" ") ? (str.split(" ")[1] || str) : str
      end
      hours, minutes = time_str.split(":").map(&:to_i)
      total_minutes = (hours * 60) + minutes + duration_minutes.to_i
      format("%02d:%02d", (total_minutes / 60) % 24, total_minutes % 60)
    end

    def month_key(date)
      date = Date.parse(date.to_s)
      date.strftime("%Y-%m")
    end

    def week_name(date)
      date = Date.parse(date.to_s)
      first_day = date.beginning_of_month
      first_monday = first_day - ((first_day.wday + 6) % 7)
      index = ((date - first_monday).to_i / 7).clamp(0, 4)
      WEEKS.fetch(index)
    end

    def week_days(month_key:, week_name:)
      year, month = month_key.split("-").map(&:to_i)
      first_day = Date.new(year, month, 1)
      first_monday = first_day - ((first_day.wday + 6) % 7)
      week_index = WEEKS.index(week_name) || 0
      monday = first_monday + (week_index * 7)

      DAYS.each_with_index.map do |day_name, index|
        date = monday + index
        {
          name: day_name,
          day_num: date.strftime("%d"),
          month_num: date.strftime("%m"),
          year_num: date.year,
          iso_date: date.iso8601,
          date_formatted: date.strftime("%d/%m"),
          header_label: "#{day_name} (#{date.strftime("%d/%m")})"
        }
      end
    end
  end
end
