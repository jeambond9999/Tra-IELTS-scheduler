# frozen_string_literal: true

devise_for :users, controllers: {
  omniauth_callbacks: "users/omniauth_callbacks",
  sessions: "users/sessions"
}
