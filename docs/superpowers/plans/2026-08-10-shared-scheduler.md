# Shared Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PostgreSQL-backed shared `tràielts` scheduler that preserves the prototype's teacher, sales, and CS workflows while keeping identity as dropdown selections for this phase.

**Architecture:** Rails remains the source of truth and renders the scheduler through Inertia props. React manages the calendar interactions and submits mutations through Inertia routes. PostgreSQL stores people, students, enrollments, teacher availability, and booked lesson sessions.

**Tech Stack:** Rails 8.1, Ruby 3.3, PostgreSQL, Inertia Rails, React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-style local UI components, Minitest.

## Global Constraints

- Replace `localStorage` with PostgreSQL-backed schedule data.
- Preserve the current teacher, sales, and CS workflows.
- Keep identity simple for now: role and person are selected from dropdowns.
- Make the app shareable across browsers and people.
- Validate schedule conflicts on the server.
- Keep the data model suitable for future real auth.
- No production-grade role-based authentication in this phase.
- No per-workspace or per-center data separation in this phase.
- No Google Calendar API integration in this phase.
- Drag-and-drop rescheduling is not required for the first stable DB-backed version.
- Everyone who opens the app reads and writes the same shared schedule.
- PostgreSQL should be configured for all environments.
- Use `rtk` before shell commands in this repository.

---

## File Structure

Create or modify these files:

- `Gemfile`: replace the SQLite adapter with `pg`.
- `Gemfile.lock`: update through `rtk bundle install`.
- `config/database.yml`: configure PostgreSQL for development, test, and production.
- `.env.example`: document local PostgreSQL variables.
- `README.md`: add local setup commands for PostgreSQL and the scheduler.
- `db/migrate/20260810010000_create_scheduler_tables.rb`: create people, students, enrollments, lesson sessions, and teacher availability tables.
- `db/seeds.rb`: seed dropdown identities.
- `app/models/person.rb`: selectable teacher, sales, and CS identities.
- `app/models/student.rb`: student identity and academic metadata.
- `app/models/enrollment.rb`: course package assigned by sales to a teacher.
- `app/models/lesson_session.rb`: persisted booked lessons.
- `app/models/teacher_availability.rb`: persisted teacher open slots.
- `app/models/concerns/schedule_time_range.rb`: shared time range and overlap validation helpers.
- `test/fixtures/people.yml`: test identities.
- `test/fixtures/students.yml`: test students.
- `test/fixtures/enrollments.yml`: test enrollments.
- `test/fixtures/lesson_sessions.yml`: test lessons.
- `test/fixtures/teacher_availabilities.yml`: test availability.
- `test/models/person_test.rb`: person validations and scopes.
- `test/models/student_test.rb`: student validations.
- `test/models/enrollment_test.rb`: enrollment associations and role validation.
- `test/models/lesson_session_test.rb`: lesson range and conflict validation.
- `test/models/teacher_availability_test.rb`: availability range and conflict validation.
- `app/services/schedules/calendar.rb`: date and grid helper methods shared by controllers and services.
- `app/services/schedules/calendar_snapshot.rb`: builds scheduler index props.
- `test/services/schedules/calendar_test.rb`: calendar helper tests.
- `test/services/schedules/calendar_snapshot_test.rb`: summary and student tracking tests.
- `app/services/schedules/book_enrollment.rb`: creates or updates a student, enrollment, and generated lessons.
- `test/services/schedules/book_enrollment_test.rb`: booking service tests.
- `app/serializers/person_serializer.rb`: person props.
- `app/serializers/student_serializer.rb`: student props.
- `app/serializers/enrollment_serializer.rb`: enrollment props.
- `app/serializers/lesson_session_serializer.rb`: lesson props.
- `app/serializers/teacher_availability_serializer.rb`: availability props.
- `app/controllers/schedules_controller.rb`: shared scheduler page.
- `app/controllers/teacher_availabilities_controller.rb`: create and destroy availability.
- `app/controllers/enrollments_controller.rb`: sales booking mutation.
- `app/controllers/lesson_sessions_controller.rb`: update notes/status and reschedule lessons.
- `config/routes/schedules.rb`: scheduler routes.
- `config/routes.rb`: draw the scheduler routes.
- `test/controllers/schedules_controller_test.rb`: scheduler page test.
- `test/controllers/teacher_availabilities_controller_test.rb`: availability mutation tests.
- `test/controllers/enrollments_controller_test.rb`: sales booking mutation tests.
- `test/controllers/lesson_sessions_controller_test.rb`: lesson update and reschedule tests.
- `app/frontend/pages/scheduler/index.tsx`: scheduler page.
- `app/frontend/pages/scheduler/calendar.ts`: frontend calendar helper functions.
- `app/frontend/pages/scheduler/types.ts`: scheduler-local TypeScript types.
- `app/frontend/pages/scheduler/components/role-person-selector.tsx`: role/person picker.
- `app/frontend/pages/scheduler/components/calendar-toolbar.tsx`: month/week/teacher selectors.
- `app/frontend/pages/scheduler/components/schedule-grid.tsx`: reusable weekly grid.
- `app/frontend/pages/scheduler/components/kpi-panels.tsx`: KPI panels.
- `app/frontend/pages/scheduler/components/lesson-detail-dialog.tsx`: lesson detail, notes, CS controls.
- `app/frontend/pages/scheduler/components/sales-booking-dialog.tsx`: sales booking form.
- `app/frontend/pages/scheduler/components/reschedule-dialog.tsx`: CS reschedule form.
- `app/frontend/pages/scheduler/components/student-tracking.tsx`: teacher student tracking cards.
- `app/frontend/types/serializers/*.ts`: regenerated serializer types through `types_from_serializers`.
- `app/frontend/types/serializers/index.ts`: regenerated serializer exports.
- `app/frontend/lib/routes.js`: regenerated route helpers through `js-routes`.
- `app/frontend/lib/routes.d.ts`: regenerated route helper types.

Keep the scheduling UI files under `app/frontend/pages/scheduler/` so the scheduler-specific helpers and components move together.

---

### Task 1: PostgreSQL Adapter And Database Configuration

**Files:**
- Modify: `Gemfile`
- Modify: `Gemfile.lock`
- Modify: `config/database.yml`
- Create: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: Rails database configuration loaded from `config/database.yml`.
- Produces: A bootable Rails app using PostgreSQL in development, test, and production.

- [ ] **Step 1: Write the failing adapter expectation**

Add `test/database_adapter_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class DatabaseAdapterTest < ActiveSupport::TestCase
  test "test environment uses PostgreSQL" do
    assert_equal "PostgreSQL", ActiveRecord::Base.connection.adapter_name
  end
end
```

- [ ] **Step 2: Run test to verify it fails before the adapter switch**

Run:

```bash
rtk bin/rails test test/database_adapter_test.rb
```

Expected: FAIL with `Expected: "PostgreSQL"` while the app still connects through SQLite.

- [ ] **Step 3: Replace the database adapter dependency**

Modify `Gemfile`:

```ruby
# Use PostgreSQL as the database for Active Record
gem "pg", "~> 1.6"
```

Remove this line:

```ruby
gem "sqlite3", ">= 2.1"
```

Run:

```bash
rtk bundle install
```

- [ ] **Step 4: Configure PostgreSQL databases**

Replace `config/database.yml` with:

```yaml
default: &default
  adapter: postgresql
  encoding: unicode
  pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
  timeout: 5000
  username: <%= ENV["POSTGRES_USER"] %>
  password: <%= ENV["POSTGRES_PASSWORD"] %>
  host: <%= ENV.fetch("POSTGRES_HOST", "localhost") %>
  port: <%= ENV.fetch("POSTGRES_PORT", 5432) %>

development:
  primary:
    <<: *default
    database: <%= ENV.fetch("POSTGRES_DB", "meng_schedule_development") %>
  cache:
    <<: *default
    database: <%= ENV.fetch("POSTGRES_CACHE_DB", "meng_schedule_development_cache") %>
    migrations_paths: db/cache_migrate
  queue:
    <<: *default
    database: <%= ENV.fetch("POSTGRES_QUEUE_DB", "meng_schedule_development_queue") %>
    migrations_paths: db/queue_migrate
  cable:
    <<: *default
    database: <%= ENV.fetch("POSTGRES_CABLE_DB", "meng_schedule_development_cable") %>
    migrations_paths: db/cable_migrate

test:
  primary:
    <<: *default
    database: meng_schedule_test
  cache:
    <<: *default
    database: meng_schedule_test_cache
    migrations_paths: db/cache_migrate
  queue:
    <<: *default
    database: meng_schedule_test_queue
    migrations_paths: db/queue_migrate
  cable:
    <<: *default
    database: meng_schedule_test_cable
    migrations_paths: db/cable_migrate

production:
  primary:
    <<: *default
    url: <%= ENV["DATABASE_URL"] %>
  cache:
    <<: *default
    url: <%= ENV.fetch("CACHE_DATABASE_URL", ENV["DATABASE_URL"]) %>
    migrations_paths: db/cache_migrate
  queue:
    <<: *default
    url: <%= ENV.fetch("QUEUE_DATABASE_URL", ENV["DATABASE_URL"]) %>
    migrations_paths: db/queue_migrate
  cable:
    <<: *default
    url: <%= ENV.fetch("CABLE_DATABASE_URL", ENV["DATABASE_URL"]) %>
    migrations_paths: db/cable_migrate
```

- [ ] **Step 5: Document local PostgreSQL variables**

Create `.env.example`:

```bash
APP_HOST=localhost
APP_PORT=3000

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=meng_schedule_development
POSTGRES_CACHE_DB=meng_schedule_development_cache
POSTGRES_QUEUE_DB=meng_schedule_development_queue
POSTGRES_CABLE_DB=meng_schedule_development_cable

DATABASE_URL=postgres://localhost/meng_schedule_production
```

Update `README.md`:

````markdown
# Meng Schedule

## Local Setup

Install dependencies:

```bash
rtk bundle install
rtk npm install
```

Create PostgreSQL databases:

```bash
rtk bin/rails db:create
rtk bin/rails db:migrate
rtk bin/rails db:seed
```

Run the app:

```bash
rtk bin/dev
```

Run tests:

```bash
rtk bin/rails test
rtk npm run check
```
````

- [ ] **Step 6: Run database setup and adapter test**

Run:

```bash
rtk bin/rails db:create
rtk bin/rails db:test:prepare
rtk bin/rails test test/database_adapter_test.rb
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
rtk git add Gemfile Gemfile.lock config/database.yml .env.example README.md test/database_adapter_test.rb
rtk git commit -m "Switch app database to PostgreSQL"
```

---

### Task 2: Scheduler Domain Tables, Models, Seeds, And Fixtures

