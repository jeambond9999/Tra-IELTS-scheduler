# frozen_string_literal: true

require "application_system_test_case"

class SmokesTest < ApplicationSystemTestCase
  setup { sign_in_as users(:one) }

  test "visiting scheduler root" do
    visit root_path

    assert_selector "img[alt='tràielts']"
    assert_text "Cổng Giảng Viên"
    assert_button "👨‍🏫 Giảng Viên"
    assert_button "💼 Sales"
    assert_button "🎧 CSKH"
    assert_button "👑 Admin"
    assert_button "💾 Lưu & Xác Nhận"
  end

  test "calendar toolbar includes prototype save confirmation action" do
    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    assert_button "💾 Lưu & Xác Nhận"
    click_button "💾 Lưu & Xác Nhận"

    assert_text "💾 Đã lưu & xác nhận dữ liệu thành công!"
  end

  test "teacher weekly availability target updates the KPI row before save" do
    visit root_path(
      role: "teacher",
      person_id: people(:giang_teacher).id,
      teacher_id: people(:giang_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    page.execute_script("localStorage.removeItem('traielts_scheduler_weekly_targets')")
    visit current_url

    click_button "📊 Dashboard"

    within "[data-week-kpi='Tuần 3']" do
      assert_equal "28", find("input[aria-label='Mục tiêu Tuần 3']").value
      assert_text "4% Target"
    end

    click_button "✏️ Đăng Ký Lịch"

    target_input = find("input[aria-label='Số ca rảnh mỗi tuần']")
    target_input.fill_in with: "10"

    click_button "📊 Dashboard"

    within "[data-week-kpi='Tuần 3']" do
      assert_equal "10", find("input[aria-label='Mục tiêu Tuần 3']").value
      assert_text "10% Target"
    end
  end

  test "teacher can override an individual weekly KPI target like the prototype" do
    visit root_path(
      role: "teacher",
      person_id: people(:giang_teacher).id,
      teacher_id: people(:giang_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    page.execute_script("localStorage.removeItem('traielts_scheduler_weekly_targets')")
    visit current_url

    click_button "📊 Dashboard"

    within "[data-week-kpi='Tuần 3']" do
      target = find("input[aria-label='Mục tiêu Tuần 3']")
      assert_equal "28", target.value

      target.fill_in with: "5"

      assert_equal "5", find("input[aria-label='Mục tiêu Tuần 3']").value
      assert_text "20% Target"
    end

    click_button "✏️ Đăng Ký Lịch"

    target_input = find("input[aria-label='Số ca rảnh mỗi tuần']")
    assert_equal "28", target_input.value
  end

  test "clicking a teacher availability opens details before deletion" do
    availabilities = Person.active.teachers.map do |teacher|
      TeacherAvailability.create!(
        teacher: teacher,
        available_on: Date.new(2026, 8, 16),
        start_time: "22:20",
        end_time: "22:40",
        duration_minutes: 20
      )
    end

    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    availability = availabilities.find { |entry| page.has_selector?("button[data-availability-id='#{entry.id}']") }
    find("button[data-availability-id='#{availability.id}']").click

    assert_text "Chi tiết ca rảnh"
    assert_text availability.start_time.strftime("%H:%M")
    assert_text availability.end_time.strftime("%H:%M")
    assert_predicate availability, :persisted?

    click_button "Xóa ca rảnh"

    assert_text "Đã xóa ca rảnh."
    assert_not TeacherAvailability.exists?(availability.id)
  end

  test "scheduler renders the prototype-style portal shell and grid" do
    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    assert_selector "main.scheduler-portal-shell"
    assert_text "Cổng Giảng Viên"
    assert_text "Quản lý ca dạy"
    assert_text "Đăng Ký Lịch"
    assert_text(/Đăng Ký Lịch & KPI Tháng 2026-08 \(Tổng mục tiêu: \d+ ca\)/i)
    assert_text "Tháng:"
    assert_text "Tuần:"
    assert_text "Tuần 3 (10/08 - 16/08)"
    assert_button "💾 Lưu & Xác Nhận"
    assert_selector "[data-scheduler-grid='prototype']"
    within "button[data-availability-id='#{teacher_availabilities(:ha_monday_open).id}']" do
      assert_text "07:00"
      assert_text "Rảnh"
    end
    assert_text "Google Meet"
  end

  test "role selector uses prototype role tabs and person labels" do
    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    assert_button "👨‍🏫 Giảng Viên"
    assert_button "💼 Sales"
    assert_button "🎧 CSKH"
    assert_button "👑 Admin"

    click_button "💼 Sales"
    assert_text "Cổng Tư Vấn Sales"

    click_button "🎧 CSKH"
    assert_text "Cổng Chăm Sóc Học Viên CS"

    click_button "👑 Admin"
    assert_text "Cổng Quản Trị Admin"
  end

  test "teacher can switch between prototype teacher views" do
    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    assert_selector "#teacher-tab-register-cal"
    assert_text(/Đăng Ký Lịch & KPI/i)

    find("#teacher-tab-dashboard").click
    assert_text(/🎯 Tổng Ca Mở \/ KPI/i)
    assert_text(/🟢 Ca Rảnh/i)
    assert_text(/📚 Ca Được Book/i)

    find("#teacher-tab-student-tracking").click
    assert_text(/Danh Sách Học Viên Đang Phụ Trách/i)
    assert_text "Tổng HV:"

    find("#teacher-tab-teaching-cal").click
    assert_text(/📅 Lịch Dạy Thực Tế/i)
    assert_text(/Xem Lịch Tuần/i)

    find("#teacher-tab-register-cal").click
    assert_text(/Đăng Ký Lịch & KPI/i)
  end

  test "teacher can lock the month so registration slots stop changing" do
    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    page.execute_script("localStorage.removeItem('traielts_scheduler_month_locks')")
    visit current_url

    assert_button "🔒 Khóa Lịch Đăng Ký"
    click_button "🔒 Khóa Lịch Đăng Ký"

    assert_text "🔒 Đã khóa lịch đăng ký tháng 2026-08! Không thể chỉnh sửa nữa."
    assert_text "🔒 Đã khóa (Không thể sửa)"
    assert_selector "button[data-slot-date='2026-08-10'][data-slot-time='09:20'][disabled]"
    assert_selector "button[data-availability-id='#{teacher_availabilities(:ha_monday_open).id}'][disabled]"
    within "button[data-availability-id='#{teacher_availabilities(:ha_monday_open).id}']" do
      assert_text "07:00"
      assert_text "Đã khóa"
    end
  end

  test "teacher can drag an available slot to a new empty time like the prototype" do
    availability = teacher_availabilities(:ha_monday_open)

    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    page.execute_script("localStorage.removeItem('traielts_scheduler_month_locks')")
    visit current_url

    source = find("button[data-availability-id='#{availability.id}'][draggable='true']")
    target = find("button[data-slot-date='2026-08-12'][data-slot-time='09:20']")

    drag_to_slot(source, target)

    assert_text "✨ Đã di chuyển ca rảnh thành công!"

    availability.reload
    assert_equal Date.new(2026, 8, 12), availability.available_on
    assert_equal "09:20", availability.start_time.strftime("%H:%M")
    assert_equal "10:00", availability.end_time.strftime("%H:%M")
  end

  test "cs reschedule dialog matches prototype labels" do
    lesson = lesson_sessions(:minh_day_one)

    visit root_path(
      role: "cs",
      person_id: people(:cs_mai).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    find("button[data-lesson-id='#{lesson.id}']").click
    click_button "Dời lịch"

    assert_text "Dời Lịch Học"
    assert_text "Nguyễn Văn Minh"
    assert_text "IELTS Writing Intensive"
    assert_text "Chọn Ngày Mới *"
    assert_text "Giờ Bắt Đầu Mới *"
    assert_button "Xác Nhận Dời 1 Buổi"
  end

  test "teacher can save lesson notes from the lesson detail popup like the prototype" do
    lesson = lesson_sessions(:minh_day_one)

    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    click_button "📅 Lịch Dạy"
    find("button[data-lesson-id='#{lesson.id}']").click

    assert_text students(:minh).name
    assert_text "Join with Google Meet"
    assert_text "https://meet.google.com/minh-writing"

    find("textarea[aria-label='Ghi chú buổi học']").fill_in with: "Reviewed Writing Task 2 outline"
    click_button "Lưu ghi chú"

    assert_text "Đã cập nhật buổi học."

    lesson.reload
    assert_equal "Reviewed Writing Task 2 outline", lesson.lesson_notes
  end

  test "lesson detail popup shows prototype learner and tuition context" do
    lesson = lesson_sessions(:minh_day_one)
    enrollments(:writing_minh).update!(tuition_note: "Còn 2tr, hẹn 15/08")

    visit root_path(
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    click_button "📅 Lịch Dạy"
    find("button[data-lesson-id='#{lesson.id}']").click

    assert_text(/Chi Tiết Lịch Học & Học Phí/i)
    assert_text "📅 2026-08-10 • 🕒 08:00 – 08:40 (Day 1/10)"
    assert_text "👨‍🏫 Giáo viên phụ trách: Hà"
    assert_text(/💰 Tình trạng học phí/i)
    assert_text "Ngày thi"
    assert_text "Đầu vào:"
    assert_text "Aim:"
    assert_text "Ngày thi:"
    assert_text "2026-12-30"
    assert_text(/Note học phí/i)
    assert_text "Còn 2tr, hẹn 15/08"
    assert_text(/📌 Note từ Sales \(Cho GV xem\):/i)
    assert_text "Weak Speaking Part 2"
  end

  test "lesson detail popup shows prototype fallback when sales note is blank" do
    lesson = LessonSession.create!(
      enrollment: enrollments(:speaking_lan),
      teacher: people(:giang_teacher),
      scheduled_on: Date.new(2026, 8, 11),
      start_time: "09:20",
      end_time: "10:00",
      duration_minutes: 40,
      day_label: "Day 1/8"
    )

    visit root_path(
      role: "teacher",
      person_id: people(:giang_teacher).id,
      teacher_id: people(:giang_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    click_button "📅 Lịch Dạy"
    find("button[data-lesson-id='#{lesson.id}']").click

    assert_text(/Note từ Sales \(Cho GV xem\)/i)
    assert_text "Không có ghi chú thêm từ Sales."
  end

  test "sales booking dialog includes prototype meet link field" do
    visit root_path(
      role: "sales",
      person_id: people(:sales_nhien).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    click_button "Xếp Lịch Học Mới"

    assert_selector "input[aria-label='Link Google Meet Thật'][value='https://meet.google.com/new']"
  end

  test "sales booking dialog matches prototype tuition and frequency controls" do
    visit root_path(
      role: "sales",
      person_id: people(:sales_nhien).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    click_button "Xếp Lịch Học Mới"

    assert_text "Sales Xếp Lớp Học Mới & Track Học Phí"
    assert_text "Giáo Viên *"
    assert_text "Tên Học Viên *"
    assert_text "Mã HV *"
    assert_text "Khóa Học *"
    assert_text(/THÔNG TIN HỌC PHÍ/i)
    assert_text "Link Google Meet Thật *"
    assert_button "1 Ca/Tuần"
    assert_button "2 Ca/Tuần"
    assert_text "Ca 1 Thứ"
    assert_no_text "Ca 2 Thứ"

    click_button "2 Ca/Tuần"

    assert_text "Ca 2 Thứ"
    assert_text "Ca 2 Giờ"
    assert_button "Xác Nhận Xếp Lớp"
  end

  test "sales and cs calendars show prototype teacher summary bars" do
    lesson = lesson_sessions(:minh_day_one)

    visit root_path(
      role: "sales",
      person_id: people(:sales_nhien).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    assert_text "Giáo Viên:"
    assert_text "Hà"
    assert_text "Rảnh: 1 ca"
    assert_text "Đã Book: 2 ca"
    within "button[data-lesson-id='#{lesson.id}']" do
      assert_text "Nguyễn Văn Minh - HV001"
      assert_text "Day 1/10"
      assert_no_text "IELTS Writing Intensive"
      assert_no_text "08:00 -> 08:40"
      assert_no_text "Google Meet"
    end

    visit root_path(
      role: "cs",
      person_id: people(:cs_mai).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    assert_text "Click ca học"
    assert_text "Kéo thả"
    assert_text "Đã Book tuần này: 2 ca"
    assert_selector "button[data-lesson-id='#{lesson.id}'][title='Click xem chi tiết hoặc Kéo thả dời lịch']"
  end

  test "cs can drag a booked lesson to an empty slot like the prototype" do
    lesson = lesson_sessions(:minh_day_one)

    visit root_path(
      role: "cs",
      person_id: people(:cs_mai).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    source = find("button[data-lesson-id='#{lesson.id}'][draggable='true']")
    target = find("button[data-slot-date='2026-08-12'][data-slot-time='09:20']")

    drag_to_slot(source, target)

    assert_text "Đã dời lịch học."

    lesson.reload
    assert_equal Date.new(2026, 8, 12), lesson.scheduled_on
    assert_equal "09:20", lesson.start_time.strftime("%H:%M")
    assert_equal "10:00", lesson.end_time.strftime("%H:%M")
  end

  test "cs lesson detail popup matches prototype management controls" do
    lesson = lesson_sessions(:minh_day_one)

    visit root_path(
      role: "cs",
      person_id: people(:cs_mai).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    find("button[data-lesson-id='#{lesson.id}']").click
    click_button "Sửa thông tin"

    assert_text "Hình thức"
    assert_text "Trạng thái CS"
    assert_text(/Ghi chú buổi học.*Hiện huy hiệu/)

    find("button[aria-label='Hình thức']").click
    find("[role='option']", text: "Take notes").click
    find("button[aria-label='Trạng thái CS']").click
    find("[role='option']", text: "Completed").click
    find("textarea[placeholder='Nhập ghi chú buổi học...']").fill_in with: "Send badge reminder"
    click_button "Lưu Thay Đổi"

    assert_text "Đã cập nhật buổi học."

    lesson.reload
    assert_equal "take_notes", lesson.cs_form
    assert_equal "completed", lesson.cs_status
    assert_equal "Send badge reminder", lesson.lesson_notes
  end

  test "cs lesson notes show the prototype calendar badge" do
    lesson = LessonSession.create!(
      enrollment: enrollments(:speaking_lan),
      teacher: people(:giang_teacher),
      scheduled_on: Date.new(2026, 8, 11),
      start_time: "09:20",
      end_time: "10:00",
      duration_minutes: 40,
      day_label: "Day 1/8"
    )

    visit root_path(
      role: "cs",
      person_id: people(:cs_mai).id,
      teacher_id: people(:giang_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 3"
    )

    within "button[data-lesson-id='#{lesson.id}']" do
      assert_no_text "📌"
    end

    find("button[data-lesson-id='#{lesson.id}']").click
    click_button "Sửa thông tin"
    find("textarea[placeholder='Nhập ghi chú buổi học...']").fill_in with: "Hẹn Day 6"
    click_button "Lưu Thay Đổi"

    assert_text "Đã cập nhật buổi học."

    within "button[data-lesson-id='#{lesson.id}']" do
      assert_text "📌"
    end
  end

  # test "visiting the index" do
  #   visit smokes_url
  #
  #   assert_selector "h1", text: "Smoke"
  # end

  private

  def drag_to_slot(source, target)
    page.execute_script(<<~JS, source, target)
      const source = arguments[0];
      const target = arguments[1];
      const dataTransfer = new DataTransfer();

      source.dispatchEvent(new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      }));

      target.dispatchEvent(new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      }));

      target.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      }));
    JS
  end
end
