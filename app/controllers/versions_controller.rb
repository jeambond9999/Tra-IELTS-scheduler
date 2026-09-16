# frozen_string_literal: true

class VersionsController < InertiaController
  before_action :authenticate_user!

  def index
    versions = PaperTrail::Version
      .where(whodunnit: current_user.id.to_s)
      .order(created_at: :desc)

    pagy, paginated_versions = pagy(versions)

    render inertia: "versions/index", props: {
      versions: VersionSerializer.many(paginated_versions),
      pagy: PagySerializer.one(pagy)
    }
  end
end
