# Shared Scheduler Design

## Context

The current prototype is a single HTML React app for `tràielts` scheduling. It supports teacher, sales, and CS workflows, but it stores all schedule data in `localStorage`. That means each browser has its own copy, so the app cannot be shared reliably.

The Rails app already has the right foundation for a shareable version:

- Rails 8.1 backend
- Inertia React frontend
- Devise already installed, but real account permissions are deferred
- Action Policy, serializers, and existing CRUD patterns
- Vite, Tailwind CSS v4, and shadcn-style UI components

The first DB-backed version will keep the prototype's dropdown-based role/person selection. Everyone who opens the app will read and write the same shared schedule. Real account auth can be added later without changing the core scheduling model.

## Goals

- Replace `localStorage` with PostgreSQL-backed schedule data.
- Preserve the current teacher, sales, and CS workflows.
- Keep identity simple for now: role and person are selected from dropdowns.
- Make the app shareable across browsers and people.
- Validate schedule conflicts on the server.
- Keep the data model suitable for future real auth.

## Non-Goals

- No production-grade role-based authentication in this phase.
- No per-workspace or per-center data separation in this phase.
- No Google Calendar API integration in this phase.
- Drag-and-drop rescheduling is not required for the first stable DB-backed version.

## Recommended Approach

Use the existing Rails + Inertia architecture with PostgreSQL as the shared source of truth.

Rails controllers will render the scheduler page and handle mutations. React pages will receive serialized props from Rails and submit changes through Inertia requests. This matches the existing app conventions and avoids introducing a separate JSON API layer before it is needed.

PostgreSQL should be configured for all environments. Local development can read from `DATABASE_URL` or use a default local database. Deployment can later provide `DATABASE_URL` and persistent storage through the hosting platform.

## Data Model

### People

`people` stores selectable identities for the dropdowns.

Fields:

- `name`
- `role`: `teacher`, `sales`, or `cs`
- `active`

Initial seed data:

- Teachers: Hà, Giang, My, Trà, Châu Anh, Khoa
- Sales: Sales Nhiên, Sales Mai
- CS: CS Mai

Future auth can map `users` to `people`, preserving the scheduling tables.

### Students

`students` stores learner information shared across enrollments and sessions.

Fields:

- `name`
- `code`
- `baseline`
- `aim`
- `exam_date`
- `student_note`

`code` should be unique because the prototype treats it as the stable student identifier.

### Enrollments

`enrollments` represents a student's course package assigned by sales to a teacher.

Fields:

- `student_id`
- `teacher_id`
- `sales_id`
- `course_name`
- `payment_status`
- `tuition_note`
- `meet_link`
- `start_date`
- `total_sessions`
- `frequency_per_week`
- `duration_minutes`
- `active`

This holds the course-level metadata that is repeated across booked slots in the prototype.

### Lesson Sessions

`lesson_sessions` stores actual booked classes.

Fields:

- `enrollment_id`
- `teacher_id`
- `scheduled_on`
- `start_time`
- `end_time`
- `duration_minutes`
- `day_label`
- `lesson_status`
- `lesson_notes`
- `cs_form`
- `cs_status`
- `rescheduled_from_id`

The UI can derive the 20-minute visual grid from `start_time`, `end_time`, and `duration_minutes`. It should not store duplicate sub-block rows.

### Teacher Availabilities

`teacher_availabilities` stores open teacher slots.

Fields:

- `teacher_id`
- `available_on`
- `start_time`
- `end_time`
- `duration_minutes`

Teacher availability and lesson sessions should both participate in conflict checks for the same teacher/date/time range.

## Workflows

### Teacher

Teachers select their name from a dropdown.

They can:

- open or close availability slots
- select slot duration: 20, 40, 60, or 80 minutes
- view their teaching calendar
- open lesson details
- add lesson notes
- track assigned students and course progress
- see monthly KPI summaries

KPI counts are derived from availability plus booked sessions.

### Sales

