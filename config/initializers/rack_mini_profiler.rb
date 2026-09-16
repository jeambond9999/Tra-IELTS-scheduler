# frozen_string_literal: true

if defined?(Rack::MiniProfiler)
  # Position: top-left, top-right, bottom-left, bottom-right
  Rack::MiniProfiler.config.position = "bottom-right"

  # Don't show profiler for assets
  Rack::MiniProfiler.config.skip_paths = [
    "/assets/",
    "/vite/",
    "/vite-dev/",
    "/@vite/",
    "/@fs/",
    "/node_modules/"
  ]

  # Disable auto-inject for non-HTML responses
  Rack::MiniProfiler.config.disable_caching = false
end
