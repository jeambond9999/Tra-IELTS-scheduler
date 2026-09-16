import { toast } from 'sonner'
import { AvailabilityDetailDialog } from './availability-detail-dialog'
import { EditEnrollmentDialog } from './edit-enrollment-dialog'
import { LeadCapacityCalculatorDialog } from './lead-capacity-calculator'
import { LessonDetailDialog } from './lesson-detail-dialog'
import { RescheduleDialog } from './reschedule-dialog'
import { ReservationDialog } from './reservation-dialog'
import { ResumeReservationDialog } from './resume-reservation-dialog'
import { SalesBookingDialog } from './sales-booking-dialog'
import { StudentSessionsDialog } from './student-sessions-dialog'
import { TeacherEditScheduleDialog } from './teacher-edit-schedule-dialog'
import { TeacherKpiConfirmDialog } from './teacher-kpi-confirm-dialog'
import { TeacherSyncScheduleDialog } from './teacher-sync-schedule-dialog'
import type {
  Enrollment,
  KpiQuotaState,
  LessonSession,
  PersonRole,
  SchedulerMutationRedirectParams,
  SchedulerProps,
  StudentTrackingItem,
  TeacherAvailability,
} from '../types'

type Props = {
  role: PersonRole
  props: SchedulerProps
  redirectParams: SchedulerMutationRedirectParams

  // Lesson detail + reschedule
  activeLesson: LessonSession | null
  onCloseLessonDetail: () => void
  rescheduleLesson: LessonSession | null
  onOpenReschedule: (lesson: LessonSession) => void
  onCloseReschedule: () => void

  // Availability detail
  activeAvailability: TeacherAvailability | null
  onCloseAvailabilityDetail: () => void
  onAvailabilityDeleteSuccess: () => void

  // Teacher edit-schedule / sync flows
  teacherEditScheduleOpen: boolean
  onTeacherEditScheduleOpenChange: (open: boolean) => void
  syncConfirmOpen: boolean
  onSyncConfirmOpenChange: (open: boolean) => void
  gridDeleteConfirmOpen: boolean
  onGridDeleteConfirmOpenChange: (open: boolean) => void
  selectedTeacherName?: string
  displayTeacherId: number | string
  monthKey: string
  weekName: string
  currentWeekSavedAvailabilities: number
  pendingSlots: Set<string>
  defaultDuration: number
  selectedDeleteSlotIds: Set<number>
  onConfirmBatchDeleteAvailabilities: (ids: number[]) => void
  onSyncSuccess: () => void
  onEnterGridEditMode: () => void

  // Sales booking
  bookingOpen: boolean
  onBookingOpenChange: (open: boolean) => void
  personId: number
  teacherId: number | 'all' | string
  bookingPrefill: { dayName: string; time: string; date: string } | null

  // Enrollment editing
  editEnrollment: Enrollment | null
  onOpenEditEnrollment: (enrollment: Enrollment) => void
  onCloseEditEnrollment: () => void

  // Student sessions / reservation / resume
  activeStudentForSessions: StudentTrackingItem | null
  currentActiveStudentForSessions: StudentTrackingItem | null
  onCloseStudentSessions: () => void
  onSelectActiveStudent: (student: StudentTrackingItem) => void
  onViewStudentSessions: (code: string) => void
  centerStudents: StudentTrackingItem[]
  reservationStudent: StudentTrackingItem | null
  currentReservationStudent: StudentTrackingItem | null
  onCloseReservation: () => void
  resumeStudent: StudentTrackingItem | null
  currentResumeStudent: StudentTrackingItem | null
  onCloseResume: () => void
  onReserveStudent: (student: StudentTrackingItem) => void
  onResumeStudentRequest: (student: StudentTrackingItem) => void

  // Lead capacity calculator
  leadCalculatorOpen: boolean
  onLeadCalculatorOpenChange: (open: boolean) => void
  currentCenterEmptySlots: number

  // KPI confirm
  kpiConfirmOpen: boolean
  onKpiConfirmOpenChange: (open: boolean) => void
  weeklyTargetValue: number
  kpiQuota: KpiQuotaState
  onConfirmSaveKpiTarget: () => void
}

/**
 * Every modal/dialog shared across all role portals (Teacher/Admin/Sales/CS),
 * kept in one place so index.tsx doesn't have to render 12 dialogs inline.
 */
