# frozen_string_literal: true

class ApplicationController < ActionController::Base
  include ActionPolicy::Controller
  include Pagy::Method

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Authorization context
  authorize :user, through: :current_user

  # Paper Trail whodunnit
  before_action :set_paper_trail_whodunnit
end