**Files:**
- Create: `db/migrate/20260810010000_create_scheduler_tables.rb`
- Create: `app/models/concerns/schedule_time_range.rb`
- Create: `app/models/person.rb`
- Create: `app/models/student.rb`
- Create: `app/models/enrollment.rb`
- Create: `app/models/lesson_session.rb`
- Create: `app/models/teacher_availability.rb`
- Modify: `db/seeds.rb`
- Create: `test/fixtures/people.yml`
- Create: `test/fixtures/students.yml`
- Create: `test/fixtures/enrollments.yml`
- Create: `test/fixtures/lesson_sessions.yml`
- Create: `test/fixtures/teacher_availabilities.yml`
- Create: `test/models/person_test.rb`
- Create: `test/models/student_test.rb`
- Create: `test/models/enrollment_test.rb`
- Create: `test/models/lesson_session_test.rb`
- Create: `test/models/teacher_availability_test.rb`

**Interfaces:**
- Consumes: PostgreSQL connection from Task 1.
- Produces:
  - `Person.teacher`, `Person.sales`, and `Person.cs` scopes.
  - `Student` with unique `code`.
  - `Enrollment` with `teacher` and `sales` `Person` associations.
  - `LessonSession` with server-side range and overlap validations.
  - `TeacherAvailability` with server-side range and overlap validations.

- [ ] **Step 1: Write model tests**

Create `test/models/person_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class PersonTest < ActiveSupport::TestCase
  test "requires a unique name per role" do
    person = Person.new(name: people(:ha_teacher).name, role: :teacher)

    assert_not person.valid?
    assert_includes person.errors[:name], "has already been taken"
  end

  test "filters active teachers" do
    assert_includes Person.active.teachers, people(:ha_teacher)
    assert_not_includes Person.active.teachers, people(:sales_nhien)
  end
end
```

Create `test/models/student_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class StudentTest < ActiveSupport::TestCase
  test "requires a unique code" do
    student = Student.new(name: "Another Hà", code: students(:minh).code)

    assert_not student.valid?
    assert_includes student.errors[:code], "has already been taken"
  end
end
```

Create `test/models/enrollment_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class EnrollmentTest < ActiveSupport::TestCase
  test "requires teacher person to have teacher role" do
    enrollment = enrollments(:writing_minh)
    enrollment.teacher = people(:sales_nhien)

    assert_not enrollment.valid?
    assert_includes enrollment.errors[:teacher], "must be a teacher"
  end

  test "requires sales person to have sales role" do
    enrollment = enrollments(:writing_minh)
    enrollment.sales = people(:ha_teacher)

    assert_not enrollment.valid?
    assert_includes enrollment.errors[:sales], "must be sales"
  end
end
```

Create `test/models/lesson_session_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class LessonSessionTest < ActiveSupport::TestCase
  test "requires end time after start time" do
    session = lesson_sessions(:minh_day_one)
    session.end_time = session.start_time

    assert_not session.valid?
    assert_includes session.errors[:end_time], "must be after start time"
  end

  test "rejects overlapping sessions for the same teacher and date" do
    session = LessonSession.new(
      enrollment: enrollments(:writing_minh),
      teacher: people(:ha_teacher),
      scheduled_on: lesson_sessions(:minh_day_one).scheduled_on,
      start_time: "08:20",
      end_time: "09:00",
      duration_minutes: 40,
      day_label: "Day 2/10"
    )

    assert_not session.valid?
    assert_includes session.errors[:base], "Khung giờ này đã có lịch."
  end

  test "allows same time for a different teacher" do
    session = LessonSession.new(
      enrollment: enrollments(:speaking_lan),
      teacher: people(:giang_teacher),
      scheduled_on: lesson_sessions(:minh_day_one).scheduled_on,
      start_time: lesson_sessions(:minh_day_one).start_time,
      end_time: lesson_sessions(:minh_day_one).end_time,
      duration_minutes: 40,
      day_label: "Day 1/8"
    )

    assert session.valid?
  end
end
```

Create `test/models/teacher_availability_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class TeacherAvailabilityTest < ActiveSupport::TestCase
  test "requires teacher person to have teacher role" do
    availability = teacher_availabilities(:ha_monday_open)
    availability.teacher = people(:sales_nhien)

    assert_not availability.valid?
    assert_includes availability.errors[:teacher], "must be a teacher"
  end

  test "rejects overlapping availability for the same teacher and date" do
    availability = TeacherAvailability.new(
      teacher: people(:ha_teacher),
      available_on: teacher_availabilities(:ha_monday_open).available_on,
      start_time: "07:20",
      end_time: "08:00",
      duration_minutes: 40
    )

    assert_not availability.valid?
    assert_includes availability.errors[:base], "Khung giờ này đã có lịch."
  end

  test "rejects availability over an existing lesson" do
    availability = TeacherAvailability.new(
      teacher: people(:ha_teacher),
      available_on: lesson_sessions(:minh_day_one).scheduled_on,
      start_time: lesson_sessions(:minh_day_one).start_time,
      end_time: lesson_sessions(:minh_day_one).end_time,
      duration_minutes: 40
    )

    assert_not availability.valid?
    assert_includes availability.errors[:base], "Khung giờ này đã có lịch."
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk bin/rails test test/models/person_test.rb test/models/student_test.rb test/models/enrollment_test.rb test/models/lesson_session_test.rb test/models/teacher_availability_test.rb
```

Expected: FAIL with missing constants such as `Person`.

- [ ] **Step 3: Create scheduler tables**

Create `db/migrate/20260810010000_create_scheduler_tables.rb`:

```ruby
# frozen_string_literal: true

class CreateSchedulerTables < ActiveRecord::Migration[8.1]
  def change
    create_table :people do |t|
      t.string :name, null: false
      t.string :role, null: false
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :people, %i[role name], unique: true
    add_check_constraint :people, "role IN ('teacher', 'sales', 'cs')", name: "people_role_check"

    create_table :students do |t|
      t.string :name, null: false
      t.string :code, null: false
      t.string :baseline
      t.string :aim
      t.date :exam_date
      t.text :student_note

      t.timestamps
    end

    add_index :students, :code, unique: true

    create_table :enrollments do |t|
      t.references :student, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: { to_table: :people }
      t.references :sales, null: false, foreign_key: { to_table: :people }
      t.string :course_name, null: false
      t.string :payment_status, null: false, default: "Đã đóng Full"
      t.text :tuition_note
      t.string :meet_link, null: false
      t.date :start_date, null: false
      t.integer :total_sessions, null: false
      t.integer :frequency_per_week, null: false
      t.integer :duration_minutes, null: false
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_check_constraint :enrollments, "total_sessions > 0", name: "enrollments_total_sessions_positive"
    add_check_constraint :enrollments, "frequency_per_week IN (1, 2)", name: "enrollments_frequency_check"
    add_check_constraint :enrollments, "duration_minutes IN (20, 40, 60, 80)", name: "enrollments_duration_check"

    create_table :lesson_sessions do |t|
      t.references :enrollment, null: false, foreign_key: true
      t.references :teacher, null: false, foreign_key: { to_table: :people }
      t.date :scheduled_on, null: false
      t.time :start_time, null: false
      t.time :end_time, null: false
      t.integer :duration_minutes, null: false
      t.string :day_label, null: false
      t.string :lesson_status, null: false, default: ""
      t.text :lesson_notes
      t.string :cs_form, null: false, default: ""
      t.string :cs_status, null: false, default: ""
      t.references :rescheduled_from, foreign_key: { to_table: :lesson_sessions }

      t.timestamps
    end

    add_index :lesson_sessions, %i[teacher_id scheduled_on start_time end_time], name: "index_lessons_on_teacher_date_time"
    add_check_constraint :lesson_sessions, "duration_minutes IN (20, 40, 60, 80)", name: "lesson_sessions_duration_check"

    create_table :teacher_availabilities do |t|
      t.references :teacher, null: false, foreign_key: { to_table: :people }
      t.date :available_on, null: false
      t.time :start_time, null: false
      t.time :end_time, null: false
      t.integer :duration_minutes, null: false

      t.timestamps
    end

    add_index :teacher_availabilities, %i[teacher_id available_on start_time end_time], name: "index_availability_on_teacher_date_time"
    add_check_constraint :teacher_availabilities, "duration_minutes IN (20, 40, 60, 80)", name: "teacher_availabilities_duration_check"
  end
end
```

- [ ] **Step 4: Create shared time range concern**

Create `app/models/concerns/schedule_time_range.rb`:

```ruby
# frozen_string_literal: true

module ScheduleTimeRange
  extend ActiveSupport::Concern

  included do
    validate :end_time_after_start_time
  end

  private

  def end_time_after_start_time
    return if start_time.blank? || end_time.blank?
    return if end_time > start_time

    errors.add(:end_time, "must be after start time")
  end

  def overlapping_time_range?(scope, date_column:, date_value:)
    return false if teacher_id.blank? || date_value.blank? || start_time.blank? || end_time.blank?

    scope
      .where(teacher_id: teacher_id, date_column => date_value)
      .where.not(id: id)
      .where("start_time < ? AND end_time > ?", end_time, start_time)
      .exists?
  end
end
```

- [ ] **Step 5: Create models**

Create `app/models/person.rb`:

```ruby
# frozen_string_literal: true

class Person < ApplicationRecord
  enum :role, { teacher: "teacher", sales: "sales", cs: "cs" }, validate: true

  has_many :teacher_enrollments, class_name: "Enrollment", foreign_key: :teacher_id, dependent: :restrict_with_error, inverse_of: :teacher
  has_many :sales_enrollments, class_name: "Enrollment", foreign_key: :sales_id, dependent: :restrict_with_error, inverse_of: :sales
  has_many :lesson_sessions, foreign_key: :teacher_id, dependent: :restrict_with_error, inverse_of: :teacher
  has_many :teacher_availabilities, foreign_key: :teacher_id, dependent: :destroy, inverse_of: :teacher

  validates :name, presence: true, uniqueness: { scope: :role }
  validates :active, inclusion: { in: [ true, false ] }

  scope :active, -> { where(active: true) }
  scope :teachers, -> { where(role: :teacher) }
  scope :sales_people, -> { where(role: :sales) }
  scope :cs_people, -> { where(role: :cs) }
end
```

Create `app/models/student.rb`:

```ruby
# frozen_string_literal: true

class Student < ApplicationRecord
  has_many :enrollments, dependent: :restrict_with_error

  validates :name, presence: true
  validates :code, presence: true, uniqueness: true
end
```

Create `app/models/enrollment.rb`:

