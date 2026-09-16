# frozen_string_literal: true

root "schedules#index"

resources :teachers, only: %i[update]
resources :students, only: %i[update]
resources :teacher_availabilities, only: %i[create update destroy] do
  post :sync_week,     on: :collection
  post :batch_create,  on: :collection
  post :batch_destroy, on: :collection
end
resources :enrollments, only: %i[create update destroy] do
  post :recalculate_days, on: :member
  post :reschedule_remaining, on: :member
  post :reserve, on: :member
  post :resume, on: :member
  post :cancel_reservation, on: :member
end
resources :lesson_sessions, only: %i[update destroy] do
  patch :reschedule, on: :member
  post :shift_subsequent, on: :member
  post :batch_update, on: :collection
end

namespace :admin do
  resources :users, only: %i[create update destroy]
end
