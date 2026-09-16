import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Lock,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatMonthKey } from '../calendar'
import type {
  KpiQuotaState,
  LessonSession,
  Person,
  PersonRole,
  SchedulerMutationRedirectParams,
  SchedulerProps,
  StudentTrackingItem,
  TeacherAvailability,
} from '../types'
import { CalendarToolbar } from './calendar-toolbar'
import { DailyScheduleView } from './daily-schedule-view'
import { KpiPanels } from './kpi-panels'
import { RankingPolicyTab } from './ranking-policy-tab'
import { SalaryCalculator } from './salary-calculator'
import { ScheduleGrid } from './schedule-grid'
import { StudentTracking } from './student-tracking'
import { TeacherTodoListTab } from './teacher-todo-list-tab'

// Kept in sync with the same constant in index.tsx and teacher-sync-schedule-dialog.tsx
// (not imported from index.tsx to avoid a circular module dependency).
const MIN_TEACHER_MONTHLY_COMMITMENT = 110

export type TeacherTab =
  | 'register_cal'
  | 'teaching_cal'
  | 'todo'
  | 'student_tracking'
  | 'dashboard'
  | 'salary'
  | 'ranking'

type CalendarToolbarChange = { monthKey?: string; weekName?: string; teacherId?: number | 'all' | string }

type Props = {
  role: PersonRole
  props: SchedulerProps
  mutationRedirectParams: SchedulerMutationRedirectParams
  teacherTab: TeacherTab
  monthKey: string
  weekName: string
  weekRange: string
  teacherId: number | 'all' | string
  personId: number
  defaultDuration: number
  selectedTeacher?: Person
  onCalendarToolbarChange: (values: CalendarToolbarChange) => void
  onMonthChange: (newMonth: string) => void

  // KPI weekly-target quota
  weeklyTargetInput: string
  setWeeklyTargetInput: (value: string) => void
  weeklyTargetInvalid: boolean
  expectedMonthlyKpi: number
  isKpiQuotaExceeded: boolean
  kpiQuota: KpiQuotaState
  onOpenKpiConfirm: () => void

  // Weekly slot registration + batch save
  currentWeekTotalSlots: number
  projectedMonthSlots: number
  pendingSlots: Set<string>
  setPendingSlots: (value: Set<string>) => void
  onToggleSlot: (date: string, time: string) => void
  batchConfirmOpen: boolean
  setBatchConfirmOpen: (value: boolean) => void
  onSubmitBatch: () => void

  // Grid edit mode (delete mis-registered slots)
  isEditScheduleGridMode: boolean
  setIsEditScheduleGridMode: (value: boolean) => void
  selectedDeleteSlotIds: Set<number>
  setSelectedDeleteSlotIds: (value: Set<number>) => void
  onToggleDeleteSlot: (id: number) => void
  onOpenTeacherEditSchedule: () => void
  onOpenSyncConfirm: () => void
  onOpenGridDeleteConfirm: () => void

  // Teaching calendar view
  scheduleViewMode: 'week' | 'day'
  setScheduleViewMode: (mode: 'week' | 'day') => void
  onLessonClick: (lesson: LessonSession) => void
  onAvailabilityClick: (availability: TeacherAvailability) => void
  onSelectStudentCode: (code: string) => void

  // Todo / student tracking / dashboard / salary / ranking
  onOpenLessonDetail: (lesson: LessonSession) => void
  onSelectActiveStudent: (student: StudentTrackingItem) => void
  onReserveStudent: (student: StudentTrackingItem) => void
  onResumeStudentRequest: (student: StudentTrackingItem) => void
  computedMonthSummary: SchedulerProps['monthSummary']
  displayedWeeklyKpis: SchedulerProps['weeklyKpis']
}

