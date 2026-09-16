# frozen_string_literal: true

# Pagy configuration
# See https://ddnexus.github.io/pagy/docs/api/pagy
#
# Pagy 43 froze Pagy::DEFAULT; runtime defaults now live in the mutable
# Pagy::OPTIONS hash, which paginators merge into per-request options.
Pagy::OPTIONS[:limit] = 12

# The :overflow option was removed in Pagy 43. Out-of-range pages now return an
# empty page (from/to/in == 0) instead of raising, so no extra handling is needed.
