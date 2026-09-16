# frozen_string_literal: true

class EnforceSchedulerTimeConflicts < ActiveRecord::Migration[8.1]
  LESSON_CONSTRAINT = "lesson_sessions_teacher_time_exclusion"
  AVAILABILITY_CONSTRAINT = "teacher_availabilities_teacher_time_exclusion"
  CROSS_TABLE_CONSTRAINT = "teacher_schedule_cross_table_exclusion"

  def up
    return unless postgresql?

    enable_extension "btree_gist"

    add_exclusion_constraint :lesson_sessions,
      "teacher_id WITH =, tsrange(scheduled_on + start_time, scheduled_on + end_time, '[)') WITH &&",
      using: :gist,
      name: LESSON_CONSTRAINT
    add_exclusion_constraint :teacher_availabilities,
      "teacher_id WITH =, tsrange(available_on + start_time, available_on + end_time, '[)') WITH &&",
      using: :gist,
      name: AVAILABILITY_CONSTRAINT

    execute <<~SQL
      CREATE FUNCTION prevent_cross_table_teacher_schedule_overlap()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(NEW.teacher_id);

        IF TG_TABLE_NAME = 'lesson_sessions' THEN
          IF EXISTS (
            SELECT 1
            FROM teacher_availabilities
            WHERE teacher_id = NEW.teacher_id
              AND available_on = NEW.scheduled_on
              AND start_time < NEW.end_time
              AND end_time > NEW.start_time
          ) THEN
            RAISE EXCEPTION USING
              ERRCODE = '23P01',
              CONSTRAINT = '#{CROSS_TABLE_CONSTRAINT}',
              MESSAGE = 'Khung giờ này đã có lịch.';
          END IF;
        ELSIF EXISTS (
          SELECT 1
          FROM lesson_sessions
          WHERE teacher_id = NEW.teacher_id
            AND scheduled_on = NEW.available_on
            AND start_time < NEW.end_time
            AND end_time > NEW.start_time
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = '23P01',
            CONSTRAINT = '#{CROSS_TABLE_CONSTRAINT}',
            MESSAGE = 'Khung giờ này đã có lịch.';
        END IF;

        RETURN NEW;
      END;
      $$;

      CREATE TRIGGER lesson_sessions_prevent_cross_table_overlap
      BEFORE INSERT OR UPDATE OF teacher_id, scheduled_on, start_time, end_time
      ON lesson_sessions
      FOR EACH ROW
      EXECUTE FUNCTION prevent_cross_table_teacher_schedule_overlap();

      CREATE TRIGGER teacher_availabilities_prevent_cross_table_overlap
      BEFORE INSERT OR UPDATE OF teacher_id, available_on, start_time, end_time
      ON teacher_availabilities
      FOR EACH ROW
      EXECUTE FUNCTION prevent_cross_table_teacher_schedule_overlap();
    SQL
  end

  def down
    return unless postgresql?

    execute <<~SQL
      DROP TRIGGER teacher_availabilities_prevent_cross_table_overlap ON teacher_availabilities;
      DROP TRIGGER lesson_sessions_prevent_cross_table_overlap ON lesson_sessions;
      DROP FUNCTION prevent_cross_table_teacher_schedule_overlap();
    SQL

    remove_exclusion_constraint :teacher_availabilities, name: AVAILABILITY_CONSTRAINT
    remove_exclusion_constraint :lesson_sessions, name: LESSON_CONSTRAINT
  end

  private

  def postgresql?
    connection.adapter_name == "PostgreSQL"
  end
end
