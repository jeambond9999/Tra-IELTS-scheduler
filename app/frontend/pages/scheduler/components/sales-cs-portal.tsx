import { Button } from '@/components/ui/button'
import { CalendarToolbar } from './calendar-toolbar'
import { CSReminderBanner } from './cs-reminder-banner'
import { DailyScheduleView } from './daily-schedule-view'
import { LeadCapacityCalculator } from './lead-capacity-calculator'
import { RankingPolicyTab } from './ranking-policy-tab'
import { RoleScheduleSummary } from './role-schedule-summary'
import { SalaryCalculator } from './salary-calculator'
import { SalesOverviewDashboard } from './sales-overview-dashboard'
import { ScheduleGrid } from './schedule-grid'
import { StudentTracking } from './student-tracking'
import type {
  LessonSession,
  Person,
  PersonRole,
  SchedulerMutationRedirectParams,
  SchedulerProps,
  StudentTrackingItem,
  TeacherAvailability,
} from '../types'

export type NonTeacherTab =
  | 'sales_dashboard'
  | 'schedule'
  | 'daily'
  | 'students'
  | 'ranking'
  | 'salary'
  | 'lead_calculator'

type CalendarToolbarChange = { monthKey?: string; weekName?: string; teacherId?: number | 'all' | string }

type Props = {
  role: PersonRole
  props: SchedulerProps
  mutationRedirectParams: SchedulerMutationRedirectParams
  nonTeacherTab: NonTeacherTab
  setNonTeacherTab: (tab: NonTeacherTab) => void
  monthKey: string
  weekName: string
  teacherId: number | 'all' | string
  personId: number
  defaultDuration: number
  selectedTeacher?: Person
  centerStudents: StudentTrackingItem[]
  teacherWeeklyEmptySlots: number
  isEditScheduleGridMode: boolean
  setIsEditScheduleGridMode: (value: boolean) => void
  selectedDeleteSlotIds: Set<number>
  setSelectedDeleteSlotIds: (value: Set<number>) => void
  onToggleDeleteSlot: (id: number) => void
  onOpenGridDeleteConfirm: () => void
  onOpenBooking: () => void
  onOpenSalesEditSchedule: () => void
  onEmptySlotClick: (date: string, time: string, dayHeaderLabel: string) => void
  onLessonClick: (lesson: LessonSession) => void
  onAvailabilityClick: (availability: TeacherAvailability) => void
  onSelectStudentCode: (code: string) => void
  onSelectActiveStudent: (student: StudentTrackingItem) => void
  onReserveStudent: (student: StudentTrackingItem) => void
  onResumeStudentRequest: (student: StudentTrackingItem) => void
  onCalendarToolbarChange: (values: CalendarToolbarChange) => void
  onSwitchToSalesScheduleSameRole: (teacherId: number | 'all') => void
  onSwitchToTeacherSalary: (teacherId: number) => void
}

