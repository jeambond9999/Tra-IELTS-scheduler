# frozen_string_literal: true

class StudentsController < InertiaController
  before_action :authenticate_user!
  before_action :authorize_editor!

  def update
    student = Student.find(params[:id])

    if student.update(student_params)
      redirect_to_scheduler(notice: "✅ Đã cập nhật thông tin học viên (#{student.name} - #{student.code}) thành công.")
    else
      redirect_to_scheduler(alert: student.errors.full_messages.first || "Không thể cập nhật thông tin học viên.")
    end
  rescue ActiveRecord::RecordNotFound
    redirect_to_scheduler(alert: "Không tìm thấy học viên.")
  rescue ActiveRecord::RecordNotUnique
    redirect_to_scheduler(alert: "Mã học viên đã tồn tại trong hệ thống.")
  rescue ActiveRecord::RecordInvalid => e
    redirect_to_scheduler(alert: e.record.errors.full_messages.first)
  rescue => e
    redirect_to_scheduler(alert: e.message)
  end

  private

  def student_params
    params.require(:student).permit(
      :name, :code, :baseline, :aim, :exam_date, :student_note, :exam_status, :actual_score
    )
  end

  def authorize_editor!
    return if current_user.nil?
    return if current_user.pure_admin? || current_user.admin? || current_user.sales? || current_user.cs?

    redirect_to_scheduler(alert: "Chỉ Sales và CS mới có quyền chỉnh sửa tên và mã học viên.")
  end

  def redirect_params
    {
      role: params[:role],
      person_id: params[:person_id] || params[:personId],
      teacher_id: params[:teacher_id] || params[:teacherId],
      month_key: params[:month_key] || params[:monthKey],
      week_name: params[:week_name] || params[:weekName]
    }.compact
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
