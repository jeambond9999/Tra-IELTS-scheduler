# frozen_string_literal: true

# == Schema Information
#
# Table name: students
# Database name: primary
#
#  id           :bigint           not null, primary key
#  actual_score :string
#  aim          :string
#  aim_achieved :boolean
#  baseline     :string
#  code         :string           not null
#  exam_date    :string
#  exam_status  :string           default("chưa thi")
#  name         :string           not null
#  student_note :text
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#
# Indexes
#
#  index_students_on_code  (code) UNIQUE
#
class Student < ApplicationRecord
  has_many :enrollments, dependent: :restrict_with_error

  validates :name, presence: true
  validates :code, presence: true, uniqueness: true

  before_validation :strip_attributes

  CEFR_LEVELS = {
    "a1" => 1, "a2" => 2,
    "b1" => 3, "b2" => 4,
    "c1" => 5, "c2" => 6
  }.freeze

  def self.evaluate_aim(aim, actual_score)
    return nil if actual_score.blank?
    return nil if aim.blank?

    aim_str = aim.to_s.strip.downcase
    score_str = actual_score.to_s.strip.downcase

    aim_num = aim_str[/\d+(?:\.\d+)?/]&.to_f
    score_num = score_str[/\d+(?:\.\d+)?/]&.to_f

    if aim_num && score_num
      score_num >= aim_num
    elsif CEFR_LEVELS[aim_str] && CEFR_LEVELS[score_str]
      CEFR_LEVELS[score_str] >= CEFR_LEVELS[aim_str]
    else
      score_str.include?(aim_str)
    end
  end

  def self.extract_exam_date(note)
    return nil if note.blank?
    str = note.to_s

    # 1. Full date dd/mm/yyyy with exam context
    if str =~ /(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i
      return $1
    end

    # 2. Month and year e.g. "cuối t9/2026", "tháng 9/2026", "t10/2026", "thang 10-2026"
    if str =~ /(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(?:tháng|thang|t)\s*(\d{1,2})(?:[\/\-]|[- ](?:năm\s*)?)(\d{4})/i
      m = $1.to_i
      y = $2.to_i
      return sprintf("%02d/%04d", m, y)
    end

    # 3. Direct mm/yyyy after exam context: "thi 09/2026"
    if str =~ /(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(\d{1,2})\/(\d{4})/i
      m = $1.to_i
      y = $2.to_i
      if m >= 1 && m <= 12
        return sprintf("%02d/%04d", m, y)
      end
    end

    # 4. Month only with exam context: "thi vào cuối tháng 9" -> assume current or next year
    if str =~ /(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(?:tháng|thang|t)\s*(\d{1,2})(?!\d)/i
      m = $1.to_i
      if m >= 1 && m <= 12
        now = Date.current
        y = m < now.month - 2 ? now.year + 1 : now.year
        return sprintf("%02d/%04d", m, y)
      end
    end

    nil
  end

  def self.upcoming_exam?(val)
    return false if val.blank?

    if val.is_a?(Date) || val.is_a?(Time) || val.is_a?(DateTime)
      d = val.to_date
      diff_days = (d - Date.current).to_i
      return diff_days >= -7 && diff_days <= 90
    end

    str = val.to_s.strip.downcase
    now = Date.current
    cur_year = now.year
    cur_month = now.month

    if str =~ /\A(\d{4})-(\d{1,2})-(\d{1,2})\z/
      d = Date.new($1.to_i, $2.to_i, $3.to_i) rescue nil
      return false unless d
      diff_days = (d - now).to_i
      return diff_days >= -7 && diff_days <= 90
    elsif str =~ /\A(\d{1,2})\/(\d{1,2})\/(\d{4})\z/
      d = Date.new($3.to_i, $2.to_i, $1.to_i) rescue nil
      return false unless d
      diff_days = (d - now).to_i
      return diff_days >= -7 && diff_days <= 90
    elsif str =~ /\A(\d{1,2})\/(\d{4})\z/
      m = $1.to_i
      y = $2.to_i
      month_diff = (y - cur_year) * 12 + (m - cur_month)
      return month_diff >= -1 && month_diff <= 3
    elsif str =~ /\A(\d{4})-(\d{1,2})\z/
      y = $1.to_i
      m = $2.to_i
      month_diff = (y - cur_year) * 12 + (m - cur_month)
      return month_diff >= -1 && month_diff <= 3
    elsif str =~ /(?:tháng|thang|t)\s*(\d{1,2})(?:\/|[- ])?(\d{4})?/
      m = $1.to_i
      y = $2.present? ? $2.to_i : cur_year
      month_diff = (y - cur_year) * 12 + (m - cur_month)
      return month_diff >= -1 && month_diff <= 3
    end

    return false if str =~ /201\d|202[0-4]/
    true
  end

  def self.extract_aim(note)
    return nil if note.blank?
    if note.to_s =~ /aim:\s*([0-9\.\s\-+]+)/i
      val = $1.strip
      val.presence
    end
  end

  def self.extract_baseline(note)
    return nil if note.blank?
    if note.to_s =~ /(?:band đầu vào|đầu vào|baseline):\s*([0-9\.\s\-+]+)/i
      val = $1.strip
      val.presence
    end
  end

  def evaluate_aim_achieved
    self.class.evaluate_aim(aim, actual_score)
  end

  before_save :sync_aim_and_status

  private

  def sync_aim_and_status
    if student_note.present?
      if exam_date.blank?
        extracted = self.class.extract_exam_date(student_note)
        if extracted.present?
          col = self.class.columns_hash["exam_date"]
          if col&.type == :date
            if extracted =~ /\A(\d{1,2})\/(\d{4})\z/
              self.exam_date = Date.new($2.to_i, $1.to_i, 1) rescue nil
            end
          else
            self.exam_date = extracted
          end
        end
      end

      if aim.blank?
        extracted_aim = self.class.extract_aim(student_note)
        self.aim = extracted_aim if extracted_aim.present?
      end

      if baseline.blank?
        extracted_baseline = self.class.extract_baseline(student_note)
        self.baseline = extracted_baseline if extracted_baseline.present?
      end
    end

    if has_attribute?(:aim_achieved)
      self.aim_achieved = evaluate_aim_achieved
    end

    if has_attribute?(:exam_status)
      if actual_score.present? && (exam_status.blank? || exam_status == "chưa thi")
        self.exam_status = "đã thi"
      elsif (exam_status.blank? || exam_status == "chưa thi") && exam_date.present?
        self.exam_status = "sắp thi" if self.class.upcoming_exam?(exam_date)
      end
    end
  end

  def strip_attributes
    self.name = name.to_s.strip if name.present?
    self.code = code.to_s.strip if code.present?
  end
end
