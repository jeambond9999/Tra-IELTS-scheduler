# frozen_string_literal: true

class AutoConsumeTeacherAvailabilityOnLessonBooking < ActiveRecord::Migration[8.1]
  CROSS_TABLE_CONSTRAINT = "teacher_schedule_cross_table_exclusion"

  def up
    return unless postgresql?

    execute <<~SQL
      CREATE OR REPLACE FUNCTION prevent_cross_table_teacher_schedule_overlap()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        PERFORM pg_advisory_xact_lock(NEW.teacher_id);

        IF TG_TABLE_NAME = 'lesson_sessions' THEN
          -- Automatically consume and remove any availability slot when a lesson is booked or rescheduled
          DELETE FROM teacher_availabilities
          WHERE teacher_id = NEW.teacher_id
            AND available_on = NEW.scheduled_on
            AND start_time < NEW.end_time
            AND end_time > NEW.start_time;
        ELSIF TG_TABLE_NAME = 'teacher_availabilities' THEN
          -- Prevent opening an availability slot over an existing lesson
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
              CONSTRAINT = '#{CROSS_TABLE_CONSTRAINT}',
              MESSAGE = 'Khung giờ này đã có lịch học.';
          END IF;
        END IF;

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
              CONSTRAINT = '#{CROSS_TABLE_CONSTRAINT}',
              MESSAGE = 'Khung giờ này đã có lịch.';
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$;
    SQL
  end

  private

  def postgresql?
    ActiveRecord::Base.connection.adapter_name == "PostgreSQL"
  end
end
