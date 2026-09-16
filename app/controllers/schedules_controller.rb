# frozen_string_literal: true

class SchedulesController < InertiaController
  before_action :authenticate_user!

  def index
    is_all_teachers = all_teachers_selected?
    selected_teacher = selected_teacher_from_params
    snapshot = Schedules::CalendarSnapshot.new(
      month_key: selected_month_key,
      week_name: selected_week_name,
      selected_teacher_id: is_all_teachers ? "all" : selected_teacher&.id
    ).to_h

    week_days = snapshot.fetch(:week_days)
    week_dates = week_days.map { |d| Date.iso8601(d[:iso_date]) }
    all_week_availabilities = TeacherAvailability.includes(:teacher).where(available_on: week_dates).order(:available_on, :start_time)
    all_week_lessons = LessonSession.includes(:teacher, enrollment: [:student, :teacher, lesson_sessions: :teacher]).where(scheduled_on: week_dates).order(:scheduled_on, :start_time)

    render inertia: "scheduler/index", props: {
      people: people_props,
      selected: {
        role: selected_role,
        personId: selected_person_id,
        teacherId: is_all_teachers ? "all" : selected_teacher&.id,
        monthKey: selected_month_key,
        weekName: selected_week_name
      },
      timeIntervals: Schedules::Calendar::TIME_INTERVALS,
      weeks: Schedules::Calendar::WEEKS,
      weekDays: camelize_props(week_days),
      teacherAvailabilities: TeacherAvailabilitySerializer.many(snapshot.fetch(:teacher_availabilities)),
      lessonSessions: LessonSessionSerializer.many(snapshot.fetch(:lesson_sessions)),
      allWeekAvailabilities: TeacherAvailabilitySerializer.many(all_week_availabilities),
      allWeekLessons: LessonSessionSerializer.many(all_week_lessons),
      weekSummary: camelize_props(snapshot.fetch(:week_summary)),
      monthSummary: camelize_props(snapshot.fetch(:month_summary)),
      weeklyKpis: camelize_props(snapshot.fetch(:weekly_kpis)),
      monthLessonSessions: LessonSessionSerializer.many(snapshot.fetch(:month_lessons, [])),
      monthAvailabilities: TeacherAvailabilitySerializer.many(snapshot.fetch(:month_availabilities, [])),
      studentTracking: camelize_props(snapshot.fetch(:student_tracking)),
      csReservationReminders: camelize_props(snapshot.fetch(:cs_reservation_reminders)),
      adminStats: camelize_props(admin_stats),
      adminUsers: current_user&.admin? ? UserSerializer.many(User.order(:id)) : [],
      enrollments: EnrollmentSerializer.many(Enrollment.includes(:student, :teacher, lesson_sessions: :teacher).order(created_at: :desc))
    }
  end

  private

  def camelize_props(value)
    case value
    when Array
      value.map { |entry| camelize_props(entry) }
    when Hash
      value.transform_keys { |key| key.to_s.camelize(:lower) }.transform_values { |entry| camelize_props(entry) }
    else
      value
    end
  end

  def people_props
    {
      teachers: StaffMemberSerializer.many(User.active.teachers.order(:name), role: "teacher"),
      sales: StaffMemberSerializer.many(User.active.sales_people.order(:name), role: "sales"),
      cs: StaffMemberSerializer.many(User.active.cs_people.order(:name), role: "cs")
    }
  end

  def admin_stats
    return [] if locked_to_own_teacher_data?

    User.active.teachers.order(:name).map do |teacher|
      snapshot = Schedules::CalendarSnapshot.new(
        month_key: selected_month_key,
        week_name: selected_week_name,
        selected_teacher_id: teacher.id
      )
      summary       = snapshot.send(:month_summary)
      tracking      = snapshot.send(:student_tracking)
      month_lessons = snapshot.send(:month_lessons)

      {
        teacher_id:         teacher.id,
        teacher_name:       teacher.name,
        month_summary:      summary,
        student_count:      tracking.length,
        almost_end_count:   tracking.count { |s| s[:almost_end] },
        student_tracking:   tracking,
        month_lessons:      LessonSessionSerializer.many(month_lessons)
      }
    end
  end

  def locked_to_own_teacher_data?
    current_user.teacher? && !current_user.pure_admin?
  end

  def all_teachers_selected?
    return false if locked_to_own_teacher_data?

    param = navigation_param(:teacher_id, :teacherId)
    param.to_s == "all" || (selected_role == "cs" && param.blank?)
  end

  def selected_teacher_from_params
    return nil if all_teachers_selected?
    return current_user if locked_to_own_teacher_data?

    @selected_teacher_from_params ||= User.active.teachers.find_by(id: navigation_param(:teacher_id, :teacherId)) || User.active.teachers.order(:name).first
  end

  def selected_role
    allowed = allowed_roles_for_current_user
    requested = params[:role].to_s
    if allowed.include?(requested)
      requested
    else
      allowed.first || "teacher"
    end
  end

  def allowed_roles_for_current_user
    return %w[teacher sales cs admin] if current_user.nil?
    return %w[admin teacher sales cs] if current_user.pure_admin?

    valid_roles = %w[teacher sales cs admin]
    allowed = []
    current_user.roles_list.each do |r|
      allowed << r if valid_roles.include?(r) && !allowed.include?(r)
    end
    allowed.presence || %w[teacher]
  end

  def default_person_for_role
    case selected_role
    when "cs" then User.active.cs_people.order(:name).first || User.active.teachers.order(:name).first
    when "sales" then User.active.sales_people.order(:name).first || User.active.teachers.order(:name).first
    else User.active.teachers.order(:name).first
    end
  end

  # Only a pure admin may browse another staff member's view; everyone else always sees their own.
  def selected_person_id
    return current_user.id unless current_user.pure_admin? || selected_role == "admin"

    navigation_param(:person_id, :personId).presence || default_person_for_role&.id
  end

  def selected_month_key
    month_key = navigation_param(:month_key, :monthKey).presence
    return Time.zone.today.strftime("%Y-%m") unless valid_month_key?(month_key)

    month_key
  end

  def valid_month_key?(month_key)
    return false unless month_key.is_a?(String) && month_key.match?(/\A\d{4}-\d{2}\z/)

    Date.new(*month_key.split("-").map(&:to_i))
    true
  rescue ArgumentError
    false
  end

  def selected_week_name
    navigation_param(:week_name, :weekName).presence_in(Schedules::Calendar::WEEKS) || Schedules::Calendar.week_name(Time.zone.today)
  end

  def navigation_param(*keys)
    keys.lazy.map { |key| params[key] }.find(&:present?)
  end
end