```ruby
# frozen_string_literal: true

class Enrollment < ApplicationRecord
  belongs_to :student
  belongs_to :teacher, class_name: "Person"
  belongs_to :sales, class_name: "Person"

  has_many :lesson_sessions, dependent: :destroy

  validates :course_name, :meet_link, :start_date, presence: true
  validates :total_sessions, numericality: { only_integer: true, greater_than: 0 }
  validates :frequency_per_week, inclusion: { in: [ 1, 2 ] }
  validates :duration_minutes, inclusion: { in: [ 20, 40, 60, 80 ] }
  validates :active, inclusion: { in: [ true, false ] }
  validate :teacher_role
  validate :sales_role

  private

  def teacher_role
    return if teacher&.teacher?

    errors.add(:teacher, "must be a teacher")
  end

  def sales_role
    return if sales&.sales?

    errors.add(:sales, "must be sales")
  end
end
```

Create `app/models/lesson_session.rb`:

```ruby
# frozen_string_literal: true

class LessonSession < ApplicationRecord
  include ScheduleTimeRange

  belongs_to :enrollment
  belongs_to :teacher, class_name: "Person"
  belongs_to :rescheduled_from, class_name: "LessonSession", optional: true

  validates :scheduled_on, :start_time, :end_time, :day_label, presence: true
  validates :duration_minutes, inclusion: { in: [ 20, 40, 60, 80 ] }
  validate :teacher_role
  validate :no_lesson_overlap

  private

  def teacher_role
    return if teacher&.teacher?

    errors.add(:teacher, "must be a teacher")
  end

  def no_lesson_overlap
    return unless overlapping_time_range?(LessonSession.all, date_column: :scheduled_on, date_value: scheduled_on)

    errors.add(:base, "Khung giờ này đã có lịch.")
  end
end
```

Create `app/models/teacher_availability.rb`:

```ruby
# frozen_string_literal: true

class TeacherAvailability < ApplicationRecord
  include ScheduleTimeRange

  belongs_to :teacher, class_name: "Person"

  validates :available_on, :start_time, :end_time, presence: true
  validates :duration_minutes, inclusion: { in: [ 20, 40, 60, 80 ] }
  validate :teacher_role
  validate :no_availability_overlap
  validate :no_lesson_overlap

  private

  def teacher_role
    return if teacher&.teacher?

    errors.add(:teacher, "must be a teacher")
  end

  def no_availability_overlap
    return unless overlapping_time_range?(TeacherAvailability.all, date_column: :available_on, date_value: available_on)

    errors.add(:base, "Khung giờ này đã có lịch.")
  end

  def no_lesson_overlap
    return unless overlapping_time_range?(LessonSession.all, date_column: :scheduled_on, date_value: available_on)

    errors.add(:base, "Khung giờ này đã có lịch.")
  end
end
```

- [ ] **Step 6: Add fixtures**

Create `test/fixtures/people.yml`:

```yaml
ha_teacher:
  name: Hà
  role: teacher
  active: true

giang_teacher:
  name: Giang
  role: teacher
  active: true

sales_nhien:
  name: Sales Nhiên
  role: sales
  active: true

cs_mai:
  name: CS Mai
  role: cs
  active: true
```

Create `test/fixtures/students.yml`:

```yaml
minh:
  name: Nguyễn Văn Minh
  code: HV001
  baseline: "5.0"
  aim: "7.0"
  exam_date: 2026-12-30
  student_note: Weak Speaking Part 2

lan:
  name: Trần Ngọc Lan
  code: HV002
  baseline: "5.5"
  aim: "7.5"
  exam_date: 2026-11-20
  student_note:
```

Create `test/fixtures/enrollments.yml`:

```yaml
writing_minh:
  student: minh
  teacher: ha_teacher
  sales: sales_nhien
  course_name: IELTS Writing Intensive
  payment_status: Đã đóng Full
  tuition_note:
  meet_link: https://meet.google.com/minh-writing
  start_date: 2026-08-10
  total_sessions: 10
  frequency_per_week: 2
  duration_minutes: 40
  active: true

speaking_lan:
  student: lan
  teacher: giang_teacher
  sales: sales_nhien
  course_name: IELTS Speaking
  payment_status: Đã đóng Đợt 1
  tuition_note: Còn 2tr, hẹn 15/08
  meet_link: https://meet.google.com/lan-speaking
  start_date: 2026-08-11
  total_sessions: 8
  frequency_per_week: 1
  duration_minutes: 40
  active: true
```

Create `test/fixtures/lesson_sessions.yml`:

```yaml
minh_day_one:
  enrollment: writing_minh
  teacher: ha_teacher
  scheduled_on: 2026-08-10
  start_time: "08:00"
  end_time: "08:40"
  duration_minutes: 40
  day_label: Day 1/10
  lesson_status:
  lesson_notes:
  cs_form:
  cs_status:

minh_day_two:
  enrollment: writing_minh
  teacher: ha_teacher
  scheduled_on: 2026-08-13
  start_time: "08:00"
  end_time: "08:40"
  duration_minutes: 40
  day_label: Day 2/10
  lesson_status:
  lesson_notes:
  cs_form:
  cs_status:
```

Create `test/fixtures/teacher_availabilities.yml`:

```yaml
ha_monday_open:
  teacher: ha_teacher
  available_on: 2026-08-10
  start_time: "07:00"
  end_time: "07:40"
  duration_minutes: 40

giang_tuesday_open:
  teacher: giang_teacher
  available_on: 2026-08-11
  start_time: "09:00"
  end_time: "09:40"
  duration_minutes: 40
```

- [ ] **Step 7: Seed dropdown people**

Replace `db/seeds.rb` with:

```ruby
# frozen_string_literal: true

[
  [ "Hà", "teacher" ],
  [ "Giang", "teacher" ],
  [ "My", "teacher" ],
  [ "Trà", "teacher" ],
  [ "Châu Anh", "teacher" ],
  [ "Khoa", "teacher" ],
  [ "Sales Nhiên", "sales" ],
  [ "Sales Mai", "sales" ],
  [ "CS Mai", "cs" ]
].each do |name, role|
  Person.find_or_create_by!(name: name, role: role) do |person|
    person.active = true
  end
end
```

- [ ] **Step 8: Run migrations and model tests**

Run:

```bash
rtk bin/rails db:migrate
rtk bin/rails db:test:prepare
rtk bin/rails test test/models/person_test.rb test/models/student_test.rb test/models/enrollment_test.rb test/models/lesson_session_test.rb test/models/teacher_availability_test.rb
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
rtk git add db/migrate/20260810010000_create_scheduler_tables.rb db/schema.rb db/seeds.rb app/models test/fixtures test/models
rtk git commit -m "Add scheduler domain models"
```

---

### Task 3: Calendar Snapshot Services

**Files:**
- Create: `app/services/schedules/calendar.rb`
- Create: `app/services/schedules/calendar_snapshot.rb`
- Create: `test/services/schedules/calendar_test.rb`
- Create: `test/services/schedules/calendar_snapshot_test.rb`

**Interfaces:**
- Consumes: `Person`, `TeacherAvailability`, `LessonSession`, and `Enrollment`.
- Produces:
  - `Schedules::Calendar::TIME_INTERVALS`
  - `Schedules::Calendar.week_days(month_key:, week_name:)`
  - `Schedules::Calendar.end_time(start_time, duration_minutes)`
  - `Schedules::Calendar.month_key(date)`
  - `Schedules::Calendar.week_name(date)`
  - `Schedules::CalendarSnapshot.new(month_key:, week_name:, selected_teacher_id:).to_h`

- [ ] **Step 1: Write calendar helper tests**

Create `test/services/schedules/calendar_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class Schedules::CalendarTest < ActiveSupport::TestCase
  test "calculates end time" do
    assert_equal "08:40", Schedules::Calendar.end_time("08:00", 40)
  end

  test "builds Monday based week days for August 2026 week 2" do
    days = Schedules::Calendar.week_days(month_key: "2026-08", week_name: "Tuần 2")

    assert_equal "2026-08-10", days.first.fetch(:iso_date)
    assert_equal "Thứ 2 (10/08)", days.first.fetch(:header_label)
    assert_equal "2026-08-16", days.last.fetch(:iso_date)
  end

  test "calculates week name from date" do
    assert_equal "Tuần 2", Schedules::Calendar.week_name(Date.new(2026, 8, 10))
  end
end
```

Create `test/services/schedules/calendar_snapshot_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class Schedules::CalendarSnapshotTest < ActiveSupport::TestCase
  test "returns visible teacher schedule and summary" do
    snapshot = Schedules::CalendarSnapshot.new(
      month_key: "2026-08",
      week_name: "Tuần 2",
      selected_teacher_id: people(:ha_teacher).id
    ).to_h

    assert_equal people(:ha_teacher), snapshot.fetch(:selected_teacher)
    assert_includes snapshot.fetch(:lesson_sessions), lesson_sessions(:minh_day_one)
    assert_includes snapshot.fetch(:teacher_availabilities), teacher_availabilities(:ha_monday_open)
    assert_equal 0.5, snapshot.fetch(:week_summary).fetch(:available_ca)
    assert_equal 1.0, snapshot.fetch(:week_summary).fetch(:booked_ca)
  end

  test "returns student tracking rows" do
    snapshot = Schedules::CalendarSnapshot.new(
      month_key: "2026-08",
      week_name: "Tuần 2",
      selected_teacher_id: people(:ha_teacher).id
    ).to_h

    student = snapshot.fetch(:student_tracking).first

    assert_equal "Nguyễn Văn Minh", student.fetch(:student_name)
    assert_equal "HV001", student.fetch(:student_code)
    assert_equal 2, student.fetch(:total)
    assert_equal 0, student.fetch(:completed)
    assert_equal 2, student.fetch(:remaining)
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk bin/rails test test/services/schedules/calendar_test.rb test/services/schedules/calendar_snapshot_test.rb
```

Expected: FAIL with missing `Schedules::Calendar`.

- [ ] **Step 3: Implement calendar helper**

Create `app/services/schedules/calendar.rb`:

