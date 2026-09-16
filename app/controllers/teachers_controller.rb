# frozen_string_literal: true

class TeachersController < InertiaController
  before_action :authenticate_user!
  before_action -> { authorize_roles!(:teacher) }

  def update
    teacher = User.teachers.find(params[:id])

    unless current_user.admin? || teacher == current_user
      return redirect_to_scheduler(alert: "Bạn chỉ được đổi mục tiêu ca rảnh của chính mình.")
    end

    if teacher.update(teacher_params)
      redirect_to_scheduler(notice: "Đã cập nhật số ca rảnh mỗi tuần.")
    else
      redirect_to_scheduler(alert: teacher.errors.full_messages.first)
    end
  end

  private

  def teacher_params
    params.require(:teacher).permit(:weekly_availability_target)
  end

  def redirect_params
    params.permit(:role, :person_id, :teacher_id, :month_key, :week_name)
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
