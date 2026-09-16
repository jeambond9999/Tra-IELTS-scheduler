# frozen_string_literal: true

# Disable Mission Control's built-in HTTP Basic authentication
MissionControl::Jobs.http_basic_auth_enabled = false

Rails.application.config.to_prepare do
  MissionControl::Jobs::ApplicationController.class_eval do
    before_action :authenticate_for_jobs!

    private

    def authenticate_for_jobs!
      unless current_user
        flash[:alert] = "You must be signed in to access the jobs dashboard."
        redirect_to main_app.new_user_session_path
      end
    end

    # Optional: Add admin-only access
    # def authenticate_for_jobs!
    #   unless current_user&.admin?
    #     flash[:alert] = "Access denied. Admin privileges required."
    #     redirect_to main_app.root_path
    #   end
    # end
  end
end
