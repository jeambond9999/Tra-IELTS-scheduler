# frozen_string_literal: true

class VersionSerializer < BaseSerializer
  attribute :id, type: :number
  attribute :item_type, type: :string
  attribute :item_id, type: :number
  attribute :event, type: :string
  attribute :object, type: "Record<string, unknown> | null"
  attribute :object_changes, type: "Record<string, [unknown, unknown]> | null"
  attribute :created_at, type: :string

  def id = @object.id
  def item_type = @object.item_type
  def item_id = @object.item_id
  def event = @object.event
  def created_at = @object.created_at.iso8601

  def object
    parse_json(@object.object)
  end

  def object_changes
    parse_json(@object.object_changes)
  end

  private

  def parse_json(json_string)
    return nil if json_string.blank?

    JSON.parse(json_string)
  rescue JSON::ParserError
    # Fallback for old YAML data
    nil
  end
end
