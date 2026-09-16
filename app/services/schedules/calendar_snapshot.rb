# frozen_string_literal: true

module Schedules
  class CalendarSnapshot
    def initialize(month_key:, week_name:, selected_teacher_id:)
      @month_key = month_key
      @week_name = week_name
      @selected_teacher_id = selected_teacher_id
    end

    def self.lesson_reconciled?(lesson)
      lesson.cs_status == "completed" && lesson.lesson_status == "completed"
    end

    def to_h
      {
        selected_teacher: selected_teacher,
        week_days: week_days,
        teacher_availabilities: teacher_availabilities.to_a,
        month_availabilities: month_availabilities.to_a,
        lesson_sessions: lesson_sessions.to_a,
        month_lessons: month_lessons.to_a,
        week_summary: week_summary,
        month_summary: month_summary,
        weekly_kpis: weekly_kpis,
        student_tracking: student_tracking,
        cs_reservation_reminders: cs_reservation_reminders
      }
    end

    private

    attr_reader :month_key, :week_name, :selected_teacher_id

    def cs_reservation_reminders
      today = Date.current

      items = begin
        if Enrollment.column_names.include?("status") || Enrollment.column_names.include?("reserved_from")
          reserved_enrollments = Enrollment.includes(:student, :teacher).where("status = 'reserved' OR reserved_from IS NOT NULL").order(reserved_from: :asc)
          reserved_enrollments.map do |enr|
            student = enr.student
            next unless student.present?

            res_days = enr.reservation_days
            days_to_resume = enr.days_until_resume
            is_overdue = enr.reservation_overdue?
            is_expiring = enr.reservation_expiring_soon?
            rf = enr.reserved_from
            rd = enr.resume_date

            {
              enrollment_id: enr.id,
              student_id: student.id,
              student_name: student.name,
              student_code: student.code,
              course: enr.course_name,
              teacher_name: enr.teacher&.name,
              reserved_from: rf.respond_to?(:iso8601) ? rf.iso8601 : rf&.to_s,
              resume_date: rd.respond_to?(:iso8601) ? rd.iso8601 : rd&.to_s,
              reservation_note: enr.reservation_note,
              pre_reservation_schedule: enr.pre_reservation_schedule,
              reservation_days: res_days,
              days_until_resume: days_to_resume,
              is_overdue: is_overdue,
              is_expiring_soon: is_expiring
            }
          end.compact
        else
          []
        end
      rescue => e
        []
      end

      {
        total_reserved: items.length,
        overdue_count: items.count { |i| i[:is_overdue] },
        expiring_soon_count: items.count { |i| i[:is_expiring_soon] },
        items: items
      }
    end

    def all_teachers?
      selected_teacher_id.to_s == "all" || selected_teacher_id.blank?
    end

    def selected_teacher
      return nil if all_teachers?
      @selected_teacher ||= Person.teachers.find_by(id: selected_teacher_id) || Person.teachers.first || Person.first
    end

    def week_days
      @week_days ||= Calendar.week_days(month_key: month_key, week_name: week_name)
    end

    def week_dates
      @week_dates ||= week_days.map { |day| Date.iso8601(day.fetch(:iso_date)) }
    end

    def month_range
      @month_range ||= begin
        year, month = month_key.split("-").map(&:to_i)
        start_date = Date.new(year, month, 1)
        first_monday = start_date - ((start_date.wday + 6) % 7)
        last_sunday = first_monday + (5 * 7) - 1

        range_start = [ first_monday, start_date.beginning_of_month ].min
        range_end = [ last_sunday, start_date.end_of_month ].max
        range_start..range_end
      end
    end

    def teacher_availabilities
      @teacher_availabilities ||= begin
        rel = TeacherAvailability.includes(:teacher).where(available_on: week_dates)
        rel = rel.where(teacher: selected_teacher) unless all_teachers?
        rel.order(:available_on, :start_time)
      end
    end

    def lesson_sessions
      @lesson_sessions ||= begin
        rel = LessonSession
          .includes(:teacher, enrollment: [ :student, :teacher, lesson_sessions: :teacher ])
          .where(scheduled_on: week_dates)
        rel = rel.where(teacher: selected_teacher) unless all_teachers?
        rel.order(:scheduled_on, :start_time)
      end
    end

    def month_availabilities
      @month_availabilities ||= begin
        rel = TeacherAvailability.where(available_on: month_range)
        rel = rel.where(teacher: selected_teacher) unless all_teachers?
        rel.order(:available_on, :start_time)
      end
    end

    def month_lessons
      @month_lessons ||= begin
        rel = LessonSession
          .includes(:teacher, enrollment: [ :student, :teacher, lesson_sessions: :teacher ])
          .where(scheduled_on: month_range)
        rel = rel.where(teacher: selected_teacher) unless all_teachers?
        rel
      end
    end

    def week_summary
      available_ca = ca_from_availability(teacher_availabilities)
      booked_ca = ca_from_lessons(lesson_sessions)
      completed_ca = ca_from_lessons(lesson_sessions.select { |lesson| CalendarSnapshot.lesson_reconciled?(lesson) })
      total_ca = available_ca

      {
        available_ca: available_ca,
        booked_ca: booked_ca,
        completed_ca: completed_ca,
        total_ca: total_ca,
        fill_rate_percentage: total_ca.positive? ? ((booked_ca.to_f / total_ca) * 100).round : 0,
        done_rate_percentage: booked_ca.positive? ? ((completed_ca.to_f / booked_ca) * 100).round : 0
      }
    end

    def month_summary
      available_ca = ca_from_availability(month_availabilities)
      booked_ca = ca_from_lessons(month_lessons)
      completed_ca = ca_from_lessons(month_lessons.select { |lesson| CalendarSnapshot.lesson_reconciled?(lesson) })
      total_ca = available_ca
      commitment = all_teachers? ? (Person.active.teachers.count * 110) : 110

      {
        available_ca: available_ca,
        booked_ca: booked_ca,
        completed_ca: completed_ca,
        total_ca: total_ca,
        monthly_commitment: commitment,
        kpi_percentage: commitment.positive? && total_ca.positive? ? ((total_ca / commitment.to_f) * 100).round : 0,
        book_ratio_percentage: total_ca.positive? ? ((booked_ca.to_f / total_ca) * 100).round : 0,
        done_rate_percentage: booked_ca.positive? ? ((completed_ca.to_f / booked_ca) * 100).round : 0
      }
    end

    def weekly_kpis
      active_teachers = Person.active.teachers
      weeks = Calendar::WEEKS
      weeks.map.with_index do |week, idx|
        dates = Calendar.week_days(month_key: month_key, week_name: week).map { |day| Date.iso8601(day.fetch(:iso_date)) }
        is_last_week = (idx == weeks.length - 1)
        slots = month_availabilities.select do |slot|
          dates.include?(slot.available_on) || (is_last_week && slot.available_on > dates.last)
        end
        lessons = month_lessons.select do |lesson|
          dates.include?(lesson.scheduled_on) || (is_last_week && lesson.scheduled_on > dates.last)
        end
        available = ca_from_availability(slots)
        booked = ca_from_lessons(lessons)
        completed = ca_from_lessons(lessons.select { |lesson| CalendarSnapshot.lesson_reconciled?(lesson) })
        count = available
        target = all_teachers? ? active_teachers.sum { |t| t.weekly_availability_target.to_i } : (selected_teacher&.weekly_availability_target || 28)

        {
          week: week,
          count: count,
          available_ca: available,
          booked_ca: booked,
          completed_ca: completed,
          fill_rate: count.positive? ? ((booked.to_f / count) * 100).round : 0,
          done_rate: booked.positive? ? ((completed.to_f / booked) * 100).round : 0,
          target: target,
          pct: target.positive? ? ((count / target.to_f) * 100).round : 0
        }
      end
    end

    def student_tracking
      all_enrollments = if all_teachers?
        Enrollment.includes(:student, :teacher, lesson_sessions: :teacher).all.to_a
      else
        teacher_enrollments = Enrollment.includes(:student, :teacher, lesson_sessions: :teacher).where(teacher: selected_teacher).to_a
        session_enrollments = LessonSession
          .includes(:teacher, enrollment: [ :student, :teacher, lesson_sessions: :teacher ])
          .where(teacher: selected_teacher)
          .map(&:enrollment)
          .compact

        (teacher_enrollments + session_enrollments).uniq(&:id)
      end

      enrollment_sessions = LessonSession
        .includes(:teacher, enrollment: [ :student, :teacher, lesson_sessions: :teacher ])
        .where(enrollment: all_enrollments)
        .group_by(&:enrollment)

      today = Date.current

      # Find latest enrollment for each student
      latest_enrollment_ids_by_student = all_enrollments
        .group_by(&:student_id)
        .transform_values { |enrs| enrs.max_by(&:id)&.id }

      all_enrollments
        .sort_by { |e| [-e.id] }
        .map do |enrollment|
          sessions = enrollment_sessions[enrollment]
          student = enrollment.student
          next unless student.present?

          sorted_sessions = (sessions || []).sort_by { |s| [s.scheduled_on, s.start_time] }
          completed = sorted_sessions.select { |s| s.cs_status == "completed" || s.lesson_status == "completed" }
                                     .sum { |s| s.day_label.to_s.split("/").first.to_s.scan(/\d+/).length >= 2 ? 2 : 1 }
          total = enrollment.total_sessions.to_i.positive? ? enrollment.total_sessions.to_i : sorted_sessions.length
          remaining = [total - completed, 0].max

          is_reserved = enrollment.reserved?
          is_active_enrollment = enrollment.respond_to?(:active?) ? (enrollment.active != false) : true
          is_ended = !is_reserved && (!is_active_enrollment || (total.positive? && remaining == 0))
          is_active = !is_reserved && is_active_enrollment && remaining.positive?

          is_latest_course = (latest_enrollment_ids_by_student[enrollment.student_id] == enrollment.id)
          has_newer_course = !is_latest_course

          # Alert 'almost_end' ONLY for active latest course of the student when remaining is between 1 and 2
          almost_end = !is_reserved && is_latest_course && is_active && total.positive? && remaining <= 2

          res_days = enrollment.reservation_days
          days_to_resume = enrollment.days_until_resume
          is_overdue = enrollment.reservation_overdue?
          is_expiring = enrollment.reservation_expiring_soon?

          exam = student.exam_date
          if exam.blank? && student.student_note.present?
            extracted_exam = Student.extract_exam_date(student.student_note)
            exam = extracted_exam if extracted_exam.present?
          end

          rf = enrollment.reserved_from
          rd = enrollment.resume_date

          cur_exam_status = if student.respond_to?(:exam_status) && student.exam_status.present? && student.exam_status != "chưa thi"
            student.exam_status
          elsif student.respond_to?(:actual_score) && student.actual_score.present?
            "đã thi"
          elsif exam.present? && Student.upcoming_exam?(exam)
            "sắp thi"
          elsif student.respond_to?(:exam_status) && student.exam_status.present?
            student.exam_status
          else
            "chưa thi"
          end

          act_score = student.respond_to?(:actual_score) ? student.actual_score : nil
          eff_aim = student.aim.presence || (student.student_note.present? ? Student.extract_aim(student.student_note) : nil)
          eff_baseline = student.baseline.presence || (student.student_note.present? ? Student.extract_baseline(student.student_note) : nil)

          is_aim_achieved = if student.respond_to?(:aim_achieved) && !student.aim_achieved.nil?
            student.aim_achieved
          else
            Student.evaluate_aim(eff_aim, act_score)
          end

          {
            enrollment_id: enrollment.id,
            student_id: student.id,
            teacher_id: enrollment.teacher_id || selected_teacher&.id,
            teacher_name: enrollment.teacher&.name || selected_teacher&.name || "",
            student_name: student.name,
            student_code: student.code,
            course: enrollment.course_name,
            baseline: eff_baseline,
            aim: eff_aim,
            exam_date: exam.respond_to?(:iso8601) ? exam.iso8601 : exam&.to_s,
            student_note: student.student_note,
            exam_status: cur_exam_status,
            actual_score: act_score,
            aim_achieved: is_aim_achieved,
            payment_status: enrollment.payment_status,
            tuition_note: enrollment.tuition_note,
            active: is_active_enrollment,
            status: enrollment.status,
            is_reserved: is_reserved,
            reserved_from: rf.respond_to?(:iso8601) ? rf.iso8601 : rf&.to_s,
            resume_date: rd.respond_to?(:iso8601) ? rd.iso8601 : rd&.to_s,
            reservation_note: enrollment.reservation_note,
            pre_reservation_schedule: enrollment.pre_reservation_schedule,
            reservation_days: res_days,
            days_until_resume: days_to_resume,
            is_reservation_overdue: is_overdue,
            is_reservation_expiring_soon: is_expiring,
            total: total,
            completed: completed,
            remaining: remaining,
            pct: total.positive? ? ((completed / total.to_f) * 100).round : 0,
            almost_end: almost_end,
            is_ended: is_ended,
            is_active: is_active,
            has_newer_course: has_newer_course,
            is_latest_course: is_latest_course,
            sessions: sorted_sessions.map do |s|
              sch = s.scheduled_on
              st = s.start_time
              et = s.end_time
              formatted_scheduled_on = sch.respond_to?(:iso8601) ? sch.iso8601 : sch&.to_s
              formatted_start_time = st.respond_to?(:strftime) ? st.strftime("%H:%M") : st.to_s
              formatted_end_time = et.respond_to?(:strftime) ? et.strftime("%H:%M") : et.to_s
              t_name = s.teacher&.name || enrollment.teacher&.name || ""
              {
                id: s.id,
                scheduledOn: formatted_scheduled_on,
                scheduled_on: formatted_scheduled_on,
                startTime: formatted_start_time,
                start_time: formatted_start_time,
                endTime: formatted_end_time,
                end_time: formatted_end_time,
                durationMinutes: s.duration_minutes,
                duration_minutes: s.duration_minutes,
                dayLabel: s.day_label,
                day_label: s.day_label,
                lessonStatus: s.lesson_status,
                lesson_status: s.lesson_status,
                lessonNotes: s.lesson_notes,
                lesson_notes: s.lesson_notes,
                csForm: s.cs_form,
                cs_form: s.cs_form,
                csStatus: s.cs_status,
                cs_status: s.cs_status,
                teacherId: s.teacher_id,
                teacher_id: s.teacher_id,
                teacherName: t_name,
                teacher_name: t_name
              }
            end
          }
        end
        .compact
    end

    def ca_from_availability(records)
      val = records.sum { |record| record.duration_minutes / 40.0 }.round(1)
      (val % 1).zero? ? val.to_i : val
    end

    def ca_from_lessons(records)
      val = records.sum do |record|
        if record.respond_to?(:session_ca)
          record.session_ca
        else
          dur = record.try(:duration_minutes) || record[:duration_minutes] || record["duration_minutes"] || 40
          day_label = record.try(:day_label) || record[:day_label] || record["day_label"] || record[:dayLabel] || ""
          day_part = day_label.to_s.split("/").first.to_s
          is_double = dur >= 50 || day_part.include?("&") || day_part.include?("-") || day_part.scan(/\d+/).length >= 2
          is_double ? 2 : (dur.to_f / 40.0).round(1)
        end
      end.round(1)

      (val % 1).zero? ? val.to_i : val
    end
  end
end