export function SalesCsPortal({
  role,
  props,
  mutationRedirectParams,
  nonTeacherTab,
  setNonTeacherTab,
  monthKey,
  weekName,
  teacherId,
  personId,
  defaultDuration,
  selectedTeacher,
  centerStudents,
  teacherWeeklyEmptySlots,
  isEditScheduleGridMode,
  setIsEditScheduleGridMode,
  selectedDeleteSlotIds,
  setSelectedDeleteSlotIds,
  onToggleDeleteSlot,
  onOpenGridDeleteConfirm,
  onOpenBooking,
  onOpenSalesEditSchedule,
  onEmptySlotClick,
  onLessonClick,
  onAvailabilityClick,
  onSelectStudentCode,
  onSelectActiveStudent,
  onReserveStudent,
  onResumeStudentRequest,
  onCalendarToolbarChange,
  onSwitchToSalesScheduleSameRole,
  onSwitchToTeacherSalary,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      <CalendarToolbar
        role={role}
        monthKey={monthKey}
        weekName={weekName}
        weeks={props.weeks}
        teacherId={teacherId}
        teachers={props.people.teachers}
        onBookNew={onOpenBooking}
        onEditTeacherSchedule={onOpenSalesEditSchedule}
        hideWeekControls={nonTeacherTab === 'students' || nonTeacherTab === 'salary'}
        onChange={onCalendarToolbarChange}
      />

      {role === 'cs' && props.csReservationReminders && props.csReservationReminders.totalReserved > 0 && (
        <CSReminderBanner
          reminders={props.csReservationReminders}
          students={role === 'cs' ? centerStudents : props.studentTracking}
          onResumeStudent={onResumeStudentRequest}
          onSelectStudent={onSelectStudentCode}
        />
      )}

      <div className="flex flex-col gap-4">
        {nonTeacherTab === 'sales_dashboard' ? (
          <SalesOverviewDashboard
            adminStats={props.adminStats}
            teachers={props.people.teachers}
            allWeekAvailabilities={props.allWeekAvailabilities}
            allWeekLessons={props.allWeekLessons}
            weekDays={props.weekDays}
            weekName={weekName}
            monthKey={monthKey}
            studentTracking={props.studentTracking}
            onSelectTeacherForSchedule={onSwitchToSalesScheduleSameRole}
            onSelectStudentCode={onSelectStudentCode}
            onOpenLeadCalculator={() => setNonTeacherTab('lead_calculator')}
          />
        ) : nonTeacherTab === 'students' ? (
          <StudentTracking
            role={role}
            students={role === 'cs' ? centerStudents : props.studentTracking}
            teacherName={role === 'cs' ? 'Toàn trung tâm' : (selectedTeacher?.name ?? '')}
            teachers={role === 'cs' ? props.people.teachers : undefined}
            isCenterWide={role === 'cs'}
            onSelectStudent={onSelectActiveStudent}
            onReserveStudent={onReserveStudent}
            onResumeStudent={onResumeStudentRequest}
            redirectParams={mutationRedirectParams}
          />
        ) : nonTeacherTab === 'daily' ? (
          <DailyScheduleView
            role={role}
            personId={personId}
            teacherId={teacherId}
            teachers={props.people.teachers}
            weekDays={props.weekDays}
            timeIntervals={props.timeIntervals}
            availabilities={props.teacherAvailabilities}
            lessons={props.lessonSessions}
            defaultDuration={defaultDuration}
            redirectParams={mutationRedirectParams}
            onLessonClick={onLessonClick}
            onAvailabilityClick={onAvailabilityClick}
            availabilityMode={role === 'sales' ? 'readonly' : 'hidden'}
            onSelectStudentCode={onSelectStudentCode}
          />
        ) : nonTeacherTab === 'ranking' && role !== 'cs' ? (
          <RankingPolicyTab
            role={role}
            studentTracking={props.studentTracking}
            monthKey={monthKey}
            adminStats={props.adminStats}
            currentTeacherId={typeof teacherId === 'number' ? teacherId : undefined}
            currentTeacherName={selectedTeacher?.name}
          />
        ) : nonTeacherTab === 'salary' && role !== 'cs' ? (
          <SalaryCalculator
            teacherId={typeof teacherId === 'number' ? teacherId : (props.people.teachers[0]?.id ?? 0)}
            teacherName={selectedTeacher?.name || 'Tất cả'}
            monthKey={monthKey}
            monthSummary={props.monthSummary}
            studentTracking={props.studentTracking}
            adminStats={props.adminStats}
            mode={props.adminStats && props.adminStats.length > 0 ? 'admin' : 'teacher'}
            role={role}
            monthLessonSessions={props.monthLessonSessions}
            onSwitchToTeacher={onSwitchToTeacherSalary}
            onMonthChange={(newMonth) => onCalendarToolbarChange({ monthKey: newMonth })}
            onSelectStudentCode={onSelectStudentCode}
            redirectParams={mutationRedirectParams}
          />
        ) : nonTeacherTab === 'lead_calculator' ? (
          <LeadCapacityCalculator
            autoEmptySlots={teacherWeeklyEmptySlots}
            autoEmptySource={`Lịch tuần ${weekName} - GV ${selectedTeacher?.name || ''}`}
            onViewSchedule={() => setNonTeacherTab('schedule')}
          />
        ) : (
          <div className="flex flex-col gap-5">
            <RoleScheduleSummary
              role={role}
              teacherName={teacherId === 'all' ? 'Toàn Trung Tâm (Tất cả Giảng Viên)' : (selectedTeacher?.name ?? '')}
              weekSummary={props.weekSummary}
              onEditSchedule={teacherId !== 'all' ? onOpenSalesEditSchedule : undefined}
            />

            {role === 'sales' && isEditScheduleGridMode && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-rose-400 bg-rose-50/95 p-3.5 shadow-sm text-rose-950 animate-in fade-in duration-200">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-200 text-rose-800 font-black">
                    ✏️
                  </span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-rose-900">
                        CHẾ ĐỘ SỬA ĐỔI LỊCH GV (QUYỀN SALES: KHÔNG GIỚI HẠN)
                      </span>
                      <span className="rounded-md bg-amber-200/90 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                        👑 Không giới hạn lượt sửa
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-800 font-medium">
                      Click trực tiếp vào các ô ca rảnh trên lưới để chọn những ca bạn muốn xóa cho GV{' '}
                      <strong>{selectedTeacher?.name}</strong>. Thao tác không trừ hạn mức của giáo viên.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditScheduleGridMode(false)
                      setSelectedDeleteSlotIds(new Set())
                    }}
                    className="h-8 rounded-xl border-rose-300 bg-white px-3 text-xs font-bold text-rose-800 hover:bg-rose-100 cursor-pointer"
                  >
                    Thoát chế độ sửa
                  </Button>
                </div>
              </div>
            )}

            <ScheduleGrid
              role={role}
              personId={personId}
              teacherId={teacherId}
              teachers={props.people.teachers}
              weekDays={props.weekDays}
              timeIntervals={props.timeIntervals}
              availabilities={props.teacherAvailabilities}
              lessons={props.lessonSessions}
              defaultDuration={defaultDuration}
              redirectParams={mutationRedirectParams}
              onLessonClick={onLessonClick}
              onAvailabilityClick={onAvailabilityClick}
              onEmptySlotClick={onEmptySlotClick}
              availabilityMode={role === 'sales' ? 'readonly' : 'hidden'}
              isEditMode={role === 'sales' && isEditScheduleGridMode}
              selectedDeleteIds={selectedDeleteSlotIds}
              onToggleDeleteSlot={onToggleDeleteSlot}
            />

            {role === 'sales' && isEditScheduleGridMode && selectedDeleteSlotIds.size > 0 && (
              <div className="sticky bottom-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-400 bg-rose-700 px-5 py-3 shadow-xl shadow-rose-900/30 text-white animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
                  <span className="text-sm font-black">
                    🗑️ Đang chọn <strong>{selectedDeleteSlotIds.size}</strong> ca rảnh của GV {selectedTeacher?.name}{' '}
                    để xóa
                  </span>
                  <span className="h-4 w-px bg-rose-500 hidden sm:block" />
                  <span className="text-xs font-semibold text-rose-100">
                    👑 Quyền Sales: Không giới hạn số lần sửa và không tính vào hạn mức của giáo viên.
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedDeleteSlotIds(new Set())}
                    className="h-8 rounded-xl border-rose-400 bg-rose-800 px-3 text-xs font-bold text-white hover:bg-rose-900 hover:text-white cursor-pointer"
                  >
                    Bỏ chọn
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={onOpenGridDeleteConfirm}
                    className="h-8 rounded-xl bg-white px-4 text-xs font-extrabold text-rose-800 hover:bg-rose-50 shadow-md cursor-pointer active:scale-95"
                  >
                    Xác nhận xóa {selectedDeleteSlotIds.size} ca →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
