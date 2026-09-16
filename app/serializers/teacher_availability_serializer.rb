# frozen_string_literal: true

# == Schema Information
#
# Table name: teacher_availabilities
# Database name: primary
#
#  id               :bigint           not null, primary key
#  available_on     :date             not null
#  duration_minutes :integer          not null
#  end_time         :time             not null
#  start_time       :time             not null
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  teacher_id       :bigint           not null
#
# Indexes
#
#  index_availability_on_teacher_date_time        (teacher_id,available_on,start_time,end_time)
#  index_teacher_availabilities_on_teacher_id     (teacher_id)
#  teacher_availabilities_teacher_time_exclusion  (teacher_id, tsrange((available_on + start_time), (available_on + end_time), '[)'::text)) USING gist
#
# Foreign Keys
#
#  fk_rails_...  (teacher_id => users.id)
#
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