export function TeacherPortal({
  role,
  props,
  mutationRedirectParams,
  teacherTab,
  monthKey,
  weekName,
  weekRange,
  teacherId,
  personId,
  defaultDuration,
  selectedTeacher,
  onCalendarToolbarChange,
  onMonthChange,
  weeklyTargetInput,
  setWeeklyTargetInput,
  weeklyTargetInvalid,
  expectedMonthlyKpi,
  isKpiQuotaExceeded,
  kpiQuota,
  onOpenKpiConfirm,
  currentWeekTotalSlots,
  projectedMonthSlots,
  pendingSlots,
  setPendingSlots,
  onToggleSlot,
  batchConfirmOpen,
  setBatchConfirmOpen,
  onSubmitBatch,
  isEditScheduleGridMode,
  setIsEditScheduleGridMode,
  selectedDeleteSlotIds,
  setSelectedDeleteSlotIds,
  onToggleDeleteSlot,
  onOpenTeacherEditSchedule,
  onOpenSyncConfirm,
  onOpenGridDeleteConfirm,
  scheduleViewMode,
  setScheduleViewMode,
  onLessonClick,
  onAvailabilityClick,
  onSelectStudentCode,
  onOpenLessonDetail,
  onSelectActiveStudent,
  onReserveStudent,
  onResumeStudentRequest,
  computedMonthSummary,
  displayedWeeklyKpis,
}: Props) {
  return (
    <>
      {/* Calendar Toolbar with Today / This Week buttons and integrated week format */}
      <CalendarToolbar
        role={role}
        monthKey={monthKey}
        weekName={weekName}
        weeks={props.weeks}
        teacherId={teacherId}
        teachers={props.people.teachers}
        hideWeekControls={['student_tracking', 'dashboard', 'salary', 'ranking'].includes(teacherTab)}
        onChange={onCalendarToolbarChange}
      />

      {teacherTab === 'register_cal' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3.5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 text-sm">📅</span>
                  <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">
                    Đăng ký ca rảnh tháng {formatMonthKey(monthKey)}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 border border-slate-200/80">
                  ⏱️ Chuẩn: 40 phút / ca
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenTeacherEditSchedule}
                  className="h-8 rounded-xl px-3 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5 border-rose-300 bg-rose-50/80 text-rose-800 hover:bg-rose-100 hover:text-rose-900"
                  title="Sửa đổi lịch đăng ký: Xóa các ca lỡ đăng ký (Không giới hạn số lần)"
                >
                  <Trash2 className="size-3.5 text-rose-600" />
                  <span>Sửa đổi lịch đăng ký</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenSyncConfirm}
                  className="h-8 rounded-xl border-emerald-300 bg-emerald-50/60 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 transition-all shadow-2xs shrink-0 cursor-pointer"
                >
                  <RefreshCw data-icon="inline-start" className="size-3.5 mr-1.5 text-emerald-700" />
                  Sync {weekName} cho các ngày/tuần khác
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Target className="size-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Mục tiêu ca rảnh
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Tuần ➔ Tháng (×4)</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Mỗi tuần:</span>
                    <Input
                      aria-label="Số ca rảnh mỗi tuần"
                      className="w-16 h-8 rounded-xl border-slate-300 bg-white text-center text-xs font-black text-emerald-800 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      min={1}
                      disabled={isKpiQuotaExceeded}
                      onChange={(event) => setWeeklyTargetInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          onOpenKpiConfirm()
                        }
                      }}
                      required
                      step={1}
                      type="number"
                      value={weeklyTargetInput}
                    />
                    <Button
                      aria-label="Lưu số ca rảnh mỗi tuần"
                      size="icon"
                      disabled={weeklyTargetInvalid || isKpiQuotaExceeded}
                      onClick={onOpenKpiConfirm}
                      className="h-8 w-8 rounded-xl shrink-0 cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        isKpiQuotaExceeded
                          ? 'Đã dùng hết 1 lần thay đổi trong tháng (Mục tiêu đã khóa)'
                          : 'Lưu số ca rảnh mỗi tuần (yêu cầu xác nhận)'
                      }
                    >
                      {isKpiQuotaExceeded ? (
                        <Lock className="size-3.5 text-slate-400" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] block font-medium text-slate-500">KPI expect:</span>
                    <strong className="text-xs font-black text-emerald-800 bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded-lg inline-block font-mono">
                      {expectedMonthlyKpi} ca/tháng
                    </strong>
                  </div>
                </div>

                {role === 'teacher' && (
                  <div className="pt-1.5 flex items-center justify-between border-t border-slate-200/60">
                    {isKpiQuotaExceeded ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                        <Lock className="size-3" /> Đã khóa (đã đổi 1 lần trong tháng)
                      </span>
                    ) : kpiQuota.count === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        Còn 1 lần thay đổi trong tháng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                        Chưa chốt mục tiêu tháng này
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-bold font-mono">{kpiQuota.count}/2 lượt</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-teal-200/80 bg-teal-50/40 p-3.5 gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-teal-700 shrink-0" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800">
                      Đang chọn trên lịch
                    </span>
                    <span className="inline-flex size-2 rounded-full bg-teal-500 animate-pulse" title="Live update" />
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-tight">Live</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] block font-bold text-slate-500">{weekName}</span>
                    <div className="flex items-baseline gap-1">
                      <strong className="text-lg font-black text-teal-900">{currentWeekTotalSlots}</strong>
                      <span className="text-[11px] font-bold text-teal-700">ca</span>
                      {pendingSlots.size > 0 && (
                        <span className="rounded-full bg-teal-200/80 px-1.5 py-0.2 text-[9px] font-black text-teal-900">
                          +{pendingSlots.size}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[11px] font-black text-teal-600">➜ ×4 ➜</span>
                    <span className="text-[9px] font-semibold text-slate-400">quy đổi</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] block font-bold text-slate-500">Mở cả tháng</span>
                    <div className="flex items-baseline gap-1 justify-end">
                      <strong
                        className={cn(
                          'text-lg font-black',
                          projectedMonthSlots >= MIN_TEACHER_MONTHLY_COMMITMENT ? 'text-emerald-900' : 'text-amber-900'
                        )}
                      >
                        {projectedMonthSlots}
                      </strong>
                      <span className="text-[11px] font-bold text-slate-600">ca</span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'flex flex-col justify-between rounded-2xl border p-3.5 gap-2 transition-all',
                  projectedMonthSlots >= MIN_TEACHER_MONTHLY_COMMITMENT
                    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                    : 'border-amber-200 bg-amber-50/60 text-amber-950'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Cam kết tối thiểu
                  </span>
                  <span className="text-[11px] font-black text-slate-700">110 ca/tháng</span>
                </div>
                <div>
                  {projectedMonthSlots >= MIN_TEACHER_MONTHLY_COMMITMENT ? (
                    <div className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs">
                      <Sparkles className="size-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Đạt mốc Chuyên nghiệp 🌟 ({projectedMonthSlots}/110)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/90 px-2.5 py-1.5 text-xs font-bold text-amber-900 shadow-2xs">
                      <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                      <span className="truncate">
                        Thiếu {MIN_TEACHER_MONTHLY_COMMITMENT - projectedMonthSlots} ca (Dự kiến {projectedMonthSlots}/110)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isEditScheduleGridMode && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-rose-400 bg-rose-50/95 p-3.5 shadow-sm text-rose-950 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-200 text-rose-800 font-black">
                  ✏️
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-rose-900">
                      CHẾ ĐỘ SỬA ĐỔI LỊCH (CHỌN CA RẢNH ĐỂ XÓA)
                    </span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-900 border border-emerald-300">
                      ✨ Không giới hạn
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 font-medium">
                    Click trực tiếp vào các ô ca rảnh trên lưới để chọn những ca bạn lỡ đăng ký cần xóa.
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
            weekDays={props.weekDays}
            timeIntervals={props.timeIntervals}
            availabilities={props.teacherAvailabilities}
            lessons={[]}
            defaultDuration={defaultDuration}
            redirectParams={mutationRedirectParams}
            onLessonClick={onLessonClick}
            onAvailabilityClick={onAvailabilityClick}
            availabilityMode="interactive"
            pendingSlots={pendingSlots}
            onSlotToggle={onToggleSlot}
            isEditMode={isEditScheduleGridMode}
            selectedDeleteIds={selectedDeleteSlotIds}
            onToggleDeleteSlot={onToggleDeleteSlot}
          />

          {isEditScheduleGridMode && selectedDeleteSlotIds.size > 0 && (
            <div className="sticky bottom-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-400 bg-rose-700 px-5 py-3 shadow-xl shadow-rose-900/30 text-white animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
                <span className="text-sm font-black">
                  🗑️ Đang chọn <strong>{selectedDeleteSlotIds.size}</strong> ca rảnh để xóa
                </span>
                <span className="h-4 w-px bg-rose-500 hidden sm:block" />
                <span className="text-xs font-semibold text-rose-100">
                  ✨ Thao tác không giới hạn số lần, bạn có thể tự do xóa và mở lại ca mới.
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

          {pendingSlots.size > 0 && (
            <div className="sticky bottom-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-300 bg-teal-700 px-5 py-3 shadow-xl shadow-teal-900/30">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-white">
                <span className="text-sm font-black">
                  ✓ Đang chọn <strong>{pendingSlots.size}</strong> ca rảnh mới
                </span>
                <span className="h-4 w-px bg-teal-500 hidden sm:block" />
                <span className="text-xs font-bold text-teal-100">
                  {weekName}: <strong>{currentWeekTotalSlots}</strong> ca/tuần ➜ Sync cả tháng (x4):{' '}
                  <strong
                    className={
                      projectedMonthSlots >= MIN_TEACHER_MONTHLY_COMMITMENT
                        ? 'text-emerald-200 font-black'
                        : 'text-amber-200 font-black'
                    }
                  >
                    {projectedMonthSlots} ca/tháng
                  </strong>
                </span>
                {projectedMonthSlots < MIN_TEACHER_MONTHLY_COMMITMENT ? (
                  <span className="rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 px-2.5 py-0.5 text-[11px] font-bold">
                    ⚠️ Thiếu {MIN_TEACHER_MONTHLY_COMMITMENT - projectedMonthSlots} ca so với mốc 110 ca
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                    ✅ Đạt mốc 110 ca 🌟
                  </span>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingSlots(new Set())}
                  className="h-8 rounded-xl border-teal-400 bg-teal-800 px-3 text-xs font-bold text-white hover:bg-teal-900 hover:text-white"
                >
                  Huỷ chọn
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setBatchConfirmOpen(true)}
                  className="h-8 rounded-xl bg-white px-4 text-xs font-extrabold text-teal-800 hover:bg-teal-50 shadow-md"
                >
                  Lưu {pendingSlots.size} ca (Dự kiến {projectedMonthSlots} ca/tháng) →
                </Button>
              </div>
            </div>
          )}

          {batchConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
              <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    Bạn đang xác nhận mở {projectedMonthSlots} ca trong tháng {formatMonthKey(monthKey)}?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Lưu <strong>{pendingSlots.size} ca mới</strong> cho {weekName} (Tuần này có {currentWeekTotalSlots} ca
                    ➔ x4: {projectedMonthSlots} ca sẽ mở trong tháng).
                  </p>
                </div>

                <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-3.5 text-xs text-teal-950 space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-teal-900">
                    <Target className="size-4 text-teal-700 shrink-0" />
                    <span>Cam kết tối thiểu: 110 ca/tháng</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    GV cần mở tối thiểu <strong>110 ca trong tháng</strong> để đảm bảo đủ lịch dạy và đạt mốc hoạt động
                    (Mốc <strong>Chuyên nghiệp 🌟</strong> tương ứng với 110 ca).
                  </p>
                </div>

                {projectedMonthSlots < MIN_TEACHER_MONTHLY_COMMITMENT ? (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-2 font-black text-amber-800">
                      <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                      <span>⚠️ Chưa đạt cam kết tối thiểu!</span>
                    </div>
                    <p className="leading-relaxed text-amber-900">
                      Bạn chỉ đang xác nhận mở <strong>{projectedMonthSlots} ca</strong> trong tháng{' '}
                      {formatMonthKey(monthKey)} (thiếu{' '}
                      <strong>{MIN_TEACHER_MONTHLY_COMMITMENT - projectedMonthSlots} ca</strong> để đạt mốc tối thiểu
                      110 ca/tháng). GV cần mở tối thiểu 110 ca trong tháng để đảm bảo đủ lịch dạy và đạt mốc hoạt
                      động.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-950 space-y-1">
                    <div className="flex items-center gap-2 font-black text-emerald-800">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>✅ Đạt mốc hoạt động cam kết!</span>
                    </div>
                    <p className="leading-relaxed text-emerald-900">
                      Bạn đang xác nhận mở <strong>{projectedMonthSlots} ca</strong> trong tháng{' '}
                      {formatMonthKey(monthKey)} (Đạt mốc cam kết tối thiểu 110 ca/tháng - Mốc Chuyên nghiệp 🌟).
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                    <span>Danh sách {pendingSlots.size} ca rảnh mới:</span>
                    <span className="text-slate-400">Trùng lịch sẽ tự động bỏ qua</span>
                  </div>
                  <ul className="max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    {Array.from(pendingSlots)
                      .sort()
                      .map((key) => {
                        const [date, time] = key.split('|')
                        const day = props.weekDays.find((d) => d.isoDate === date)
                        return (
                          <li key={key} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <span className="font-mono text-teal-600">✓</span>
                            <span>
                              {day?.name ?? date} ({day?.dateFormatted ?? date})
                            </span>
                            <span className="ml-auto font-mono text-slate-500">{time}</span>
                          </li>
                        )
                      })}
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBatchConfirmOpen(false)}
                    className="rounded-xl px-4 text-xs font-bold"
                  >
                    Quay lại / Chọn thêm ca
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={onSubmitBatch}
                    className="rounded-xl bg-teal-700 px-5 text-xs font-extrabold text-white hover:bg-teal-800 shadow-sm"
                  >
                    Xác nhận mở ca
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {teacherTab === 'teaching_cal' && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                📅 Lịch Dạy Thực Tế ({weekName}: {weekRange})
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Chuyển đổi linh hoạt giữa xem theo Tuần và xem chi tiết theo Ngày
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('week')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5',
                    scheduleViewMode === 'week'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <CalendarDays className="size-3.5" />
                  <span>Xem Lịch Tuần</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('day')}
                  className={cn(
                    'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5',
                    scheduleViewMode === 'day'
                      ? 'bg-white text-emerald-800 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Calendar className="size-3.5" />
                  <span>Xem Theo Ngày</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs shadow-inner">
                <div title="Số ca book tính ở Lịch Sales tuần này">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Ca Book (Sales)</span>
                  <strong className="text-sm font-black text-blue-600">{props.weekSummary.bookedCa} ca</strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div title="Số ca mở tính ở tab Đăng Ký Lịch tuần này">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Ca Mở (Đăng Ký)</span>
                  <strong className="text-sm font-black text-emerald-700">
                    {props.weekSummary.totalCa ?? props.weekSummary.availableCa} ca
                  </strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div title="Fill Rate = (Ca Book Sales ÷ Ca Mở Đăng Ký) × 100%">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Fill Rate</span>
                  <strong className="text-sm font-black text-indigo-600">
                    {props.weekSummary.fillRatePercentage ??
                      ((props.weekSummary.totalCa ?? props.weekSummary.availableCa) > 0
                        ? Math.round(
                            (props.weekSummary.bookedCa / (props.weekSummary.totalCa ?? props.weekSummary.availableCa)) *
                              100
                          )
                        : 0)}
                    %
                  </strong>
                </div>
                {(props.weekSummary.completedCa ?? 0) > 0 && (
                  <>
                    <div className="h-6 w-px bg-slate-200" />
                    <div title="Done Rate = (Ca Hoàn Thành ÷ Ca Book Sales) × 100%">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">Done Rate</span>
                      <strong className="text-sm font-black text-purple-600">
                        {props.weekSummary.doneRatePercentage ??
                          (props.weekSummary.bookedCa > 0
                            ? Math.round(((props.weekSummary.completedCa ?? 0) / props.weekSummary.bookedCa) * 100)
                            : 0)}
                        %
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {scheduleViewMode === 'day' ? (
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
              availabilityMode="hidden"
              onSelectStudentCode={onSelectStudentCode}
            />
          ) : (
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
              availabilityMode="hidden"
            />
          )}
        </div>
      )}

      {teacherTab === 'todo' && (
        <TeacherTodoListTab
          role={role}
          studentTracking={props.studentTracking}
          monthLessonSessions={props.monthLessonSessions}
          lessonSessions={props.lessonSessions}
          selectedTeacherId={selectedTeacher?.id}
          redirectParams={mutationRedirectParams}
          onOpenLessonDetail={onOpenLessonDetail}
          onOpenStudentSessions={(code) => onSelectStudentCode(code)}
        />
      )}

      {teacherTab === 'student_tracking' && (
        <StudentTracking
          role={role}
          students={props.studentTracking}
          teacherName={selectedTeacher?.name ?? ''}
          onSelectStudent={onSelectActiveStudent}
          onReserveStudent={onReserveStudent}
          onResumeStudent={onResumeStudentRequest}
          redirectParams={mutationRedirectParams}
        />
      )}

      {teacherTab === 'dashboard' && (
        <KpiPanels
          monthSummary={computedMonthSummary}
          monthKey={monthKey}
          weeklyKpis={displayedWeeklyKpis}
          editableWeeklyTargets={false}
          studentTracking={props.studentTracking}
        />
      )}

      {teacherTab === 'salary' && (
        <SalaryCalculator
          teacherId={teacherId}
          teacherName={selectedTeacher?.name}
          monthKey={monthKey}
          monthSummary={props.monthSummary}
          mode="teacher"
          role={role}
          monthLessonSessions={props.monthLessonSessions}
          studentTracking={props.studentTracking}
          onMonthChange={onMonthChange}
          onSelectStudentCode={onSelectStudentCode}
          redirectParams={mutationRedirectParams}
        />
      )}

      {teacherTab === 'ranking' && (
        <RankingPolicyTab
          role={role}
          studentTracking={props.studentTracking}
          monthKey={monthKey}
          currentTeacherId={typeof teacherId === 'number' ? teacherId : (selectedTeacher?.id ?? 0)}
          currentTeacherName={selectedTeacher?.name}
        />
      )}
    </>
  )
}
