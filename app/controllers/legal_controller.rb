# frozen_string_literal: true

# Public pages Google's OAuth consent screen links to; no login, no browser-version gate.
class LegalController < ActionController::Base
  layout "legal"

  CONTACT_EMAIL = "jimmy.nguyen@talemy.vn"
  EFFECTIVE_DATE = "16/09/2026"

  def privacy; end

  def terms; end
end
