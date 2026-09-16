# frozen_string_literal: true

# Redirect to localhost from 127.0.0.1 to use same IP address with Vite server
constraints(host: "127.0.0.1") do
  get "(*path)", to: redirect { |params, req|
    query_string = req.query_string.present? ? "?#{req.query_string}" : ""

    "#{req.protocol}localhost:#{req.port}/#{params[:path]}#{query_string}"
  }
end

# Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

# Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
# Can be used by load balancers and uptime monitors to verify that the app is live.
get "up" => "rails/health#show", as: :rails_health_check

get "privacy" => "legal#privacy", as: :privacy
get "terms" => "legal#terms", as: :terms

# Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
# get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
# get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

# Defines the root path route ("/")
# root "posts#index"
