# frozen_string_literal: true

PaperTrail.config.enabled = true
PaperTrail.config.has_paper_trail_defaults = {
  on: %i[create update destroy]
}

# Use JSON serialization instead of YAML for easier parsing
PaperTrail.serializer = PaperTrail::Serializers::JSON