Sales users select their name from a dropdown and select the teacher calendar they want to view.

They can:

- view teacher availability and booked sessions
- create a new student if the student code does not exist
- create or update an enrollment
- generate recurring lesson sessions from Day 1, frequency, duration, and total session count
- store payment status, tuition notes, academic baseline, aim, exam date, student notes, and Google Meet link

Server-side booking must reject conflicts rather than silently overwriting existing lessons.

### CS

CS users select their name from a dropdown and select the teacher calendar they want to view.

They can:

- view booked sessions
- open lesson details
- update CS form
- update CS status
- update notes
- reschedule a lesson through a date/time modal

The first DB-backed version can use modal-based rescheduling. Drag-and-drop can be added after the CRUD and conflict behavior is stable.

## Calendar Logic

The app keeps the prototype's week/month display behavior:

- Week starts on Monday.
- The UI displays 20-minute grid intervals from 07:00 through 22:40.
- Month and week selectors drive the visible seven-day range.
- Vietnamese labels are preserved for day names and user-facing text.

Date-range calculations can live in TypeScript for display, while conflict detection and persisted schedule calculations live in Rails.

## Validation

The server must validate:

- student code presence and uniqueness
- person role correctness when assigning teacher/sales/CS actions
- enrollment required fields
- session date, start time, end time, and duration consistency
- no overlapping teacher availability for the same teacher
- no overlapping lesson sessions for the same teacher
- no teacher availability created over an existing lesson session
- no lesson session created over an existing lesson session

When a lesson is booked over existing matching availability, the consumed availability can be removed or shortened. For the first implementation, removing fully covered availability records is acceptable.

## Error Handling

Rails should return validation errors through Inertia redirects or responses that the React page displays as toasts and inline form errors.

Common user-facing errors:

- "Khung giờ này đã có lịch."
- "Mã học viên đã tồn tại với thông tin khác."
- "Không tìm thấy giáo viên đã chọn."
- "Không thể xếp đủ số buổi trong khoảng tìm kiếm."

## Frontend Design

The first implementation should be functional and close to the prototype, but built as maintainable React components:

- `scheduler/index.tsx` page
- calendar toolbar
- role/person selector
- schedule grid
- KPI summary panels
- lesson detail dialog
- sales booking dialog
- reschedule dialog
- student tracking cards

Use the repo's existing Tailwind and shadcn-style components where practical.

The UI should avoid a marketing landing page. The scheduler itself is the first screen.

## Routes And Controllers

Suggested routes:

- `root "schedules#index"`
- `resources :teacher_availabilities, only: %i[create update destroy]`
- `resources :enrollments, only: %i[create update]`
- `resources :lesson_sessions, only: %i[update]`
- `patch "lesson_sessions/:id/reschedule", to: "lesson_sessions#reschedule"`

The `SchedulesController#index` action will load people, visible availability, visible lesson sessions, and derived summary data for the selected month/week/teacher.

## Testing

Backend tests:

- teacher availability can be created and removed
- overlapping availability is rejected
- sales booking creates student, enrollment, and sessions
- sales booking rejects teacher lesson conflicts
- CS can update form/status/notes
- CS can reschedule a lesson
- rescheduling rejects conflicts

Frontend verification:

- TypeScript check passes
- key page renders with provided props
- one focused system test can cover the happy path if UI complexity warrants it

## Migration Notes

The existing app uses SQLite. This feature should switch the app to PostgreSQL intentionally, not as an incidental later deployment change.

Implementation should update:

- `Gemfile`: use PostgreSQL adapter
- `config/database.yml`: PostgreSQL configuration
- development/test database setup instructions
- production `DATABASE_URL` expectations

## Future Auth Path

When real accounts are added:

- keep `people` as business identities
- add `person_id` to `users`
- require login
- restrict actions by role
- keep existing schedule tables and most controller actions

This avoids rewriting schedule history when the app moves from dropdown identity to authenticated identity.