```ruby
# frozen_string_literal: true

module Schedules
  module Calendar
    TIME_INTERVALS = %w[
      07:00 07:20 07:40
      08:00 08:20 08:40 09:00 09:20 09:40
      10:00 10:20 10:40 11:00 11:20 11:40
      12:00 12:20 12:40 13:00 13:20 13:40
      14:00 14:20 14:40 15:00 15:20 15:40
      16:00 16:20 16:40 17:00 17:20 17:40
      18:00 18:20 18:40 19:00 19:20 19:40
      20:00 20:20 20:40 21:00 21:20 21:40
      22:00 22:20 22:40
    ].freeze

    DAYS = [ "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật" ].freeze
    WEEKS = [ "Tuần 1", "Tuần 2", "Tuần 3", "Tuần 4", "Tuần 5" ].freeze

    module_function

    def end_time(start_time, duration_minutes)
      hours, minutes = start_time.to_s.split(":").map(&:to_i)
      total_minutes = (hours * 60) + minutes + duration_minutes.to_i
      format("%02d:%02d", total_minutes / 60, total_minutes % 60)
    end

    def month_key(date)
      date = Date.parse(date.to_s)
      date.strftime("%Y-%m")
    end

    def week_name(date)
      date = Date.parse(date.to_s)
      first_day = date.beginning_of_month
      first_monday = first_day - ((first_day.wday + 6) % 7)
      index = ((date - first_monday).to_i / 7).clamp(0, 4)
      WEEKS.fetch(index)
    end

    def week_days(month_key:, week_name:)
      year, month = month_key.split("-").map(&:to_i)
      first_day = Date.new(year, month, 1)
      first_monday = first_day - ((first_day.wday + 6) % 7)
      week_index = WEEKS.index(week_name) || 0
      monday = first_monday + (week_index * 7)

      DAYS.each_with_index.map do |day_name, index|
        date = monday + index
        {
          name: day_name,
          day_num: date.strftime("%d"),
          month_num: date.strftime("%m"),
          year_num: date.year,
          iso_date: date.iso8601,
          date_formatted: date.strftime("%d/%m"),
          header_label: "#{day_name} (#{date.strftime("%d/%m")})"
        }
      end
    end
  end
end
```

- [ ] **Step 4: Implement snapshot service**

Create `app/services/schedules/calendar_snapshot.rb`:

```ruby
# frozen_string_literal: true

module Schedules
  class CalendarSnapshot
    def initialize(month_key:, week_name:, selected_teacher_id:)
      @month_key = month_key
      @week_name = week_name
      @selected_teacher_id = selected_teacher_id
    end

    def to_h
      {
        selected_teacher: selected_teacher,
        week_days: week_days,
        teacher_availabilities: teacher_availabilities.to_a,
        lesson_sessions: lesson_sessions.to_a,
        week_summary: week_summary,
        month_summary: month_summary,
        weekly_kpis: weekly_kpis,
        student_tracking: student_tracking
      }
    end

    private

    attr_reader :month_key, :week_name, :selected_teacher_id

    def selected_teacher
      @selected_teacher ||= Person.teachers.find(selected_teacher_id)
    end

    def week_days
      @week_days ||= Calendar.week_days(month_key: month_key, week_name: week_name)
    end

    def week_dates
      @week_dates ||= week_days.map { |day| Date.iso8601(day.fetch(:iso_date)) }
    end

    def month_range
      @month_range ||= begin
        year, month = month_key.split("-").map(&:to_i)
        date = Date.new(year, month, 1)
        date.beginning_of_month..date.end_of_month
      end
    end

    def teacher_availabilities
      @teacher_availabilities ||= TeacherAvailability
        .where(teacher: selected_teacher, available_on: week_dates)
        .order(:available_on, :start_time)
    end

    def lesson_sessions
      @lesson_sessions ||= LessonSession
        .includes(enrollment: :student)
        .where(teacher: selected_teacher, scheduled_on: week_dates)
        .order(:scheduled_on, :start_time)
    end

    def month_availabilities
      @month_availabilities ||= TeacherAvailability.where(teacher: selected_teacher, available_on: month_range)
    end

    def month_lessons
      @month_lessons ||= LessonSession.includes(enrollment: :student).where(teacher: selected_teacher, scheduled_on: month_range)
    end

    def week_summary
      {
        available_ca: ca_from_availability(teacher_availabilities),
        booked_ca: ca_from_lessons(lesson_sessions)
      }
    end

    def month_summary
      available_ca = ca_from_availability(month_availabilities)
      booked_ca = ca_from_lessons(month_lessons)
      completed_ca = ca_from_lessons(month_lessons.select { |lesson| lesson.cs_status == "completed" || lesson.lesson_status == "completed" })
      total_ca = available_ca + booked_ca

      {
        available_ca: available_ca,
        booked_ca: booked_ca,
        completed_ca: completed_ca,
        total_ca: total_ca,
        monthly_commitment: 110,
        kpi_percentage: total_ca.positive? ? ((total_ca / 110.0) * 100).round : 0,
        book_ratio_percentage: total_ca.positive? ? ((booked_ca / total_ca) * 100).round : 0
      }
    end

    def weekly_kpis
      Calendar::WEEKS.first(4).map do |week|
        dates = Calendar.week_days(month_key: month_key, week_name: week).map { |day| Date.iso8601(day.fetch(:iso_date)) }
        available = ca_from_availability(month_availabilities.select { |slot| dates.include?(slot.available_on) })
        booked = ca_from_lessons(month_lessons.select { |lesson| dates.include?(lesson.scheduled_on) })
        count = available + booked
        target = 28

        { week: week, count: count, target: target, pct: target.positive? ? ((count / target.to_f) * 100).round : 0 }
      end
    end

    def student_tracking
      LessonSession
        .includes(enrollment: :student)
        .where(teacher: selected_teacher)
        .group_by(&:enrollment)
        .map do |enrollment, sessions|
          completed = sessions.count { |session| session.cs_status == "completed" || session.lesson_status == "completed" }
          total = sessions.length

          {
            student_name: enrollment.student.name,
            student_code: enrollment.student.code,
            course: enrollment.course_name,
            baseline: enrollment.student.baseline,
            aim: enrollment.student.aim,
            exam_date: enrollment.student.exam_date&.iso8601,
            student_note: enrollment.student.student_note,
            payment_status: enrollment.payment_status,
            total: total,
            completed: completed,
            remaining: total - completed,
            pct: total.positive? ? ((completed / total.to_f) * 100).round : 0,
            almost_end: total.positive? && (total - completed) <= 2
          }
        end
    end

    def ca_from_availability(records)
      records.sum { |record| record.duration_minutes / 40.0 }
    end

    def ca_from_lessons(records)
      records.sum { |record| record.duration_minutes / 40.0 }
    end
  end
end
```

- [ ] **Step 5: Run service tests**

Run:

```bash
rtk bin/rails test test/services/schedules/calendar_test.rb test/services/schedules/calendar_snapshot_test.rb
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
rtk git add app/services test/services
rtk git commit -m "Add scheduler calendar snapshot services"
```

---

### Task 4: Enrollment Booking Service

**Files:**
- Create: `app/services/schedules/book_enrollment.rb`
- Create: `test/services/schedules/book_enrollment_test.rb`

**Interfaces:**
- Consumes:
  - `Schedules::Calendar.end_time(start_time, duration_minutes)`
  - `Schedules::Calendar.week_name(date)`
  - `Person` records for teacher and sales.
- Produces:
  - `Schedules::BookEnrollment.call(attributes)` returning a persisted `Enrollment`.
  - `Schedules::BookEnrollment::BookingError` for validation failures with `record` and `messages`.

- [ ] **Step 1: Write booking service tests**

Create `test/services/schedules/book_enrollment_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class Schedules::BookEnrollmentTest < ActiveSupport::TestCase
  test "creates student enrollment and recurring lessons" do
    assert_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ], 1) do
      Schedules::BookEnrollment.call(
        teacher_id: people(:giang_teacher).id,
        sales_id: people(:sales_nhien).id,
        student_name: "Lê Quốc Bảo",
        student_code: "HV100",
        course_name: "IELTS Writing Intensive",
        meet_link: "https://meet.google.com/bao-writing",
        duration_minutes: 40,
        start_date: "2026-08-12",
        total_sessions: 1,
        frequency_per_week: 1,
        baseline: "5.0",
        aim: "7.0",
        exam_date: "2026-12-30",
        student_note: "Needs grammar support",
        payment_status: "Đã đóng Full",
        tuition_note: "",
        schedule_patterns: [
          { day: "Thứ 4", time: "10:00" }
        ]
      )
    end

    enrollment = Enrollment.find_by!(course_name: "IELTS Writing Intensive", student: Student.find_by!(code: "HV100"))
    lesson = enrollment.lesson_sessions.first

    assert_equal Date.new(2026, 8, 12), lesson.scheduled_on
    assert_equal "10:00", lesson.start_time.strftime("%H:%M")
    assert_equal "10:40", lesson.end_time.strftime("%H:%M")
    assert_equal "Day 1/1", lesson.day_label
  end

  test "day one uses the requested start date even when it does not match the recurring day" do
    enrollment = Schedules::BookEnrollment.call(
      teacher_id: people(:giang_teacher).id,
      sales_id: people(:sales_nhien).id,
      student_name: "Phạm Minh Anh",
      student_code: "HV101",
      course_name: "IELTS Speaking",
      meet_link: "https://meet.google.com/minh-anh",
      duration_minutes: 40,
      start_date: "2026-08-12",
      total_sessions: 2,
      frequency_per_week: 1,
      baseline: "5.0",
      aim: "6.5",
      exam_date: "2026-12-01",
      student_note: "",
      payment_status: "Đã đóng Đợt 1",
      tuition_note: "",
      schedule_patterns: [
        { day: "Thứ 2", time: "09:00" }
      ]
    )

    assert_equal [ Date.new(2026, 8, 12), Date.new(2026, 8, 17) ], enrollment.lesson_sessions.order(:scheduled_on).pluck(:scheduled_on)
  end

  test "rejects booking conflicts" do
    error = assert_raises(Schedules::BookEnrollment::BookingError) do
      Schedules::BookEnrollment.call(
        teacher_id: people(:ha_teacher).id,
        sales_id: people(:sales_nhien).id,
        student_name: "Conflict Student",
        student_code: "HV102",
        course_name: "IELTS Writing",
        meet_link: "https://meet.google.com/conflict",
        duration_minutes: 40,
        start_date: "2026-08-10",
        total_sessions: 1,
        frequency_per_week: 1,
        baseline: "5.0",
        aim: "7.0",
        exam_date: "2026-12-30",
        student_note: "",
        payment_status: "Đã đóng Full",
        tuition_note: "",
        schedule_patterns: [
          { day: "Thứ 2", time: "08:00" }
        ]
      )
    end

    assert_includes error.messages, "Khung giờ này đã có lịch."
  end

  test "rejects existing student code with a different name" do
    error = assert_raises(Schedules::BookEnrollment::BookingError) do
      Schedules::BookEnrollment.call(
        teacher_id: people(:giang_teacher).id,
        sales_id: people(:sales_nhien).id,
        student_name: "Different Name",
        student_code: students(:minh).code,
        course_name: "IELTS Reading",
        meet_link: "https://meet.google.com/different",
        duration_minutes: 40,
        start_date: "2026-08-20",
        total_sessions: 1,
        frequency_per_week: 1,
        baseline: "5.0",
        aim: "7.0",
        exam_date: "2026-12-30",
        student_note: "",
        payment_status: "Đã đóng Full",
        tuition_note: "",
        schedule_patterns: [
          { day: "Thứ 5", time: "10:00" }
        ]
      )
    end

    assert_includes error.messages, "Mã học viên đã tồn tại với thông tin khác."
  end
end
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
rtk bin/rails test test/services/schedules/book_enrollment_test.rb
```

