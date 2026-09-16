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
require "test_helper"

class EnrollmentTest < ActiveSupport::TestCase
  test "requires teacher person to have teacher role" do
    enrollment = enrollments(:writing_minh)
    enrollment.teacher = people(:sales_nhien)

    assert_not enrollment.valid?
    assert_includes enrollment.errors[:teacher], "must be a teacher"
  end

  test "requires sales person to have sales role" do
    enrollment = enrollments(:writing_minh)
    enrollment.sales = people(:ha_teacher)

    assert_not enrollment.valid?
    assert_includes enrollment.errors[:sales], "must be sales"
  end
end