export function SchedulerModals({
  role,
  props,
  redirectParams,
  activeLesson,
  onCloseLessonDetail,
  rescheduleLesson,
  onOpenReschedule,
  onCloseReschedule,
  activeAvailability,
  onCloseAvailabilityDetail,
  onAvailabilityDeleteSuccess,
  teacherEditScheduleOpen,
  onTeacherEditScheduleOpenChange,
  syncConfirmOpen,
  onSyncConfirmOpenChange,
  gridDeleteConfirmOpen,
  onGridDeleteConfirmOpenChange,
  selectedTeacherName,
  displayTeacherId,
  monthKey,
  weekName,
  currentWeekSavedAvailabilities,
  pendingSlots,
  defaultDuration,
  selectedDeleteSlotIds,
  onConfirmBatchDeleteAvailabilities,
  onSyncSuccess,
  onEnterGridEditMode,
  bookingOpen,
  onBookingOpenChange,
  personId,
  teacherId,
  bookingPrefill,
  editEnrollment,
  onOpenEditEnrollment,
  onCloseEditEnrollment,
  activeStudentForSessions,
  currentActiveStudentForSessions,
  onCloseStudentSessions,
  onSelectActiveStudent,
  onViewStudentSessions,
  centerStudents,
  reservationStudent,
  currentReservationStudent,
  onCloseReservation,
  resumeStudent,
  currentResumeStudent,
  onCloseResume,
  onReserveStudent,
  onResumeStudentRequest,
  leadCalculatorOpen,
  onLeadCalculatorOpenChange,
  currentCenterEmptySlots,
  kpiConfirmOpen,
  onKpiConfirmOpenChange,
  weeklyTargetValue,
  kpiQuota,
  onConfirmSaveKpiTarget,
}: Props) {
  return (
    <div aria-hidden={activeLesson === null && !bookingOpen}>
      <LessonDetailDialog
        role={role}
        lesson={activeLesson}
        open={activeLesson !== null}
        onOpenChange={(open) => {
          if (!open) onCloseLessonDetail()
        }}
        onReschedule={(lesson) => {
          onCloseLessonDetail()
          onOpenReschedule(lesson)
        }}
        onEditEnrollment={onOpenEditEnrollment}
        redirectParams={redirectParams}
        onViewStudentSessions={onViewStudentSessions}
      />

      <AvailabilityDetailDialog
        availability={activeAvailability}
        open={activeAvailability !== null}
        onOpenChange={(open) => {
          if (!open) onCloseAvailabilityDetail()
        }}
        redirectParams={redirectParams}
        isUnlimited={true}
        role={role}
        onDeleteSuccess={onAvailabilityDeleteSuccess}
        onOpenEditDialog={() => onTeacherEditScheduleOpenChange(true)}
      />

      <TeacherEditScheduleDialog
        open={teacherEditScheduleOpen}
        onOpenChange={onTeacherEditScheduleOpenChange}
        teacherName={selectedTeacherName || 'Giáo viên'}
        teacherId={displayTeacherId}
        monthKey={monthKey}
        weekName={weekName}
        weekAvailabilities={props.teacherAvailabilities}
        monthAvailabilities={props.monthAvailabilities ?? props.teacherAvailabilities}
        isUnlimited={true}
        role={role}
        onConfirmDelete={onConfirmBatchDeleteAvailabilities}
        onSwitchToGridMode={() => {
          onEnterGridEditMode()
          toast.info('🎯 Đã bật chế độ chọn ca trên lịch. Hãy click vào các ca rảnh muốn xóa.')
        }}
      />

      <TeacherSyncScheduleDialog
        open={syncConfirmOpen}
        onOpenChange={onSyncConfirmOpenChange}
        teacherId={displayTeacherId}
        teacherName={selectedTeacherName || 'Giáo viên'}
        monthKey={monthKey}
        weekName={weekName}
        weekDays={props.weekDays}
        currentSavedSlotsCount={currentWeekSavedAvailabilities}
        pendingSlots={pendingSlots}
        defaultDuration={defaultDuration}
        weeks={props.weeks}
        mutationRedirectParams={redirectParams}
        onSyncSuccess={onSyncSuccess}
      />

      {gridDeleteConfirmOpen && (
        <GridDeleteConfirmModal
          role={role}
          selectedTeacherName={selectedTeacherName}
          selectedDeleteSlotIds={selectedDeleteSlotIds}
          onCancel={() => onGridDeleteConfirmOpenChange(false)}
          onConfirm={() => onConfirmBatchDeleteAvailabilities(Array.from(selectedDeleteSlotIds))}
        />
      )}

      <SalesBookingDialog
        open={bookingOpen}
        onOpenChange={onBookingOpenChange}
        teachers={props.people.teachers}
        salesId={personId}
        selectedTeacherId={typeof teacherId === 'number' ? teacherId : (props.people.teachers[0]?.id ?? 0)}
        timeIntervals={props.timeIntervals}
        redirectParams={redirectParams}
        prefill={bookingPrefill}
        enrollments={props.enrollments ?? []}
      />

      <RescheduleDialog
        lesson={rescheduleLesson}
        open={rescheduleLesson !== null}
        onOpenChange={(open) => {
          if (!open) onCloseReschedule()
        }}
        timeIntervals={props.timeIntervals}
        redirectParams={redirectParams}
        role={role}
        onEditEnrollment={onOpenEditEnrollment}
      />

      <StudentSessionsDialog
        open={activeStudentForSessions !== null}
        onOpenChange={(open) => {
          if (!open) onCloseStudentSessions()
        }}
        student={currentActiveStudentForSessions}
        redirectParams={redirectParams}
        role={role}
        allStudents={role === 'cs' ? centerStudents : props.studentTracking}
        onSelectStudent={onSelectActiveStudent}
        onReserveStudent={onReserveStudent}
        onResumeStudent={onResumeStudentRequest}
        teachers={props.people.teachers}
        timeIntervals={props.timeIntervals}
      />

      <EditEnrollmentDialog
        enrollment={editEnrollment}
        open={editEnrollment !== null}
        onOpenChange={(open) => {
          if (!open) onCloseEditEnrollment()
        }}
        redirectParams={redirectParams}
      />

      <ReservationDialog
        open={reservationStudent !== null}
        student={currentReservationStudent}
        teacherName={currentReservationStudent?.teacherName || selectedTeacherName}
        redirectParams={redirectParams}
        onClose={onCloseReservation}
      />

      <ResumeReservationDialog
        open={resumeStudent !== null}
        student={currentResumeStudent}
        teachers={props.people.teachers}
        redirectParams={redirectParams}
        onClose={onCloseResume}
      />

      <LeadCapacityCalculatorDialog
        open={leadCalculatorOpen}
        onOpenChange={onLeadCalculatorOpenChange}
        initialEmptySlots={currentCenterEmptySlots || 46}
      />

      <TeacherKpiConfirmDialog
        open={kpiConfirmOpen}
        onOpenChange={onKpiConfirmOpenChange}
        targetWeekly={weeklyTargetValue}
        monthKey={monthKey}
        changeCount={kpiQuota.count}
        onConfirm={onConfirmSaveKpiTarget}
      />
    </div>
  )
}

