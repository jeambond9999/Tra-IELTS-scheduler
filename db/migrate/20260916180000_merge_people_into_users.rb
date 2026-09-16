# frozen_string_literal: true

class MergePeopleIntoUsers < ActiveRecord::Migration[8.1]
  PERSON_REFERENCES = [
    %w[enrollments teacher_id],
    %w[enrollments sales_id],
    %w[lesson_sessions teacher_id],
    %w[teacher_availabilities teacher_id]
  ].freeze

  def up
    add_column :users, :active, :boolean, default: true, null: false
    add_column :users, :weekly_availability_target, :integer
    add_check_constraint :users,
      "weekly_availability_target IS NULL OR weekly_availability_target > 0",
      name: "users_weekly_availability_target_positive"

    person_to_user = map_people_to_users

    execute <<~SQL
      UPDATE users
      SET active = people.active,
          weekly_availability_target = people.weekly_availability_target
      FROM people
      WHERE people.id = users.person_id
    SQL

    PERSON_REFERENCES.each do |table, column|
      remove_foreign_key table, :people, column: column
    end

    PERSON_REFERENCES.each do |table, column|
      # Negate first so a person id that happens to equal some user id can't be remapped twice.
      execute "UPDATE #{table} SET #{column} = -#{column}"
      person_to_user.each do |person_id, user_id|
        execute "UPDATE #{table} SET #{column} = #{user_id} WHERE #{column} = #{-person_id}"
      end
    end

    PERSON_REFERENCES.each do |table, column|
      add_foreign_key table, :users, column: column
    end

    remove_reference :users, :person, index: true, foreign_key: { to_table: :people, on_delete: :nullify }
    drop_table :people
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end

  private

  def map_people_to_users
    user_by_person_id = select_rows("SELECT person_id, id FROM users WHERE person_id IS NOT NULL")
      .to_h { |person_id, user_id| [ Integer(person_id), Integer(user_id) ] }

    select_rows("SELECT id, name, role FROM people").each_with_object({}) do |(id, name, role), map|
      person_id = Integer(id)

      if user_by_person_id.key?(person_id)
        map[person_id] = user_by_person_id[person_id]
      elsif person_referenced?(person_id)
        raise "Hồ sơ #{role} '#{name}' (id #{person_id}) đang có lịch/khóa học nhưng chưa gắn tài khoản đăng nhập nào. " \
              "Gắn tài khoản cho hồ sơ này trước rồi chạy lại migration."
      end
    end
  end

  def person_referenced?(person_id)
    PERSON_REFERENCES.any? do |table, column|
      select_value("SELECT 1 FROM #{table} WHERE #{column} = #{person_id} LIMIT 1")
    end
  end
end