Expected: FAIL with missing `Schedules::BookEnrollment`.

- [ ] **Step 3: Implement booking service**

Create `app/services/schedules/book_enrollment.rb`:

```ruby
# frozen_string_literal: true

module Schedules
  class BookEnrollment
    class BookingError < StandardError
      attr_reader :record, :messages

      def initialize(messages, record: nil)
        @messages = Array(messages)
        @record = record
        super(@messages.join(", "))
      end
    end

    DAY_INDEX = {
      "Thứ 2" => 1,
      "Thứ 3" => 2,
      "Thứ 4" => 3,
      "Thứ 5" => 4,
      "Thứ 6" => 5,
      "Thứ 7" => 6,
      "Chủ Nhật" => 0
    }.freeze

    def self.call(attributes)
      new(attributes).call
    end

    def initialize(attributes)
      @attributes = attributes
    end

    def call
      validate_people!
      validate_student_identity!

      Enrollment.transaction do
        student.save!
        enrollment.save!
        generated_sessions.each(&:save!)
        remove_consumed_availability!
        enrollment
      rescue ActiveRecord::RecordInvalid => error
        raise BookingError.new(error.record.errors.full_messages, record: error.record)
      end
    end

    private

    attr_reader :attributes

    def teacher
      @teacher ||= Person.teachers.find(attributes.fetch(:teacher_id))
    end

    def sales
      @sales ||= Person.sales_people.find(attributes.fetch(:sales_id))
    end

    def student
      @student ||= begin
        found = Student.find_or_initialize_by(code: attributes.fetch(:student_code))
        found.assign_attributes(
          name: attributes.fetch(:student_name),
          baseline: attributes[:baseline],
          aim: attributes[:aim],
          exam_date: attributes[:exam_date],
          student_note: attributes[:student_note]
        )
        found
      end
    end

    def enrollment
      @enrollment ||= Enrollment.new(
        student: student,
        teacher: teacher,
        sales: sales,
        course_name: attributes.fetch(:course_name),
        payment_status: attributes.fetch(:payment_status),
        tuition_note: attributes[:tuition_note],
        meet_link: attributes.fetch(:meet_link),
        start_date: start_date,
        total_sessions: total_sessions,
        frequency_per_week: frequency_per_week,
        duration_minutes: duration_minutes,
        active: true
      )
    end

    def generated_sessions
      @generated_sessions ||= session_dates.each_with_index.map do |date, index|
        LessonSession.new(
          enrollment: enrollment,
          teacher: teacher,
          scheduled_on: date.fetch(:date),
          start_time: date.fetch(:time),
          end_time: Calendar.end_time(date.fetch(:time), duration_minutes),
          duration_minutes: duration_minutes,
          day_label: "Day #{index + 1}/#{total_sessions}"
        )
      end
    end

    def session_dates
      dates = [ { date: start_date, time: schedule_patterns.first.fetch(:time) } ]
      cursor = start_date + 1.day

      while dates.length < total_sessions && cursor <= start_date + 150.days
        pattern = schedule_patterns.find { |entry| DAY_INDEX.fetch(entry.fetch(:day)) == cursor.wday }
        dates << { date: cursor, time: pattern.fetch(:time) } if pattern
        cursor += 1.day
      end

      raise BookingError.new("Không thể xếp đủ số buổi trong khoảng tìm kiếm.") if dates.length < total_sessions

      dates
    end

    def remove_consumed_availability!
      generated_sessions.each do |session|
        TeacherAvailability
          .where(teacher: teacher, available_on: session.scheduled_on, start_time: session.start_time, end_time: session.end_time)
          .destroy_all
      end
    end

    def validate_people!
      teacher
      sales
    rescue ActiveRecord::RecordNotFound
      raise BookingError.new("Không tìm thấy giáo viên đã chọn.")
    end

    def validate_student_identity!
      return unless student.persisted?
      return if student.name == attributes.fetch(:student_name)

      raise BookingError.new("Mã học viên đã tồn tại với thông tin khác.", record: student)
    end

    def schedule_patterns
      @schedule_patterns ||= attributes.fetch(:schedule_patterns).first(frequency_per_week)
    end

    def start_date
      @start_date ||= Date.parse(attributes.fetch(:start_date).to_s)
    end

    def total_sessions
      @total_sessions ||= attributes.fetch(:total_sessions).to_i
    end

    def frequency_per_week
      @frequency_per_week ||= attributes.fetch(:frequency_per_week).to_i
    end

    def duration_minutes
      @duration_minutes ||= attributes.fetch(:duration_minutes).to_i
    end
  end
end
```

- [ ] **Step 4: Run booking service tests**

Run:

```bash
rtk bin/rails test test/services/schedules/book_enrollment_test.rb
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
rtk git add app/services/schedules/book_enrollment.rb test/services/schedules/book_enrollment_test.rb
rtk git commit -m "Add sales enrollment booking service"
```

---

### Task 5: Serializers, Routes, And Scheduler Index

**Files:**
- Create: `app/serializers/person_serializer.rb`
- Create: `app/serializers/student_serializer.rb`
- Create: `app/serializers/enrollment_serializer.rb`
- Create: `app/serializers/lesson_session_serializer.rb`
- Create: `app/serializers/teacher_availability_serializer.rb`
- Create: `app/controllers/schedules_controller.rb`
- Create: `config/routes/schedules.rb`
- Modify: `config/routes.rb`
- Create: `test/controllers/schedules_controller_test.rb`
- Modify: `app/frontend/types/serializers/*.ts`
- Modify: `app/frontend/types/serializers/index.ts`
- Modify: `app/frontend/lib/routes.js`
- Modify: `app/frontend/lib/routes.d.ts`

**Interfaces:**
- Consumes:
  - `Schedules::CalendarSnapshot.new(month_key:, week_name:, selected_teacher_id:).to_h`
  - `Person.active.teachers`, `Person.active.sales_people`, `Person.active.cs_people`
- Produces:
  - `root_path` rendering `scheduler/index`
  - Scheduler props: `people`, `selected`, `timeIntervals`, `weeks`, `weekDays`, `teacherAvailabilities`, `lessonSessions`, `weekSummary`, `monthSummary`, `weeklyKpis`, `studentTracking`

- [ ] **Step 1: Write controller test**

Create `test/controllers/schedules_controller_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class SchedulesControllerTest < ActionDispatch::IntegrationTest
  test "gets scheduler index without authentication" do
    get root_url, params: {
      role: "teacher",
      person_id: people(:ha_teacher).id,
      teacher_id: people(:ha_teacher).id,
      month_key: "2026-08",
      week_name: "Tuần 2"
    }

    assert_response :success
  end

  test "defaults to first active teacher" do
    get root_url

    assert_response :success
  end
end
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
rtk bin/rails test test/controllers/schedules_controller_test.rb
```

Expected: FAIL with missing route or missing controller.

- [ ] **Step 3: Add serializers**

Create `app/serializers/person_serializer.rb`:

```ruby
# frozen_string_literal: true

class PersonSerializer < BaseSerializer
  object_as :person, model: "Person"

  attributes :id, :name, :role, :active
end
```

Create `app/serializers/student_serializer.rb`:

```ruby
# frozen_string_literal: true

class StudentSerializer < BaseSerializer
  object_as :student, model: "Student"

  attributes :id, :name, :code, :baseline, :aim, :exam_date, :student_note
end
```

Create `app/serializers/enrollment_serializer.rb`:

```ruby
# frozen_string_literal: true

class EnrollmentSerializer < BaseSerializer
  object_as :enrollment, model: "Enrollment"

  attributes :id, :course_name, :payment_status, :tuition_note, :meet_link,
             :start_date, :total_sessions, :frequency_per_week, :duration_minutes, :active

  attribute :student do
    StudentSerializer.one(enrollment.student)
  end

  attribute :teacher_id do
    enrollment.teacher_id
  end

  attribute :sales_id do
    enrollment.sales_id
  end
end
```

Create `app/serializers/lesson_session_serializer.rb`:

```ruby
# frozen_string_literal: true

class LessonSessionSerializer < BaseSerializer
  object_as :lesson_session, model: "LessonSession"

  attributes :id, :scheduled_on, :start_time, :end_time, :duration_minutes,
             :day_label, :lesson_status, :lesson_notes, :cs_form, :cs_status

  attribute :teacher_id do
    lesson_session.teacher_id
  end

  attribute :enrollment do
    EnrollmentSerializer.one(lesson_session.enrollment)
  end
end
```

Create `app/serializers/teacher_availability_serializer.rb`:

```ruby
# frozen_string_literal: true

class TeacherAvailabilitySerializer < BaseSerializer
  object_as :teacher_availability, model: "TeacherAvailability"

  attributes :id, :available_on, :start_time, :end_time, :duration_minutes

  attribute :teacher_id do
    teacher_availability.teacher_id
  end
end
```

- [ ] **Step 4: Add routes**

Create `config/routes/schedules.rb`:

```ruby
# frozen_string_literal: true

root "schedules#index"

resources :teacher_availabilities, only: %i[create destroy]
resources :enrollments, only: %i[create update]
resources :lesson_sessions, only: %i[update] do
  patch :reschedule, on: :member
end
```

Modify `config/routes.rb` so scheduler routes load before demo item routes:

```ruby
Rails.application.routes.draw do
  draw :public
  draw :schedules

  # Demo inertia
  draw :demo

  # Authentication
  draw :devise

  # Demo CRUD
  draw :items

  # Audit log
  resources :versions, only: %i[index]

  # Solid Queue web UI (admin only)
  mount MissionControl::Jobs::Engine, at: "/jobs"
end
```

- [ ] **Step 5: Add scheduler controller**

Create `app/controllers/schedules_controller.rb`:

