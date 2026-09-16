# frozen_string_literal: true

require "test_helper"
class SchedulesControllerTest < ActionDispatch::IntegrationTest
  setup { sign_in users(:one) }

  test "has authenticate_user callback configured" do
    assert SchedulesController._process_action_callbacks.any? { |c| c.filter == :authenticate_user! }
  end

  test "redirects to sign in when not authenticated" do
    sign_out :user

    get root_url

    assert_redirected_to new_user_session_path
  end

  test "gets scheduler index when authenticated" do
    get root_url, params: {
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    }

    assert_response :success
    assert_includes response.body, "scheduler/index"
  end

  test "localhost redirect preserves scheduler query params" do
    host! "127.0.0.1"

    get root_path, params: {
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    }

    assert_response :redirect
    location = URI.parse(response.location)
    query_params = Rack::Utils.parse_nested_query(location.query)

    assert_equal "localhost", location.host
    assert_equal "teacher", query_params.fetch("role")
    assert_equal people(:ha_teacher).id.to_s, query_params.fetch("person_id")
    assert_equal people(:ha_teacher).id.to_s, query_params.fetch("teacher_id")
    assert_equal "2026-08", query_params.fetch("month_key")
    assert_equal "Tuần 3", query_params.fetch("week_name")
  end

  test "defaults to first active teacher" do
    get root_url

    assert_response :success
    assert_includes response.body, "scheduler/index"
    assert_equal Person.active.teachers.order(:name).first!.id, inertia_props.fetch("selected").fetch("teacherId")
  end

  test "defaults an invalid month key to the current month" do
    [ "invalid", "2026-13" ].each do |month_key|
      get root_url, params: { month_key: month_key }

      assert_response :success
      assert_equal Time.zone.today.strftime("%Y-%m"), inertia_props.fetch("selected").fetch("monthKey")
    end
  end

  test "defaults an array month key to the current month" do
    get root_url, params: { month_key: [ "2026-08" ] }

    assert_response :success
    assert_equal Time.zone.today.strftime("%Y-%m"), inertia_props.fetch("selected").fetch("monthKey")
  end

  test "renders scheduler snapshot props with frontend camel case keys" do
    get root_url, params: {
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    }

    assert_response :success

    assert_equal "2026-08-10", inertia_props.fetch("weekDays").first.fetch("isoDate")
    assert_equal "07:00", inertia_props.fetch("teacherAvailabilities").first.fetch("startTime")
    assert_equal "08:00", inertia_props.fetch("lessonSessions").first.fetch("startTime")
    assert_equal "Hà", inertia_props.fetch("lessonSessions").first.fetch("teacherName")
    assert_equal "https://meet.google.com/minh-writing", inertia_props.fetch("lessonSessions").first.fetch("enrollment").fetch("meetLink")
    assert_equal 1, inertia_props.fetch("monthSummary").fetch("totalCa")
    assert_equal "Tuần 1", inertia_props.fetch("weeklyKpis").first.fetch("week")
    assert_equal 28, inertia_props.fetch("people").fetch("teachers").first.fetch("weeklyAvailabilityTarget")
    assert_equal "HV001", inertia_props.fetch("studentTracking").first.fetch("studentCode")
  end

  test "accepts frontend camel case scheduler query params" do
    get root_url, params: {
      role: "teacher",
      personId: people(:ha_teacher).id,
      teacherId: people(:ha_teacher).id,
      monthKey: "2026-08",
      weekName: "Tuần 1"
    }

    assert_response :success
    assert_equal "Tuần 1", inertia_props.fetch("selected").fetch("weekName")
    assert_equal "2026-07-27", inertia_props.fetch("weekDays").first.fetch("isoDate")
  end

  private

  def inertia_props
    page = response.body.match(/<script data-page="app" type="application\/json">(.*?)<\/script>/m).captures.first

    JSON.parse(page).fetch("props")
  end
end
