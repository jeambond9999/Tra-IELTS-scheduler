# frozen_string_literal: true

class AllowTeacherAvailabilityOverlapWithLessons < ActiveRecord::Migration[8.1]
  def up
    return unless postgresql?

    execute <<~SQL
      DROP TRIGGER IF EXISTS teacher_availabilities_prevent_cross_table_overlap ON teacher_availabilities;

      CREATE OR REPLACE FUNCTION prevent_cross_table_teacher_schedule_overlap()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(NEW.teacher_id);

        -- Teacher availabilities and lesson sessions are now allowed to overlap.
        RETURN NEW;
      END;
      $$;
    SQL
  end

  def down
    return unless postgresql?

    execute <<~SQL
      CREATE OR REPLACE FUNCTION prevent_cross_table_teacher_schedule_overlap()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(NEW.teacher_id);

        IF TG_TABLE_NAME = 'lesson_sessions' THEN
          DELETE FROM teacher_availabilities
          WHERE teacher_id = NEW.teacher_id
            AND available_on = NEW.scheduled_on
            AND start_time < NEW.end_time
            AND end_time > NEW.start_time;
        ELSIF TG_TABLE_NAME = 'teacher_availabilities' THEN
          IF EXISTS (
            SELECT 1
            FROM lesson_sessions
            WHERE teacher_id = NEW.teacher_id
              AND scheduled_on = NEW.available_on
              AND start_time < NEW.end_time
              AND end_time > NEW.start_time
          ) THEN
            RAISE EXCEPTION USING
              ERRCODE = '23P01',
              CONSTRAINT = 'teacher_schedule_cross_table_exclusion',
              MESSAGE = 'Khung giờ này đã có lịch học.';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;

      DROP TRIGGER IF EXISTS teacher_availabilities_prevent_cross_table_overlap ON teacher_availabilities;
      CREATE TRIGGER teacher_availabilities_prevent_cross_table_overlap
      BEFORE INSERT OR UPDATE OF teacher_id, available_on, start_time, end_time
      ON teacher_availabilities
      FOR EACH ROW
      EXECUTE FUNCTION prevent_cross_table_teacher_schedule_overlap();
    SQL
  end

  private

  def postgresql?
    ActiveRecord::Base.connection.adapter_name == "PostgreSQL"
  end
end