```ruby
# frozen_string_literal: true

class SchedulesController < InertiaController
  def index
    selected_teacher = selected_teacher_from_params
    snapshot = Schedules::CalendarSnapshot.new(
      month_key: selected_month_key,
      week_name: selected_week_name,
      selected_teacher_id: selected_teacher.id
    ).to_h

    render inertia: "scheduler/index", props: {
      people: people_props,
      selected: {
        role: selected_role,
        personId: selected_person_id,
        teacherId: selected_teacher.id,
        monthKey: selected_month_key,
        weekName: selected_week_name
      },
      timeIntervals: Schedules::Calendar::TIME_INTERVALS,
      weeks: Schedules::Calendar::WEEKS,
      weekDays: snapshot.fetch(:week_days),
      teacherAvailabilities: TeacherAvailabilitySerializer.many(snapshot.fetch(:teacher_availabilities)),
      lessonSessions: LessonSessionSerializer.many(snapshot.fetch(:lesson_sessions)),
      weekSummary: snapshot.fetch(:week_summary),
      monthSummary: snapshot.fetch(:month_summary),
      weeklyKpis: snapshot.fetch(:weekly_kpis),
      studentTracking: snapshot.fetch(:student_tracking)
    }
  end

  private

  def people_props
    {
      teachers: PersonSerializer.many(Person.active.teachers.order(:name)),
      sales: PersonSerializer.many(Person.active.sales_people.order(:name)),
      cs: PersonSerializer.many(Person.active.cs_people.order(:name))
    }
  end

  def selected_teacher_from_params
    Person.active.teachers.find_by(id: params[:teacher_id]) || Person.active.teachers.order(:name).first!
  end

  def selected_role
    params[:role].presence_in(%w[teacher sales cs]) || "teacher"
  end

  def selected_person_id
    params[:person_id].presence || selected_teacher_from_params.id
  end

  def selected_month_key
    params[:month_key].presence || Time.zone.today.strftime("%Y-%m")
  end

  def selected_week_name
    params[:week_name].presence_in(Schedules::Calendar::WEEKS) || Schedules::Calendar.week_name(Time.zone.today)
  end
end
```

- [ ] **Step 6: Generate frontend route helpers and serializer types**

Run:

```bash
rtk bin/rails js:routes
rtk bin/rails types_from_serializers:generate
```

If `rtk bin/rails js:routes` is not available, run:

```bash
rtk bin/rails js:routes:typescript
```

Expected: `app/frontend/lib/routes.js`, `app/frontend/lib/routes.d.ts`, and serializer type files include scheduler routes and new serializer types.

- [ ] **Step 7: Run controller test**

Run:

```bash
rtk bin/rails test test/controllers/schedules_controller_test.rb
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
rtk git add app/serializers app/controllers/schedules_controller.rb config/routes.rb config/routes/schedules.rb test/controllers/schedules_controller_test.rb app/frontend/types app/frontend/lib/routes.js app/frontend/lib/routes.d.ts
rtk git commit -m "Add scheduler index props"
```

---

### Task 6: Availability, Booking, And Lesson Mutation Controllers

**Files:**
- Create: `app/controllers/teacher_availabilities_controller.rb`
- Create: `app/controllers/enrollments_controller.rb`
- Create: `app/controllers/lesson_sessions_controller.rb`
- Create: `test/controllers/teacher_availabilities_controller_test.rb`
- Create: `test/controllers/enrollments_controller_test.rb`
- Create: `test/controllers/lesson_sessions_controller_test.rb`

**Interfaces:**
- Consumes:
  - `Schedules::Calendar.end_time(start_time, duration_minutes)`
  - `Schedules::BookEnrollment.call(attributes)`
  - `TeacherAvailability`, `Enrollment`, and `LessonSession` validations.
- Produces:
  - `POST /teacher_availabilities`
  - `DELETE /teacher_availabilities/:id`
  - `POST /enrollments`
  - `PATCH /lesson_sessions/:id`
  - `PATCH /lesson_sessions/:id/reschedule`

- [ ] **Step 1: Write availability controller tests**

Create `test/controllers/teacher_availabilities_controller_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class TeacherAvailabilitiesControllerTest < ActionDispatch::IntegrationTest
  test "creates teacher availability without authentication" do
    assert_difference("TeacherAvailability.count", 1) do
      post teacher_availabilities_url, params: {
        teacher_availability: {
          teacher_id: people(:giang_teacher).id,
          available_on: "2026-08-12",
          start_time: "10:00",
          duration_minutes: 40
        },
        role: "teacher",
        person_id: people(:giang_teacher).id,
        teacher_id: people(:giang_teacher).id,
        month_key: "2026-08",
        week_name: "Tuần 2"
      }
    end

    assert_redirected_to root_path(role: "teacher", person_id: people(:giang_teacher).id, teacher_id: people(:giang_teacher).id, month_key: "2026-08", week_name: "Tuần 2")
  end

  test "rejects conflicting availability" do
    assert_no_difference("TeacherAvailability.count") do
      post teacher_availabilities_url, params: {
        teacher_availability: {
          teacher_id: people(:ha_teacher).id,
          available_on: teacher_availabilities(:ha_monday_open).available_on,
          start_time: "07:20",
          duration_minutes: 40
        }
      }
    end

    assert_redirected_to root_path
    assert_equal "Khung giờ này đã có lịch.", flash[:alert]
  end

  test "destroys teacher availability" do
    assert_difference("TeacherAvailability.count", -1) do
      delete teacher_availability_url(teacher_availabilities(:giang_tuesday_open))
    end

    assert_redirected_to root_path
  end
end
```

- [ ] **Step 2: Write enrollment and lesson controller tests**

Create `test/controllers/enrollments_controller_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class EnrollmentsControllerTest < ActionDispatch::IntegrationTest
  test "sales booking creates enrollment and lessons" do
    assert_difference([ "Student.count", "Enrollment.count", "LessonSession.count" ], 1) do
      post enrollments_url, params: {
        enrollment: {
          teacher_id: people(:giang_teacher).id,
          sales_id: people(:sales_nhien).id,
          student_name: "Lê Quốc Bảo",
          student_code: "HV200",
          course_name: "IELTS Writing Intensive",
          meet_link: "https://meet.google.com/bao",
          duration_minutes: 40,
          start_date: "2026-08-12",
          total_sessions: 1,
          frequency_per_week: 1,
          baseline: "5.0",
          aim: "7.0",
          exam_date: "2026-12-30",
          student_note: "Needs grammar",
          payment_status: "Đã đóng Full",
          tuition_note: "",
          schedule_patterns: [
            { day: "Thứ 4", time: "10:00" }
          ]
        },
        role: "sales",
        person_id: people(:sales_nhien).id,
        teacher_id: people(:giang_teacher).id,
        month_key: "2026-08",
        week_name: "Tuần 2"
      }
    end

    assert_redirected_to root_path(role: "sales", person_id: people(:sales_nhien).id, teacher_id: people(:giang_teacher).id, month_key: "2026-08", week_name: "Tuần 2")
  end
end
```

Create `test/controllers/lesson_sessions_controller_test.rb`:

```ruby
# frozen_string_literal: true

require "test_helper"

class LessonSessionsControllerTest < ActionDispatch::IntegrationTest
  test "updates lesson CS metadata" do
    patch lesson_session_url(lesson_sessions(:minh_day_one)), params: {
      lesson_session: {
        cs_form: "normal",
        cs_status: "completed",
        lesson_notes: "Done"
      }
    }

    assert_redirected_to root_path

    lesson_sessions(:minh_day_one).reload
    assert_equal "normal", lesson_sessions(:minh_day_one).cs_form
    assert_equal "completed", lesson_sessions(:minh_day_one).cs_status
    assert_equal "Done", lesson_sessions(:minh_day_one).lesson_notes
  end

  test "reschedules lesson" do
    patch reschedule_lesson_session_url(lesson_sessions(:minh_day_one)), params: {
      lesson_session: {
        scheduled_on: "2026-08-12",
        start_time: "10:00"
      }
    }

    assert_redirected_to root_path

    lesson = lesson_sessions(:minh_day_one).reload
    assert_equal Date.new(2026, 8, 12), lesson.scheduled_on
    assert_equal "10:00", lesson.start_time.strftime("%H:%M")
    assert_equal "10:40", lesson.end_time.strftime("%H:%M")
  end

  test "rejects reschedule conflict" do
    patch reschedule_lesson_session_url(lesson_sessions(:minh_day_two)), params: {
      lesson_session: {
        scheduled_on: lesson_sessions(:minh_day_one).scheduled_on,
        start_time: lesson_sessions(:minh_day_one).start_time.strftime("%H:%M")
      }
    }

    assert_redirected_to root_path
    assert_equal "Khung giờ này đã có lịch.", flash[:alert]
  end
end
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
rtk bin/rails test test/controllers/teacher_availabilities_controller_test.rb test/controllers/enrollments_controller_test.rb test/controllers/lesson_sessions_controller_test.rb
```

Expected: FAIL with missing controllers.

- [ ] **Step 4: Implement shared redirect params in controllers**

Each controller should use this private helper:

```ruby
def redirect_params
  params.permit(:role, :person_id, :teacher_id, :month_key, :week_name)
end

def redirect_to_scheduler(notice: nil, alert: nil)
  redirect_to root_path(redirect_params), notice: notice, alert: alert
end
```

- [ ] **Step 5: Implement availability controller**

Create `app/controllers/teacher_availabilities_controller.rb`:

```ruby
# frozen_string_literal: true

class TeacherAvailabilitiesController < InertiaController
  def create
    availability = TeacherAvailability.new(availability_params)
    availability.end_time = Schedules::Calendar.end_time(availability.start_time, availability.duration_minutes)

    if availability.save
      redirect_to_scheduler(notice: "Đã mở ca rảnh.")
    else
      redirect_to_scheduler(alert: availability.errors.full_messages.first)
    end
  end

  def destroy
    TeacherAvailability.find(params[:id]).destroy
    redirect_to_scheduler(notice: "Đã xóa ca rảnh.")
  end

  private

  def availability_params
    params.require(:teacher_availability).permit(:teacher_id, :available_on, :start_time, :duration_minutes)
  end

  def redirect_params
    params.permit(:role, :person_id, :teacher_id, :month_key, :week_name)
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
```

- [ ] **Step 6: Implement enrollments controller**

Create `app/controllers/enrollments_controller.rb`:

```ruby
# frozen_string_literal: true

class EnrollmentsController < InertiaController
  def create
    Schedules::BookEnrollment.call(enrollment_params.to_h.symbolize_keys)
    redirect_to_scheduler(notice: "Xếp lịch học thành công.")
  rescue Schedules::BookEnrollment::BookingError => error
    redirect_to_scheduler(alert: error.messages.first)
  end

  private

  def enrollment_params
    params.require(:enrollment).permit(
      :teacher_id, :sales_id, :student_name, :student_code, :course_name, :meet_link,
      :duration_minutes, :start_date, :total_sessions, :frequency_per_week,
      :baseline, :aim, :exam_date, :student_note, :payment_status, :tuition_note,
      schedule_patterns: %i[day time]
    )
  end

  def redirect_params
    params.permit(:role, :person_id, :teacher_id, :month_key, :week_name)
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
```

- [ ] **Step 7: Implement lesson sessions controller**

Create `app/controllers/lesson_sessions_controller.rb`:

