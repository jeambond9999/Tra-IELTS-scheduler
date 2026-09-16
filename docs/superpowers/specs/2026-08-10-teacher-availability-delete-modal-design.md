# Teacher Availability Delete Modal Design

## Goal

Teacher availability blocks in the scheduler should no longer delete immediately on click. A teacher clicking an existing "Ca rảnh" block opens a confirmation modal with a delete action.

## Current Behavior

`ScheduleGrid` renders availability blocks as buttons. When the current role is `teacher`, clicking the block calls `router.delete(teacherAvailabilityPath(id), ...)` immediately. Non-teacher roles see the block disabled.

## Proposed Behavior

When a teacher clicks an availability block:

- Store the selected availability in component state.
- Open a dialog using the existing shared `Dialog` and `Button` components.
- Show the slot date and time range so the teacher can confirm the target.
- Provide `Hủy` to close without mutation.
- Provide a destructive `Xóa ca rảnh` button that calls the existing delete route with the existing scheduler redirect params.
- Close the modal on successful delete.
- Show the existing availability error path if deletion fails.

Non-teacher roles continue to see disabled availability blocks and cannot open the modal.

## Architecture

Keep the behavior local to `ScheduleGrid` because the selected availability only affects that grid and the existing delete behavior already lives there. No route, controller, serializer, or model changes are needed.

The UI should reuse existing design-system primitives:

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
- `Button`
- `Trash2` or a comparable Lucide icon for the destructive action

## Testing

Add a focused frontend test for `ScheduleGrid` that verifies:

- Clicking an existing teacher availability opens a dialog instead of deleting immediately.
- Clicking the dialog delete button performs the existing `router.delete` call with the availability id and redirect params.

The test should fail before implementation because the dialog does not exist yet.
