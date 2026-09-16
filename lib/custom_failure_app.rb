# frozen_string_literal: true

class CustomFailureApp < Devise::FailureApp
  def respond
    if inertia_request?
      redirect
    else
      super
    end
  end

  def redirect
    store_location!
    flash[:alert] = i18n_message unless flash[:alert].present?
    redirect_to redirect_url
  end

  private

  def inertia_request?
    request.headers["X-Inertia"].present?
  end
end
