# frozen_string_literal: true

if defined?(BetterErrors) && Rails.env.development?
  # Set the editor to open files in VS Code
  BetterErrors.editor = :vscode
end
