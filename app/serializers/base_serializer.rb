# frozen_string_literal: true

# BaseSerializer - All serializers in the app should extend this class
#
# Includes TypesFromSerializers::DSL when available (development), but
# gracefully skips it in environments where the gem isn't loaded (e.g. production).
begin
  require "types_from_serializers"
rescue LoadError
  # Gem not available; skip TS generation DSL in this environment
end

class BaseSerializer < Oj::Serializer
  include TypesFromSerializers::DSL if defined?(TypesFromSerializers::DSL)

  # Support number_to_currency and similar helpers inside serializers
  include ActionView::Helpers::NumberHelper

  # Output camelCase keys to match frontend expectations (createdAt, startsAt, etc.)
  transform_keys :camelize

  # Always expose `item` as the current object, even if object_as isn't called.
  def item
    @object
  end unless method_defined?(:item)

  # Raw expand list from serializer options (e.g., ['actor', 'replies.actor.profile_image'])
  def expand_raw
    options.dig(:expand) || []
  end

  # Top-level expand keys (e.g., ['actor', 'replies'])
  def expand
    expand_raw.map { |entry| entry.split(".").first }
  end

  # Child expand keys for a given parent (e.g., 'actor' => ['profile_image'])
  def expand_children(parent_key)
    parent_entry = expand_raw.find { |entry| entry.include?(parent_key) }
    return [] unless parent_entry

    Array(parent_entry.split(".").filter { |entry| entry != parent_key }.join("."))
  end
end
