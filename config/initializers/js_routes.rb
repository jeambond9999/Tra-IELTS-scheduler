# frozen_string_literal: true

JsRoutes.setup do |config|
  # Output path for generated routes
  config.file = Rails.root.join("app/frontend/lib/routes.js")

  # Use camelCase for route names
  config.camel_case = true

  # Include all routes by default
  config.include = //

  # Exclude internal Rails routes
  config.exclude = [
    /rails_/
  ]

  # Generate ESM module
  config.module_type = "ESM"
end
