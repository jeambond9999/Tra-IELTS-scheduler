# frozen_string_literal: true

require "test_helper"

class TeachersControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in users(:one) }

  test "updates weekly availability target and preserves scheduler redirect params" do
    teacher = people(:ha_teacher)

    patch teacher_url(teacher), params: {
      person: { weekly_availability_target: 24 },
      role: "teacher",
      person_id: teacher.id,
      teacher_id: teacher.id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    }

    assert_redirected_to root_url(
      role: "teacher",
      person_id: teacher.id,
      teacher_id: teacher.id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )
    assert_equal 24, teacher.reload.weekly_availability_target
  end

  test "rejects invalid weekly availability target" do
    teacher = people(:ha_teacher)

    patch teacher_url(teacher), params: {
      person: { weekly_availability_target: 0 },
      role: "teacher",
      person_id: teacher.id,
      teacher_id: teacher.id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    }

    assert_redirected_to root_url(
      role: "teacher",
      person_id: teacher.id,
      teacher_id: teacher.id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )
    assert_equal 28, teacher.reload.weekly_availability_target
  end

  test "allows teacher to update their own weekly availability target" do
    sign_in users(:two)
    teacher = people(:ha_teacher)

    patch teacher_url(teacher), params: { person: { weekly_availability_target: 24 } }

    assert_equal 24, teacher.reload.weekly_availability_target
  end

  test "rejects sales from updating weekly availability target" do
    sign_in users(:three)
    teacher = people(:ha_teacher)

    patch teacher_url(teacher), params: { person: { weekly_availability_target: 24 } }

    assert_redirected_to root_path
    assert_equal 28, teacher.reload.weekly_availability_target
  end
end
