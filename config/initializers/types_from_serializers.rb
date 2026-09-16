# frozen_string_literal: true

if defined?(TypesFromSerializers) && TypesFromSerializers.respond_to?(:config)
  TypesFromSerializers.config do |config|
    # Output path for generated TypeScript types
    config.output_dir = Rails.root.join("app/frontend/types/serializers")

    # Transform keys to camelCase to match frontend conventions
    config.transform_keys = ->(key) { key.to_s.camelize(:lower) }

    # Base serializer class
    config.base_serializers = [ "BaseSerializer" ]

    # Name for generated types (removes "Serializer" suffix)
    config.name_from_serializer = ->(name) { name.delete_suffix("Serializer") }
  end
end