function GridDeleteConfirmModal({
  role,
  selectedTeacherName,
  selectedDeleteSlotIds,
  onCancel,
  onConfirm,
}: {
  role: PersonRole
  selectedTeacherName?: string
  selectedDeleteSlotIds: Set<number>
  onCancel: () => void
  onConfirm: () => void
}) {
  const isSalesOrAdmin = role === 'sales' || role === 'admin'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 text-rose-900">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
            🗑️
          </span>
          <div>
            <h3 className="text-base font-black text-slate-900 leading-snug">
              {isSalesOrAdmin
                ? `Xác nhận xóa ${selectedDeleteSlotIds.size} ca rảnh của GV ${selectedTeacherName || ''}?`
                : `Xác nhận xóa ${selectedDeleteSlotIds.size} ca rảnh đã chọn?`}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isSalesOrAdmin ? '👑 Quyền Sales: Không giới hạn số lần sửa' : '✨ Không giới hạn số lần sửa'}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-950 space-y-1.5">
          {isSalesOrAdmin ? (
            <p className="leading-relaxed">
              Bạn đang chuẩn bị xóa <strong>{selectedDeleteSlotIds.size} ca rảnh</strong> đã chọn trên lịch cho giáo
              viên <strong>{selectedTeacherName}</strong>. Thao tác này được thực hiện với quyền Quản lý Sales và
              không bị giới hạn số lần.
            </p>
          ) : (
            <p className="leading-relaxed">
              Bạn đang chuẩn bị xóa <strong>{selectedDeleteSlotIds.size} ca rảnh</strong> đã chọn trên lịch. Thao tác
              này không bị giới hạn số lần, bạn có thể đăng ký lại ca mới bất cứ lúc nào.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-xs font-bold border border-slate-200 cursor-pointer hover:bg-slate-50"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-extrabold text-white shadow-sm cursor-pointer active:scale-95"
          >
            Xác nhận xóa {selectedDeleteSlotIds.size} ca
          </button>
        </div>
      </div>
    </div>
  )
}
