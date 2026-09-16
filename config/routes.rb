# frozen_string_literal: true

Rails.application.routes.draw do
  draw :public
  draw :schedules

  # Demo inertia
  draw :demo

  # Authentication
  draw :devise

  # Demo CRUD
  draw :items

  # Audit log
  resources :versions, only: %i[index]

  # Solid Queue web UI (admin only)
  mount MissionControl::Jobs::Engine, at: "/jobs"
end