```ruby
# frozen_string_literal: true

class LessonSessionsController < InertiaController
  def update
    lesson = LessonSession.find(params[:id])

    if lesson.update(lesson_session_params)
      redirect_to_scheduler(notice: "Đã cập nhật buổi học.")
    else
      redirect_to_scheduler(alert: lesson.errors.full_messages.first)
    end
  end

  def reschedule
    lesson = LessonSession.find(params[:id])
    lesson.assign_attributes(
      scheduled_on: reschedule_params.fetch(:scheduled_on),
      start_time: reschedule_params.fetch(:start_time),
      end_time: Schedules::Calendar.end_time(reschedule_params.fetch(:start_time), lesson.duration_minutes)
    )

    if lesson.save
      redirect_to_scheduler(notice: "Đã dời lịch học.")
    else
      redirect_to_scheduler(alert: lesson.errors.full_messages.first)
    end
  end

  private

  def lesson_session_params
    params.require(:lesson_session).permit(:lesson_status, :lesson_notes, :cs_form, :cs_status)
  end

  def reschedule_params
    params.require(:lesson_session).permit(:scheduled_on, :start_time)
  end

  def redirect_params
    params.permit(:role, :person_id, :teacher_id, :month_key, :week_name)
  end

  def redirect_to_scheduler(notice: nil, alert: nil)
    redirect_to root_path(redirect_params), notice: notice, alert: alert
  end
end
```

- [ ] **Step 8: Run controller tests**

Run:

```bash
rtk bin/rails test test/controllers/teacher_availabilities_controller_test.rb test/controllers/enrollments_controller_test.rb test/controllers/lesson_sessions_controller_test.rb
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
rtk git add app/controllers/teacher_availabilities_controller.rb app/controllers/enrollments_controller.rb app/controllers/lesson_sessions_controller.rb test/controllers/teacher_availabilities_controller_test.rb test/controllers/enrollments_controller_test.rb test/controllers/lesson_sessions_controller_test.rb
rtk git commit -m "Add scheduler mutation controllers"
```

---

### Task 7: Scheduler React Page And Components

**Files:**
- Create: `app/frontend/pages/scheduler/types.ts`
- Create: `app/frontend/pages/scheduler/calendar.ts`
- Create: `app/frontend/pages/scheduler/components/role-person-selector.tsx`
- Create: `app/frontend/pages/scheduler/components/calendar-toolbar.tsx`
- Create: `app/frontend/pages/scheduler/components/kpi-panels.tsx`
- Create: `app/frontend/pages/scheduler/components/schedule-grid.tsx`
- Create: `app/frontend/pages/scheduler/components/lesson-detail-dialog.tsx`
- Create: `app/frontend/pages/scheduler/components/sales-booking-dialog.tsx`
- Create: `app/frontend/pages/scheduler/components/reschedule-dialog.tsx`
- Create: `app/frontend/pages/scheduler/components/student-tracking.tsx`
- Create: `app/frontend/pages/scheduler/index.tsx`

**Interfaces:**
- Consumes:
  - Scheduler props from `SchedulesController#index`.
  - Route helpers generated in `app/frontend/lib/routes`.
  - Inertia `router`.
- Produces:
  - A usable first screen at `/`.
  - Teacher availability creation and deletion through DB-backed routes.
  - Sales booking dialog submission through DB-backed routes.
  - CS lesson update and reschedule through DB-backed routes.

- [ ] **Step 1: Write frontend calendar helper**

Create `app/frontend/pages/scheduler/calendar.ts`:

```ts
export const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'] as const

export function blocksForDuration(durationMinutes: number) {
  return Math.max(1, Math.ceil(durationMinutes / 20))
}

export function caFromDuration(durationMinutes: number) {
  return durationMinutes / 40
}

export function monthOptions(baseYear = 2026) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const key = `${baseYear}-${String(month).padStart(2, '0')}`

    return {
      key,
      label: `Tháng ${month}/${baseYear}`,
    }
  })
}
```

- [ ] **Step 2: Write scheduler-local types**

Create `app/frontend/pages/scheduler/types.ts`:

```ts
export type PersonRole = 'teacher' | 'sales' | 'cs'

export type Person = {
  id: number
  name: string
  role: PersonRole
  active: boolean
}

export type Student = {
  id: number
  name: string
  code: string
  baseline?: string | null
  aim?: string | null
  examDate?: string | null
  studentNote?: string | null
}

export type Enrollment = {
  id: number
  courseName: string
  paymentStatus: string
  tuitionNote?: string | null
  meetLink: string
  startDate: string
  totalSessions: number
  frequencyPerWeek: number
  durationMinutes: number
  active: boolean
  teacherId: number
  salesId: number
  student: Student
}

export type LessonSession = {
  id: number
  teacherId: number
  scheduledOn: string
  startTime: string
  endTime: string
  durationMinutes: number
  dayLabel: string
  lessonStatus: string
  lessonNotes?: string | null
  csForm: string
  csStatus: string
  enrollment: Enrollment
}

export type TeacherAvailability = {
  id: number
  teacherId: number
  availableOn: string
  startTime: string
  endTime: string
  durationMinutes: number
}

export type WeekDay = {
  name: string
  dayNum: string
  monthNum: string
  yearNum: number
  isoDate: string
  dateFormatted: string
  headerLabel: string
}

export type SchedulerProps = {
  people: {
    teachers: Person[]
    sales: Person[]
    cs: Person[]
  }
  selected: {
    role: PersonRole
    personId: number
    teacherId: number
    monthKey: string
    weekName: string
  }
  timeIntervals: string[]
  weeks: string[]
  weekDays: WeekDay[]
  teacherAvailabilities: TeacherAvailability[]
  lessonSessions: LessonSession[]
  weekSummary: {
    availableCa: number
    bookedCa: number
  }
  monthSummary: {
    availableCa: number
    bookedCa: number
    completedCa: number
    totalCa: number
    monthlyCommitment: number
    kpiPercentage: number
    bookRatioPercentage: number
  }
  weeklyKpis: Array<{
    week: string
    count: number
    target: number
    pct: number
  }>
  studentTracking: Array<{
    studentName: string
    studentCode: string
    course: string
    baseline?: string | null
    aim?: string | null
    examDate?: string | null
    studentNote?: string | null
    paymentStatus: string
    total: number
    completed: number
    remaining: number
    pct: number
    almostEnd: boolean
  }>
}
```

- [ ] **Step 3: Create role and toolbar components**

Create `app/frontend/pages/scheduler/components/role-person-selector.tsx`:

