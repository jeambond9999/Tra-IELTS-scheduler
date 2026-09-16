# frozen_string_literal: true

class TeacherAvailabilitySerializer < BaseSerializer
  object_as :teacher_availability, model: "TeacherAvailability"

  attributes :id, :available_on, :duration_minutes

  attribute :start_time do
    st = teacher_availability.start_time
    st.respond_to?(:strftime) ? st.strftime("%H:%M") : st.to_s
  end

  attribute :end_time do
    et = teacher_availability.end_time
    et.respond_to?(:strftime) ? et.strftime("%H:%M") : et.to_s
  end

  attribute :teacher_id do
    teacher_availability.teacher_id
  end

  attribute :teacher_name do
    teacher_availability.teacher&.name || ""
  end
end
