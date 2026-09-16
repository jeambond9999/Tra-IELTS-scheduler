# frozen_string_literal: true

class PagySerializer < Oj::Serializer
  attributes :count, :page, :limit, :pages, :last, :in, :from, :to, :next

  # Pagy 43 renamed the `prev` reader to `previous`; keep the `prev` prop the
  # frontend already consumes.
  attribute :prev

  def prev
    @object.previous
  end
end