```tsx
import type { Person, PersonRole } from '../types'

type Props = {
  role: PersonRole
  personId: number
  people: {
    teachers: Person[]
    sales: Person[]
    cs: Person[]
  }
  onChange: (role: PersonRole, personId: number) => void
}

export function RolePersonSelector({ role, personId, people, onChange }: Props) {
  const options = role === 'teacher' ? people.teachers : role === 'sales' ? people.sales : people.cs

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-2 text-sm">
      <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1 text-xs font-semibold">
        {(['teacher', 'sales', 'cs'] as const).map((nextRole) => (
          <button
            key={nextRole}
            type="button"
            onClick={() => onChange(nextRole, firstPersonId(nextRole, people))}
            className={`rounded px-3 py-2 ${role === nextRole ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}
          >
            {nextRole === 'teacher' ? 'GV' : nextRole === 'sales' ? 'Sales' : 'CS'}
          </button>
        ))}
      </div>
      <select
        value={personId}
        onChange={(event) => onChange(role, Number(event.target.value))}
        className="rounded-md border-slate-300 text-sm font-semibold text-emerald-800"
      >
        {options.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function firstPersonId(role: PersonRole, people: Props['people']) {
  const options = role === 'teacher' ? people.teachers : role === 'sales' ? people.sales : people.cs
  return options[0]?.id ?? 0
}
```

Create `app/frontend/pages/scheduler/components/calendar-toolbar.tsx`:

```tsx
import type { Person, PersonRole } from '../types'
import { monthOptions } from '../calendar'

type Props = {
  role: PersonRole
  monthKey: string
  weekName: string
  weeks: string[]
  teacherId: number
  teachers: Person[]
  onChange: (values: Partial<{ monthKey: string; weekName: string; teacherId: number }>) => void
}

export function CalendarToolbar({ role, monthKey, weekName, weeks, teacherId, teachers, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={monthKey} onChange={(event) => onChange({ monthKey: event.target.value })} className="rounded-md border-slate-300 text-sm font-bold">
          {monthOptions().map((month) => (
            <option key={month.key} value={month.key}>
              {month.label}
            </option>
          ))}
        </select>
        <select value={weekName} onChange={(event) => onChange({ weekName: event.target.value })} className="rounded-md border-slate-300 text-sm font-bold">
          {weeks.map((week) => (
            <option key={week} value={week}>
              {week}
            </option>
          ))}
        </select>
      </div>
      {(role === 'sales' || role === 'cs') && (
        <select value={teacherId} onChange={(event) => onChange({ teacherId: Number(event.target.value) })} className="rounded-md border-slate-300 text-sm font-bold text-emerald-800">
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create KPI and student tracking components**

Create `app/frontend/pages/scheduler/components/kpi-panels.tsx`:

```tsx
import type { SchedulerProps } from '../types'

type Props = {
  monthSummary: SchedulerProps['monthSummary']
  weeklyKpis: SchedulerProps['weeklyKpis']
}

export function KpiPanels({ monthSummary, weeklyKpis }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Tổng Ca Mở / KPI" value={`${monthSummary.totalCa} / ${monthSummary.monthlyCommitment}`} meta={`${monthSummary.kpiPercentage}%`} />
        <Kpi label="Ca Rảnh" value={`${monthSummary.availableCa}`} meta="Available" />
        <Kpi label="Ca Được Book" value={`${monthSummary.bookedCa}`} meta={`${monthSummary.bookRatioPercentage}%`} />
        <Kpi label="Ca Completed" value={`${monthSummary.completedCa}`} meta="Hoàn thành" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {weeklyKpis.map((week) => (
          <Kpi key={week.week} label={week.week} value={`${week.count} / ${week.target}`} meta={`${week.pct}%`} />
        ))}
      </div>
    </div>
  )
}

function Kpi({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        <span className="text-emerald-700">{meta}</span>
      </div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </div>
  )
}
```

Create `app/frontend/pages/scheduler/components/student-tracking.tsx`:

```tsx
import type { SchedulerProps } from '../types'

type Props = {
  students: SchedulerProps['studentTracking']
}

export function StudentTracking({ students }: Props) {
  if (students.length === 0) {
    return <div className="rounded-lg border bg-white p-10 text-center text-sm text-slate-500">Chưa có học viên nào được xếp lịch.</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {students.map((student) => (
        <div key={student.studentCode} className="rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-950">{student.studentName}</h3>
              <p className="font-mono text-xs font-bold text-emerald-700">{student.studentCode}</p>
            </div>
            {student.almostEnd && <span className="rounded bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">Sắp end khóa</span>}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">{student.course}</p>
          <div className="mt-3 rounded-md bg-slate-50 p-3">
            <div className="flex justify-between text-xs font-bold">
              <span>Tiến độ</span>
              <span>{student.completed} / {student.total} ({student.pct}%)</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${student.pct}%` }} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <span>Đầu vào: {student.baseline ?? 'N/A'}</span>
            <span>Aim: {student.aim ?? 'N/A'}</span>
            <span>Thi: {student.examDate ?? 'N/A'}</span>
          </div>
          {student.studentNote && <p className="mt-3 rounded bg-amber-50 p-2 text-xs font-semibold text-amber-900">{student.studentNote}</p>}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create dialogs**

Create dialog components using existing local shadcn-style components:

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
- `Button` from `@/components/ui/button`
- `Input` from `@/components/ui/input`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`
- `Textarea` from `@/components/ui/textarea`

The interfaces must be:

```ts
export function LessonDetailDialog(props: {
  role: 'teacher' | 'sales' | 'cs'
  lesson: LessonSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectParams: Record<string, string | number>
  onReschedule: (lesson: LessonSession) => void
}): JSX.Element
```

```ts
export function SalesBookingDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teachers: Person[]
  salesId: number
  selectedTeacherId: number
  timeIntervals: string[]
  redirectParams: Record<string, string | number>
}): JSX.Element
```

```ts
export function RescheduleDialog(props: {
  lesson: LessonSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  timeIntervals: string[]
  redirectParams: Record<string, string | number>
}): JSX.Element
```

Each dialog submits with `router.patch` or `router.post` and sends `redirectParams` merged into the request data.

- [ ] **Step 6: Create schedule grid**

Create `app/frontend/pages/scheduler/components/schedule-grid.tsx` with this interface:

```ts
export function ScheduleGrid(props: {
  role: PersonRole
  personId: number
  teacherId: number
  weekDays: WeekDay[]
  timeIntervals: string[]
  availabilities: TeacherAvailability[]
  lessons: LessonSession[]
  defaultDuration: number
  redirectParams: Record<string, string | number>
  onLessonClick: (lesson: LessonSession) => void
}): JSX.Element
```

Grid behavior:

- Finds a lesson by `scheduledOn` and `startTime`.
- Finds an availability by `availableOn` and `startTime`.
- Teacher role with no booked lesson can click an empty cell to create availability through `router.post(teacherAvailabilitiesPath(), { teacher_availability: { teacherId, availableOn, startTime, durationMinutes: defaultDuration }, ...redirectParams })`.
- Teacher role with availability can click the cell to delete availability through `router.delete(teacherAvailabilityPath(availability.id), { data: redirectParams })`.
- Booked lessons open `onLessonClick`.
- Sales sees availability and booked sessions but does not toggle cells.
- CS opens booked lessons.
- Multi-block lessons use `gridRow: span ${blocksForDuration(lesson.durationMinutes)}`.

- [ ] **Step 7: Create page component**

Create `app/frontend/pages/scheduler/index.tsx`:

```tsx
import { Head, router } from '@inertiajs/react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarToolbar } from './components/calendar-toolbar'
import { KpiPanels } from './components/kpi-panels'
import { LessonDetailDialog } from './components/lesson-detail-dialog'
import { RescheduleDialog } from './components/reschedule-dialog'
import { RolePersonSelector } from './components/role-person-selector'
import { SalesBookingDialog } from './components/sales-booking-dialog'
import { ScheduleGrid } from './components/schedule-grid'
import { StudentTracking } from './components/student-tracking'
import type { LessonSession, PersonRole, SchedulerProps } from './types'

export default function SchedulerIndex(props: SchedulerProps) {
  const [role, setRole] = useState<PersonRole>(props.selected.role)
  const [personId, setPersonId] = useState(props.selected.personId)
  const [teacherId, setTeacherId] = useState(props.selected.teacherId)
  const [monthKey, setMonthKey] = useState(props.selected.monthKey)
  const [weekName, setWeekName] = useState(props.selected.weekName)
  const [defaultDuration, setDefaultDuration] = useState(40)
  const [activeLesson, setActiveLesson] = useState<LessonSession | null>(null)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [rescheduleLesson, setRescheduleLesson] = useState<LessonSession | null>(null)

  const redirectParams = useMemo(() => ({ role, personId, teacherId, monthKey, weekName }), [role, personId, teacherId, monthKey, weekName])

  const reload = (values: Partial<typeof redirectParams>) => {
    const next = { ...redirectParams, ...values }
    router.get('/', next, { preserveState: true, preserveScroll: true })
  }

  const changeRolePerson = (nextRole: PersonRole, nextPersonId: number) => {
    const nextTeacherId = nextRole === 'teacher' ? nextPersonId : teacherId
    setRole(nextRole)
    setPersonId(nextPersonId)
    setTeacherId(nextTeacherId)
    reload({ role: nextRole, personId: nextPersonId, teacherId: nextTeacherId })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Head title="tràielts Scheduler" />
      <main className="mx-auto max-w-7xl space-y-5 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white p-4">
          <div>
            <h1 className="text-xl font-black text-slate-950"><span className="text-emerald-700">tràielts</span> Scheduler</h1>
            <p className="text-xs font-medium text-slate-500">Shared schedule database</p>
          </div>
          <RolePersonSelector role={role} personId={personId} people={props.people} onChange={changeRolePerson} />
        </header>

        <CalendarToolbar
          role={role}
          monthKey={monthKey}
          weekName={weekName}
          weeks={props.weeks}
          teacherId={teacherId}
          teachers={props.people.teachers}
          onChange={(values) => {
            if (values.monthKey) setMonthKey(values.monthKey)
            if (values.weekName) setWeekName(values.weekName)
            if (values.teacherId) setTeacherId(values.teacherId)
            reload(values)
          }}
        />

        {role === 'teacher' && (
          <div className="flex items-center gap-2 rounded-lg border bg-white p-3 text-sm">
            <span className="font-bold text-slate-600">Thời lượng mở ca</span>
            <select value={defaultDuration} onChange={(event) => setDefaultDuration(Number(event.target.value))} className="rounded-md border-slate-300 font-bold">
              {[20, 40, 60, 80].map((duration) => (
                <option key={duration} value={duration}>{duration} phút</option>
              ))}
            </select>
          </div>
        )}

        {role === 'teacher' && <KpiPanels monthSummary={props.monthSummary} weeklyKpis={props.weeklyKpis} />}

        {role === 'sales' && (
          <div className="flex justify-end">
            <Button onClick={() => setBookingOpen(true)}>Xếp Lịch Học Mới</Button>
          </div>
        )}

        <ScheduleGrid
          role={role}
          personId={personId}
          teacherId={teacherId}
          weekDays={props.weekDays}
          timeIntervals={props.timeIntervals}
          availabilities={props.teacherAvailabilities}
          lessons={props.lessonSessions}
          defaultDuration={defaultDuration}
          redirectParams={redirectParams}
          onLessonClick={setActiveLesson}
        />

        {role === 'teacher' && <StudentTracking students={props.studentTracking} />}

        <LessonDetailDialog
          role={role}
          lesson={activeLesson}
          open={activeLesson !== null}
          onOpenChange={(open) => {
            if (!open) setActiveLesson(null)
          }}
          redirectParams={redirectParams}
          onReschedule={(lesson) => setRescheduleLesson(lesson)}
        />

        <SalesBookingDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          teachers={props.people.teachers}
          salesId={personId}
          selectedTeacherId={teacherId}
          timeIntervals={props.timeIntervals}
          redirectParams={redirectParams}
        />

        <RescheduleDialog
          lesson={rescheduleLesson}
          open={rescheduleLesson !== null}
          onOpenChange={(open) => {
            if (!open) setRescheduleLesson(null)
          }}
          timeIntervals={props.timeIntervals}
          redirectParams={redirectParams}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 8: Run TypeScript check**

Run:

```bash
rtk npm run check
```

Expected: PASS.

- [ ] **Step 9: Run frontend lint**

Run:

```bash
rtk npm run lint
```

Expected: PASS.

- [ ] **Step 10: Commit**

Run:

```bash
rtk git add app/frontend/pages/scheduler
rtk git commit -m "Add scheduler React page"
```

---

### Task 8: End-To-End Verification And Cleanup

**Files:**
- Modify: `test/system/smokes_test.rb`
- Modify: `README.md`
- Check: `docs/superpowers/specs/2026-08-10-shared-scheduler-design.md`

**Interfaces:**
- Consumes: All routes, controllers, models, services, serializers, and frontend components from Tasks 1-7.
- Produces: Verified shared scheduler app with documented setup and a final implementation commit.

- [ ] **Step 1: Add system smoke test for scheduler page**

Modify `test/system/smokes_test.rb` to include:

```ruby
test "visiting scheduler root" do
  visit root_path

  assert_text "tràielts"
  assert_text "Scheduler"
  assert_text "GV"
end
```

- [ ] **Step 2: Run full backend tests**

Run:

```bash
rtk bin/rails test
```

Expected: PASS.

- [ ] **Step 3: Run system tests**

Run:

```bash
rtk bin/rails test:system
```

Expected: PASS.

- [ ] **Step 4: Run frontend checks**

Run:

```bash
rtk npm run check
rtk npm run lint
```

Expected: PASS.

- [ ] **Step 5: Run security and style checks**

Run:

```bash
rtk bundle exec rubocop
rtk bin/brakeman
```

Expected: PASS or only pre-existing findings unrelated to scheduler changes.

- [ ] **Step 6: Start the local dev server**

Run:

```bash
rtk bin/dev
```

Expected: Rails and Vite start. Open `http://localhost:3000/` and verify:

- root page shows scheduler, not item demo
- teacher dropdown can select Hà
- teacher can open an availability slot
- sales can create a one-session booking for a new student
- CS can update the lesson status to `completed`
- CS can reschedule the lesson through the modal
- refreshing the browser preserves the data because it is stored in PostgreSQL

- [ ] **Step 7: Update README with scheduler workflow**

Add this section to `README.md`:

```markdown
## Scheduler Workflow

The first scheduler version uses dropdown identity instead of real account permissions.

- Teacher: select a teacher name, open or close available slots, view KPI and student progress.
- Sales: select a sales name, choose a teacher calendar, and book recurring lessons for students.
- CS: select a CS name, choose a teacher calendar, update lesson status and reschedule lessons.

All users read and write the same shared PostgreSQL schedule.
```

- [ ] **Step 8: Commit verification docs and smoke test**

Run:

```bash
rtk git add test/system/smokes_test.rb README.md
rtk git commit -m "Verify scheduler workflow"
```

- [ ] **Step 9: Final status check**

Run:

```bash
rtk git status --short
```

Expected: no tracked scheduler changes remain unstaged. The untracked prototype HTML can remain untracked unless the user asks to keep it in git.
