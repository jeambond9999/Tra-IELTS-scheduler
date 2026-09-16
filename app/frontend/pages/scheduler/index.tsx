import { Head, router, usePage } from '@inertiajs/react'
import {
  AlertTriangle,
  Calculator,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Lock,
  LogOut,
  PieChart,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  batchCreateTeacherAvailabilitiesPath,
  batchDestroyTeacherAvailabilitiesPath,
  rootPath,
  syncWeekTeacherAvailabilitiesPath,
  teacherPath,
} from '@/lib/routes'
import { cn } from '@/lib/utils'
import { formatMonthKey } from './calendar'
import { AdminDashboard } from './components/admin-dashboard'
import { AvailabilityDetailDialog } from './components/availability-detail-dialog'
import { CalendarToolbar } from './components/calendar-toolbar'
import { CSReminderBanner } from './components/cs-reminder-banner'
import { DailyScheduleView } from './components/daily-schedule-view'
import { EditEnrollmentDialog } from './components/edit-enrollment-dialog'
import { GlobalStudentSearch } from './components/global-student-search'
import { KpiPanels } from './components/kpi-panels'
import { LeadCapacityCalculator, LeadCapacityCalculatorDialog } from './components/lead-capacity-calculator'
import { LessonDetailDialog } from './components/lesson-detail-dialog'
import { RankingPolicyTab } from './components/ranking-policy-tab'
import { RescheduleDialog } from './components/reschedule-dialog'
import { ReservationDialog } from './components/reservation-dialog'
import { ResumeReservationDialog } from './components/resume-reservation-dialog'
import { RolePersonSelector } from './components/role-person-selector'
import { SalaryCalculator } from './components/salary-calculator'
import { SalesBookingDialog } from './components/sales-booking-dialog'
import { SalesOverviewDashboard } from './components/sales-overview-dashboard'
import { ScheduleGrid } from './components/schedule-grid'
import { StudentTracking } from './components/student-tracking'
import { StudentSessionsDialog } from './components/student-sessions-dialog'
import { TeacherEditScheduleDialog } from './components/teacher-edit-schedule-dialog'
import { TeacherKpiConfirmDialog } from './components/teacher-kpi-confirm-dialog'
import { TeacherSyncScheduleDialog } from './components/teacher-sync-schedule-dialog'
import { TeacherTodoListTab } from './components/teacher-todo-list-tab'
import { UserManagement } from './components/user-management'
import logoImg from '@/images/logo.png'
import type {
  Enrollment,
  LessonSession,
  PersonRole,
  SchedulerMutationRedirectParams,
  SchedulerProps,
  TeacherAvailability,
  UserAccount,
} from './types'

export const DEFAULT_AVAILABILITY_DURATION = 40
export const MIN_TEACHER_MONTHLY_COMMITMENT = 110
const WEEKLY_TARGET_STORAGE_KEY = 'traielts_scheduler_weekly_targets'

export interface ScheduleEditQuotaState {
  count: number
  lastModified?: string
}

function getScheduleEditQuotaKey(teacherId: string | number, monthKey: string) {
  return `meng_schedule_edit_quota_${teacherId}_${monthKey}`
}

function readScheduleEditQuota(teacherId: string | number, monthKey: string): ScheduleEditQuotaState {
  if (typeof window === 'undefined') return { count: 0 }
  try {
    const raw = window.localStorage.getItem(getScheduleEditQuotaKey(teacherId, monthKey))
    if (!raw) return { count: 0 }
    return JSON.parse(raw) as ScheduleEditQuotaState
  } catch {
    return { count: 0 }
  }
}

function writeScheduleEditQuota(teacherId: string | number, monthKey: string, data: ScheduleEditQuotaState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getScheduleEditQuotaKey(teacherId, monthKey), JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save schedule edit quota', e)
  }
}

interface KpiQuotaState {
  count: number
  initialTarget?: number
  updatedTarget?: number
  lastUpdated?: string
}

function getKpiQuotaKey(teacherId: string | number, monthKey: string) {
  return `meng_kpi_quota_${teacherId}_${monthKey}`
}

function readKpiQuota(teacherId: string | number, monthKey: string): KpiQuotaState {
  if (typeof window === 'undefined') return { count: 0 }
  try {
    const raw = window.localStorage.getItem(getKpiQuotaKey(teacherId, monthKey))
    if (!raw) return { count: 0 }
    return JSON.parse(raw) as KpiQuotaState
  } catch {
    return { count: 0 }
  }
}

function writeKpiQuota(teacherId: string | number, monthKey: string, data: KpiQuotaState) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(getKpiQuotaKey(teacherId, monthKey), JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save KPI quota', e)
  }
}

export default function SchedulerIndex(props: SchedulerProps) {
  const pageProps = usePage().props as unknown as { user?: UserAccount }
  const currentUser = pageProps.user || null

  const [role, setRole] = useState<PersonRole>(props.selected.role)
  const [personId, setPersonId] = useState(props.selected.personId)
  const [teacherId, setTeacherId] = useState<number | 'all' | string>(props.selected.teacherId)
  const [monthKey, setMonthKey] = useState(props.selected.monthKey)
  const [weekName, setWeekName] = useState(props.selected.weekName)
  const [defaultDuration] = useState(DEFAULT_AVAILABILITY_DURATION)
  const [activeLesson, setActiveLesson] = useState<LessonSession | null>(null)
  const [activeAvailability, setActiveAvailability] = useState<TeacherAvailability | null>(null)
  const [activeStudentForSessions, setActiveStudentForSessions] = useState<
    SchedulerProps['studentTracking'][number] | null
  >(null)
  const [reservationStudent, setReservationStudent] = useState<
    SchedulerProps['studentTracking'][number] | null
  >(null)
  const [resumeStudent, setResumeStudent] = useState<
    SchedulerProps['studentTracking'][number] | null
  >(null)
  const [nonTeacherTab, setNonTeacherTab] = useState<
    'sales_dashboard' | 'schedule' | 'daily' | 'students' | 'ranking' | 'salary' | 'lead_calculator'
  >(props.selected.role === 'sales' ? 'sales_dashboard' : 'schedule')
  const [adminTab, setAdminTab] = useState<'dashboard' | 'sales_dashboard' | 'salary' | 'ranking' | 'lead_calculator' | 'users'>('dashboard')
  const [scheduleViewMode, setScheduleViewMode] = useState<'week' | 'day'>('week')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false)
  const [pendingSlots, setPendingSlots] = useState<Set<string>>(new Set())
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false)
  const [rescheduleLesson, setRescheduleLesson] = useState<LessonSession | null>(null)
  const [editEnrollment, setEditEnrollment] = useState<Enrollment | null>(null)
  const [weeklyTargetOverrides, setWeeklyTargetOverrides] = useState<Record<string, number>>(() =>
    readWeeklyTargetOverrides()
  )
  const [teacherTab, setTeacherTab] = useState<
    'register_cal' | 'teaching_cal' | 'todo' | 'student_tracking' | 'dashboard' | 'salary' | 'ranking'
  >('register_cal')
  const [leadCalculatorOpen, setLeadCalculatorOpen] = useState(false)
  const [kpiConfirmOpen, setKpiConfirmOpen] = useState(false)

  const effectiveTeacherId = role === 'teacher' ? personId : teacherId
  const [kpiQuota, setKpiQuota] = useState<KpiQuotaState>(() => readKpiQuota(effectiveTeacherId, monthKey))

  useEffect(() => {
    setKpiQuota(readKpiQuota(effectiveTeacherId, monthKey))
  }, [effectiveTeacherId, monthKey])

  const isKpiQuotaExceeded = role === 'teacher' && kpiQuota.count >= 2

  const [scheduleEditQuota, setScheduleEditQuota] = useState<ScheduleEditQuotaState>(() =>
    readScheduleEditQuota(effectiveTeacherId, monthKey)
  )
  const [teacherEditScheduleOpen, setTeacherEditScheduleOpen] = useState(false)
  const [isEditScheduleGridMode, setIsEditScheduleGridMode] = useState(false)
  const [selectedDeleteSlotIds, setSelectedDeleteSlotIds] = useState<Set<number>>(new Set())
  const [gridDeleteConfirmOpen, setGridDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    setScheduleEditQuota(readScheduleEditQuota(effectiveTeacherId, monthKey))
    setIsEditScheduleGridMode(false)
    setSelectedDeleteSlotIds(new Set())
  }, [effectiveTeacherId, monthKey])

  const isScheduleEditQuotaExceeded = role === 'teacher' && scheduleEditQuota.count >= 2

  const pendingTakeNotesCount = useMemo(() => {
    let count = 0
    const seenIds = new Set<number>()
    for (const student of props.studentTracking || []) {
      for (const s of student.sessions || []) {
        if (seenIds.has(s.id)) continue
        seenIds.add(s.id)
        const note = s.lessonNotes || s.lesson_notes
        if (note && /\[Take notes[^\]]*\]/i.test(note)) {
          if (!/hoàn\s*thành|đã\s*chữa|done|completed/i.test(note)) {
            count++
          }
        }
      }
    }
    for (const s of props.monthLessonSessions || []) {
      if (seenIds.has(s.id)) continue
      seenIds.add(s.id)
      const note = s.lessonNotes
      if (note && /\[Take notes[^\]]*\]/i.test(note)) {
        if (!/hoàn\s*thành|đã\s*chữa|done|completed/i.test(note)) {
          count++
        }
      }
    }
    return count
  }, [props.studentTracking, props.monthLessonSessions])

  const currentCenterEmptySlots = useMemo(() => {
    if (props.adminStats && props.adminStats.length > 0) {
      const availableCa = props.adminStats.reduce((s, t) => s + t.monthSummary.availableCa, 0)
      if (availableCa > 0) return availableCa
      const totalCa = props.adminStats.reduce((s, t) => s + t.monthSummary.totalCa, 0)
      const bookedCa = props.adminStats.reduce((s, t) => s + t.monthSummary.bookedCa, 0)
      return Math.max(0, totalCa - bookedCa)
    }
    return 46
  }, [props.adminStats])

  const teacherWeeklyEmptySlots = useMemo(() => {
    if (props.weekSummary && typeof props.weekSummary.availableCa === 'number' && props.weekSummary.availableCa > 0) {
      return props.weekSummary.availableCa
    }
    if (props.teacherAvailabilities && props.teacherAvailabilities.length > 0) {
      return props.teacherAvailabilities.length
    }
    return 46
  }, [props.weekSummary, props.teacherAvailabilities])

  const selectedTeacher = useMemo(
    () => props.people.teachers.find((teacher) => teacher.id === teacherId),
    [props.people.teachers, teacherId]
  )
  const selectedPerson = useMemo(
    () => peopleForRole(role, props.people).find((person) => person.id === personId),
    [personId, props.people, role]
  )
  const weekRange = useMemo(() => {
    const firstDay = props.weekDays[0]
    const lastDay = props.weekDays[props.weekDays.length - 1]

    if (!firstDay || !lastDay) return ''

    return `Từ ${firstDay.dateFormatted} đến ${lastDay.dateFormatted}/${firstDay.yearNum}`
  }, [props.weekDays])
  const [weeklyTargetInput, setWeeklyTargetInput] = useState(
    String(selectedTeacher?.weeklyAvailabilityTarget ?? 28)
  )

  const redirectParams = useMemo(
    () => ({ role, personId, teacherId, monthKey, weekName }),
    [role, personId, teacherId, monthKey, weekName]
  )
  const mutationRedirectParams = useMemo<SchedulerMutationRedirectParams>(
    () => ({
      role,
      person_id: personId,
      teacher_id: teacherId,
      month_key: monthKey,
      week_name: weekName,
    }),
    [monthKey, personId, role, teacherId, weekName]
  )

  const centerStudents = useMemo(() => {
    const map = new Map<string, SchedulerProps['studentTracking'][number]>()

    if (props.adminStats && props.adminStats.length > 0) {
      props.adminStats.forEach((stat) => {
        stat.studentTracking?.forEach((student) => {
          const key = student.enrollmentId
            ? `enr-${student.enrollmentId}`
            : `${student.studentCode}-${student.course}`
          if (!map.has(key)) {
            map.set(key, {
              ...student,
              teacherId: student.teacherId ?? stat.teacherId,
              teacherName: student.teacherName || stat.teacherName,
            })
          }
        })
      })
    }

    props.studentTracking.forEach((student) => {
      const key = student.enrollmentId
        ? `enr-${student.enrollmentId}`
        : `${student.studentCode}-${student.course}`
      if (!map.has(key)) {
        map.set(key, {
          ...student,
          teacherId: student.teacherId ?? selectedTeacher?.id,
          teacherName: student.teacherName || selectedTeacher?.name || '',
        })
      }
    })

    return Array.from(map.values())
  }, [props.adminStats, props.studentTracking, selectedTeacher])

  const currentActiveStudentForSessions = useMemo(() => {
    if (!activeStudentForSessions) return null
    const pool = role === 'cs' ? centerStudents : props.studentTracking
    return (
      pool.find(
        (s) =>
          (activeStudentForSessions.enrollmentId &&
            s.enrollmentId === activeStudentForSessions.enrollmentId) ||
          s.studentCode === activeStudentForSessions.studentCode
      ) || activeStudentForSessions
    )
  }, [activeStudentForSessions, centerStudents, props.studentTracking, role])

  const currentReservationStudent = useMemo(() => {
    if (!reservationStudent) return null
    const pool = role === 'cs' ? centerStudents : props.studentTracking
    return (
      pool.find(
        (s) =>
          (reservationStudent.enrollmentId &&
            s.enrollmentId === reservationStudent.enrollmentId) ||
          s.studentCode === reservationStudent.studentCode
      ) || reservationStudent
    )
  }, [centerStudents, props.studentTracking, reservationStudent, role])

  const currentResumeStudent = useMemo(() => {
    if (!resumeStudent) return null
    const pool = role === 'cs' ? centerStudents : props.studentTracking
    return (
      pool.find(
        (s) =>
          (resumeStudent.enrollmentId &&
            s.enrollmentId === resumeStudent.enrollmentId) ||
          s.studentCode === resumeStudent.studentCode
      ) || resumeStudent
    )
  }, [centerStudents, props.studentTracking, resumeStudent, role])
  const [bookingPrefill, setBookingPrefill] = useState<{ dayName: string; time: string; date: string } | null>(null)
  const weeklyTargetValue = Number(weeklyTargetInput)
  const weeklyTargetInvalid = !Number.isInteger(weeklyTargetValue) || weeklyTargetValue <= 0
  const expectedMonthlyKpi = !weeklyTargetInvalid ? weeklyTargetValue * 4 : 0

  const currentWeekSavedAvailabilities = useMemo(() => {
    if (teacherId === 'all') return props.teacherAvailabilities.length
    return props.teacherAvailabilities.filter(
      (a) => a.teacherId === Number(teacherId)
    ).length
  }, [props.teacherAvailabilities, teacherId])

  const currentWeekTotalSlots = currentWeekSavedAvailabilities + pendingSlots.size
  const projectedMonthSlots = currentWeekTotalSlots * 4

  const displayedWeeklyKpis = useMemo(() => {
    return props.weeklyKpis.map((week) => {
      const target = weeklyTargetValue > 0 ? weeklyTargetValue : week.target
      return {
        ...week,
        target,
        pct: target > 0 ? Math.round((week.count / target) * 100) : 0,
      }
    })
  }, [props.weeklyKpis, weeklyTargetValue])

  const computedMonthSummary = useMemo(() => {
    const weeklySum = displayedWeeklyKpis.reduce((sum, w) => sum + (w.count || 0), 0)
    const baseTotalCa = displayedWeeklyKpis.length > 0 ? weeklySum : props.monthSummary.totalCa
    const baseAvailableCa = displayedWeeklyKpis.length > 0 ? weeklySum : props.monthSummary.availableCa

    if (weeklyTargetValue > 0) {
      const commitment = weeklyTargetValue * 4
      const kpiPct =
        commitment > 0
          ? Math.round((baseTotalCa / commitment) * 100)
          : props.monthSummary.kpiPercentage
      return {
        ...props.monthSummary,
        totalCa: baseTotalCa,
        availableCa: baseAvailableCa,
        monthlyCommitment: commitment,
        kpiPercentage: kpiPct,
      }
    }
    return {
      ...props.monthSummary,
      totalCa: baseTotalCa,
      availableCa: baseAvailableCa,
    }
  }, [props.monthSummary, weeklyTargetValue, displayedWeeklyKpis])

  const handleViewStudentSessions = (studentCode: string) => {
    const pool = role === 'cs' ? centerStudents : props.studentTracking
    const foundInTracking = pool.find((s) => s.studentCode === studentCode)
    if (foundInTracking) {
      setActiveStudentForSessions(foundInTracking)
      return
    }

    const enr = props.enrollments?.find((e) => e.student.code === studentCode)
    if (enr) {
      const total = enr.sessions?.length || enr.totalSessions || 0
      const completed =
        enr.sessions?.filter(
          (s) => s.csStatus === 'completed' || s.lessonStatus === 'completed'
        ).length || 0

      setActiveStudentForSessions({
        enrollmentId: enr.id,
        teacherId: enr.teacherId,
        teacherName: enr.teacher?.name,
        studentName: enr.student.name,
        studentCode: enr.student.code,
        course: enr.courseName,
        baseline: enr.student.baseline,
        aim: enr.student.aim,
        examDate: enr.student.examDate,
        studentNote: enr.student.studentNote,
        paymentStatus: enr.paymentStatus,
        tuitionNote: enr.tuitionNote,
        total,
        completed,
        remaining: total - completed,
        pct: total > 0 ? Math.round((completed / total) * 100) : 0,
        almostEnd: total > 0 && (total - completed) <= 2,
        sessions: enr.sessions ?? [],
      })
    }
  }

  useEffect(() => {
    const quota = readKpiQuota(effectiveTeacherId, monthKey)
    const savedForMonth = quota.updatedTarget ?? quota.initialTarget
    if (savedForMonth) {
      setWeeklyTargetInput(String(savedForMonth))
    } else if (selectedTeacher?.weeklyAvailabilityTarget) {
      setWeeklyTargetInput(String(selectedTeacher.weeklyAvailabilityTarget))
    } else {
      setWeeklyTargetInput(String(28))
    }
  }, [effectiveTeacherId, monthKey, selectedTeacher?.id, selectedTeacher?.weeklyAvailabilityTarget])

  useEffect(() => {
    setRole(props.selected.role)
    setPersonId(props.selected.personId)
    setTeacherId(props.selected.teacherId)
    setMonthKey(props.selected.monthKey)
    setWeekName(props.selected.weekName)
  }, [
    props.selected.monthKey,
    props.selected.personId,
    props.selected.role,
    props.selected.teacherId,
    props.selected.weekName,
  ])

  // Clear pending selections whenever week/teacher changes
  useEffect(() => {
    setPendingSlots(new Set())
    setBatchConfirmOpen(false)
  }, [props.selected.weekName, props.selected.teacherId, props.selected.monthKey])

  const reload = (values: Partial<typeof redirectParams>) => {
    router.get(
      rootPath(),
      { ...redirectParams, ...values },
      { preserveState: true, preserveScroll: true }
    )
  }

  const changeRolePerson = (nextRole: PersonRole, nextPersonId: number) => {
    const nextTeacherId =
      nextRole === 'teacher'
        ? nextPersonId
        : nextRole === 'cs'
          ? 'all'
          : teacherId === 'all'
            ? (props.people.teachers[0]?.id ?? 1)
            : teacherId
    setRole(nextRole)
    setPersonId(nextPersonId)
    setTeacherId(nextTeacherId)
    if (nextRole === 'sales' && nonTeacherTab === 'ranking') {
      setNonTeacherTab('schedule')
    } else if (nextRole === 'cs' && (nonTeacherTab === 'ranking' || nonTeacherTab === 'salary' || nonTeacherTab === 'lead_calculator')) {
      setNonTeacherTab('schedule')
    }
    reload({ role: nextRole, personId: nextPersonId, teacherId: nextTeacherId })
  }

  const handleOpenKpiConfirm = () => {
    if (weeklyTargetInvalid || teacherId === 'all') return
    if (isKpiQuotaExceeded) {
      toast.error('Bạn đã dùng hết số lần đặt/đổi mục tiêu KPI cho tháng này (tối đa 1 lần đặt ban đầu + 1 lần đổi).')
      return
    }
    setKpiConfirmOpen(true)
  }

  const handleConfirmSaveKpiTarget = () => {
    setKpiConfirmOpen(false)
    const nextCount = kpiQuota.count + 1
    const nextQuota: KpiQuotaState = {
      ...kpiQuota,
      count: nextCount,
      ...(nextCount === 1 ? { initialTarget: weeklyTargetValue } : { updatedTarget: weeklyTargetValue }),
      lastUpdated: new Date().toISOString(),
    }
    setKpiQuota(nextQuota)
    writeKpiQuota(effectiveTeacherId, monthKey, nextQuota)

    saveWeeklyAvailabilityTarget()
  }

  const saveWeeklyAvailabilityTarget = () => {
    if (weeklyTargetInvalid || teacherId === 'all') return

    router.patch(
      teacherPath(Number(teacherId)),
      {
        person: { weekly_availability_target: weeklyTargetValue },
        ...mutationRedirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          if (expectedMonthlyKpi < MIN_TEACHER_MONTHLY_COMMITMENT) {
            toast.warning(
              `⚠️ Đã lưu ${weeklyTargetValue} ca/tuần (KPI expect: ${expectedMonthlyKpi} ca/tháng). Lưu ý: Cam kết tối thiểu là ${MIN_TEACHER_MONTHLY_COMMITMENT} ca/tháng để đảm bảo mốc Chuyên nghiệp 🌟.`
            )
          } else {
            toast.success(
              `🎯 Đã lưu ${weeklyTargetValue} ca/tuần (KPI expect: ${expectedMonthlyKpi} ca/tháng - Đạt mốc Chuyên nghiệp 🌟)`
            )
          }
        },
      }
    )
  }

  const updateWeeklyTargetOverride = (week: string, target: number) => {
    const nextOverrides = {
      ...weeklyTargetOverrides,
      [weeklyTargetOverrideKey(teacherId, monthKey, week)]: target,
    }

    setWeeklyTargetOverrides(nextOverrides)
    writeWeeklyTargetOverrides(nextOverrides)
  }

  const toggleSlot = useCallback((date: string, time: string) => {
    const key = `${date}|${time}`
    setPendingSlots((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const submitBatch = () => {
    const slots = Array.from(pendingSlots).map((key) => {
      const [available_on, start_time] = key.split('|')
      return { available_on, start_time }
    })
    setBatchConfirmOpen(false)
    setPendingSlots(new Set())
    router.post(
      batchCreateTeacherAvailabilitiesPath(),
      {
        teacher_id: teacherId,
        duration_minutes: defaultDuration,
        slots,
        ...mutationRedirectParams,
      },
      { preserveScroll: true }
    )
  }

  const toggleDeleteSlotId = useCallback((id: number) => {
    setSelectedDeleteSlotIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleOpenSalesEditSchedule = () => {
    if (teacherId === 'all' || !selectedTeacher) {
      toast.info('💡 Vui lòng chọn một giáo viên cụ thể từ danh sách "Xem lịch GV" để sửa đổi lịch đăng ký.')
      return
    }
    setTeacherEditScheduleOpen(true)
  }

  const handleBatchDeleteAvailabilities = (ids: number[]) => {
    if (ids.length === 0) return

    setIsEditScheduleGridMode(false)
    setSelectedDeleteSlotIds(new Set())
    setGridDeleteConfirmOpen(false)

    const targetTeacherId =
      role === 'teacher'
        ? effectiveTeacherId
        : (typeof teacherId === 'number' ? teacherId : (selectedTeacher?.id ?? effectiveTeacherId))

    router.post(
      batchDestroyTeacherAvailabilitiesPath(),
      {
        teacher_id: targetTeacherId,
        ids,
        ...mutationRedirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          if (role === 'sales' || role === 'admin') {
            toast.success(
              `✅ (Sales) Đã xóa ${ids.length} ca rảnh của GV ${selectedTeacher?.name || ''} thành công.`
            )
          } else {
            toast.success(`✅ Đã xóa thành công ${ids.length} ca rảnh.`)
          }
        },
        onError: () => {
          toast.error('Có lỗi xảy ra khi xóa ca rảnh. Vui lòng thử lại.')
        },
      }
    )
  }

  const handleSingleAvailabilityDeleteSuccess = () => {
    toast.success('✅ Đã xóa ca rảnh thành công.')
  }


  return (
    <div className="min-h-screen select-none bg-slate-100 font-sans text-slate-800 antialiased">
      <Head title="tràielts Scheduler" />
      <main className="scheduler-portal-shell mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-col gap-5">
          <header className="relative z-40 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm space-y-3.5">
            {/* Top Tier: Logo, Title, and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left: Brand Logo + Portal Title + Subtitle */}
              <div className="flex items-center gap-3.5 shrink-0 min-w-0">
                <img
                  src={logoImg}
                  alt="tràielts"
                  className="h-8 sm:h-9 w-auto object-contain shrink-0"
                />
                <div className="h-7 w-[1.5px] bg-slate-200 shrink-0 hidden sm:block" />
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 whitespace-nowrap">
                      {portalTitle(role)}
                    </h1>
                    {role === 'admin' ? (
                      <span className="rounded-full bg-slate-900 text-white border border-slate-800 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                        👑 Admin
                      </span>
                    ) : role === 'teacher' ? (
                      <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2.5 py-0.5 text-[11px] font-extrabold shrink-0 shadow-2xs">
                        👨‍🏫 GV: {selectedPerson?.name || 'Giảng viên'}
                      </span>
                    ) : role === 'sales' ? (
                      <span className="rounded-full bg-amber-50 text-amber-900 border border-amber-200/90 px-2.5 py-0.5 text-[11px] font-extrabold shrink-0 shadow-2xs">
                        💼 Sales: {selectedPerson?.name || 'Tư vấn viên'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-purple-50 text-purple-900 border border-purple-200/90 px-2.5 py-0.5 text-[11px] font-extrabold shrink-0 shadow-2xs">
                        🎧 CS: {selectedPerson?.name || 'Chăm sóc HV'}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500 hidden sm:block whitespace-nowrap">
                    {portalSubtitle(role)}
                  </p>
                </div>
              </div>

              {/* Right: Lead Calculator + Search */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
                {(role === 'sales' || role === 'admin') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (role === 'admin') setAdminTab('lead_calculator')
                      else setNonTeacherTab('lead_calculator')
                    }}
                    className="h-9 gap-1.5 rounded-2xl border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-xs font-black shadow-2xs cursor-pointer shrink-0"
                    title="Lead Capacity Calculator: Tự động tính số lead mới cần có dựa trên capacity GV và tỷ lệ chốt sale"
                  >
                    <Calculator className="size-3.5 text-emerald-700" />
                    <span>Lead Calculator</span>
                  </Button>
                )}
                <div className="w-full sm:w-64 md:w-72 shrink-0">
                  <GlobalStudentSearch
                    students={props.studentTracking}
                    adminStats={props.adminStats}
                    onSelectStudent={(code) => handleViewStudentSessions(code)}
                  />
                </div>

                {currentUser && (
                  <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-slate-200 shrink-0">
                    <div className="hidden xl:flex flex-col items-end text-right">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {currentUser.name || currentUser.email}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                        {currentUser.email}
                      </span>
                    </div>
                    <form action="/users/sign_out" method="post">
                      <input type="hidden" name="_method" value="delete" />
                      <input
                        type="hidden"
                        name="authenticity_token"
                        value={
                          typeof document !== 'undefined'
                            ? document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
                            : ''
                        }
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="xs"
                        className="h-8 rounded-xl px-2.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Đăng xuất"
                      >
                        <LogOut className="size-3.5 mr-1" />
                        <span className="hidden sm:inline">Đăng xuất</span>
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Tier: Vai trò --> Thanh chức năng --> Chọn tên (tất cả trên 1 hàng ngang) */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <RolePersonSelector
                role={role}
                personId={personId}
                people={props.people}
                currentUser={currentUser}
                onChange={changeRolePerson}
              >
                {role === 'teacher' ? (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold shrink-0">
                    <button
                      type="button"
                      id="teacher-tab-register-cal"
                      onClick={() => setTeacherTab('register_cal')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        teacherTab === 'register_cal'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>✏️ Đăng Ký Lịch</span>
                    </button>
                    <button
                      type="button"
                      id="teacher-tab-teaching-cal"
                      onClick={() => setTeacherTab('teaching_cal')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        teacherTab === 'teaching_cal'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>📅 Lịch Dạy</span>
                    </button>
                    <button
                      type="button"
                      id="teacher-tab-todo"
                      onClick={() => setTeacherTab('todo')}
                      className={cn(
                        'relative px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        teacherTab === 'todo'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>📋 To-do List</span>
                      {pendingTakeNotesCount > 0 && (
                        <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                          {pendingTakeNotesCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      id="teacher-tab-student-tracking"
                      aria-label="👥 Học Viên"
                      onClick={() => setTeacherTab('student_tracking')}
                      className={cn(
                        'relative px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        teacherTab === 'student_tracking'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>👥 Học Viên</span>
                      {props.studentTracking.filter((s) => s.almostEnd).length > 0 && (
                        <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                          {props.studentTracking.filter((s) => s.almostEnd).length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      id="teacher-tab-dashboard"
                      onClick={() => setTeacherTab('dashboard')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        teacherTab === 'dashboard'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>📊 Dashboard</span>
                    </button>
                    <button
                      type="button"
                      id="teacher-tab-salary"
                      onClick={() => setTeacherTab('salary')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        teacherTab === 'salary'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>💰 Tính Lương</span>
                    </button>
                    <button
                      type="button"
                      id="teacher-tab-ranking"
                      onClick={() => setTeacherTab('ranking')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        teacherTab === 'ranking'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>🏆 Ranking & Quy Chế</span>
                    </button>
                  </div>
                ) : role === 'admin' ? (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setAdminTab('dashboard')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        adminTab === 'dashboard'
                          ? 'bg-slate-900 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>📊 Tổng Quan Trung Tâm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('sales_dashboard')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        adminTab === 'sales_dashboard'
                          ? 'bg-indigo-600 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <PieChart className="size-3.5" />
                      <span>📈 Phân Ca & Khóa Học</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('salary')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        adminTab === 'salary'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>💰 Bảng Lương GV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('ranking')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        adminTab === 'ranking'
                          ? 'bg-indigo-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>🏆 Xếp Hạng & Quy Chế</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('lead_calculator')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        adminTab === 'lead_calculator'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>🧮 Lead Capacity Calculator</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTab('users')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        adminTab === 'users'
                          ? 'bg-slate-900 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>👥 Quản Lý Tài Khoản</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold shrink-0">
                    {role === 'sales' && (
                      <button
                        type="button"
                        onClick={() => setNonTeacherTab('sales_dashboard')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                          nonTeacherTab === 'sales_dashboard'
                            ? 'bg-indigo-600 text-white font-black shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        <PieChart className="size-3.5" />
                        <span>📊 Dashboard Phân Ca</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNonTeacherTab('schedule')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        nonTeacherTab === 'schedule'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <CalendarDays className="size-3.5" />
                      <span>Lịch Tuần</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNonTeacherTab('daily')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        nonTeacherTab === 'daily'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <Calendar className="size-3.5" />
                      <span>Lịch Ngày</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNonTeacherTab('students')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                        nonTeacherTab === 'students'
                          ? 'bg-emerald-700 text-white font-black shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span>👥 Học Viên</span>
                      {(role === 'cs'
                        ? centerStudents.filter((s) => s.almostEnd).length
                        : props.studentTracking.filter((s) => s.almostEnd).length) > 0 && (
                        <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                          {role === 'cs'
                            ? centerStudents.filter((s) => s.almostEnd).length
                            : props.studentTracking.filter((s) => s.almostEnd).length}
                        </span>
                      )}
                    </button>
                    {role !== 'sales' && role !== 'cs' && (
                      <button
                        type="button"
                        onClick={() => setNonTeacherTab('ranking')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                          nonTeacherTab === 'ranking'
                            ? 'bg-indigo-700 text-white font-black shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        <span>🏆 Quy Chế & Ranking</span>
                      </button>
                    )}
                    {role !== 'cs' && (
                      <button
                        type="button"
                        onClick={() => setNonTeacherTab('salary')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                          nonTeacherTab === 'salary'
                            ? 'bg-emerald-700 text-white font-black shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        <span>💰 Bảng Tính Lương</span>
                      </button>
                    )}
                    {role === 'sales' && (
                      <button
                        type="button"
                        onClick={() => setNonTeacherTab('lead_calculator')}
                        className={cn(
                          'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                          nonTeacherTab === 'lead_calculator'
                            ? 'bg-emerald-700 text-white font-black shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        )}
                      >
                        <Calculator className="size-3.5" />
                        <span>🧮 Lead Calculator</span>
                      </button>
                    )}
                  </div>
                )}
              </RolePersonSelector>
            </div>
          </header>

          {role === 'teacher' ? (
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
              onChange={(values) => {
                if (values.monthKey) setMonthKey(values.monthKey)
                if (values.weekName) setWeekName(values.weekName)
                if (values.teacherId) setTeacherId(values.teacherId)
                reload(values)
              }}
            />

            {teacherTab === 'register_cal' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3.5 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                  {/* Header: Tiêu đề + Chuẩn ca + Nút Sync đặt thẳng hàng */}
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
                      {/* Button Sửa đổi lịch đăng ký cho GV (Không giới hạn) */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setTeacherEditScheduleOpen(true)}
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
                        onClick={() => setSyncConfirmOpen(true)}
                        className="h-8 rounded-xl border-emerald-300 bg-emerald-50/60 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 transition-all shadow-2xs shrink-0 cursor-pointer"
                      >
                        <RefreshCw data-icon="inline-start" className="size-3.5 mr-1.5 text-emerald-700" />
                        Sync {weekName} cho các ngày/tuần khác
                      </Button>
                    </div>
                  </div>

                  {/* Thanh chỉ số & thiết lập mục tiêu gọn gàng trên 3 cột cân đối */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Cột 1: Mục tiêu ca rảnh hàng tuần & KPI expect tháng */}
                    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Target className="size-3.5 text-slate-500 shrink-0" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                            Mục tiêu ca rảnh
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Tuần ➔ Tháng (×4)
                        </span>
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
                                handleOpenKpiConfirm()
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
                            onClick={handleOpenKpiConfirm}
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

                      {/* Quota status indicator */}
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
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            {kpiQuota.count}/2 lượt
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cột 2: Đang chọn trên lịch & Quy đổi cả tháng */}
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
                            <strong className={cn(
                              "text-lg font-black",
                              projectedMonthSlots >= MIN_TEACHER_MONTHLY_COMMITMENT ? "text-emerald-900" : "text-amber-900"
                            )}>
                              {projectedMonthSlots}
                            </strong>
                            <span className="text-[11px] font-bold text-slate-600">ca</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cột 3: Cam kết tối thiểu 110 ca/tháng */}
                    <div className={cn(
                      "flex flex-col justify-between rounded-2xl border p-3.5 gap-2 transition-all",
                      projectedMonthSlots >= MIN_TEACHER_MONTHLY_COMMITMENT
                        ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
                        : "border-amber-200 bg-amber-50/60 text-amber-950"
                    )}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                          Cam kết tối thiểu
                        </span>
                        <span className="text-[11px] font-black text-slate-700">
                          110 ca/tháng
                        </span>
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
                            <span className="truncate">Thiếu {MIN_TEACHER_MONTHLY_COMMITMENT - projectedMonthSlots} ca (Dự kiến {projectedMonthSlots}/110)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner when in grid edit mode */}
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
                  onLessonClick={setActiveLesson}
                  onAvailabilityClick={setActiveAvailability}
                  availabilityMode="interactive"
                  pendingSlots={pendingSlots}
                  onSlotToggle={toggleSlot}
                  isEditMode={isEditScheduleGridMode}
                  selectedDeleteIds={selectedDeleteSlotIds}
                  onToggleDeleteSlot={toggleDeleteSlotId}
                />

                {/* Sticky delete bar — appears in grid edit mode when slots are selected */}
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
                        onClick={() => setGridDeleteConfirmOpen(true)}
                        className="h-8 rounded-xl bg-white px-4 text-xs font-extrabold text-rose-800 hover:bg-rose-50 shadow-md cursor-pointer active:scale-95"
                      >
                        Xác nhận xóa {selectedDeleteSlotIds.size} ca →
                      </Button>
                    </div>
                  </div>
                )}

              {/* Sticky save bar — appears when slots are selected */}
              {pendingSlots.size > 0 && (
                <div className="sticky bottom-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-300 bg-teal-700 px-5 py-3 shadow-xl shadow-teal-900/30">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-white">
                    <span className="text-sm font-black">
                      ✓ Đang chọn <strong>{pendingSlots.size}</strong> ca rảnh mới
                    </span>
                    <span className="h-4 w-px bg-teal-500 hidden sm:block" />
                    <span className="text-xs font-bold text-teal-100">
                      {weekName}: <strong>{currentWeekTotalSlots}</strong> ca/tuần ➜ Sync cả tháng (x4):{' '}
                      <strong className={projectedMonthSlots >= MIN_TEACHER_MONTHLY_COMMITMENT ? 'text-emerald-200 font-black' : 'text-amber-200 font-black'}>
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

              {/* Batch confirm dialog */}
              {batchConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                  <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        Bạn đang xác nhận mở {projectedMonthSlots} ca trong tháng {formatMonthKey(monthKey)}?
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Lưu <strong>{pendingSlots.size} ca mới</strong> cho {weekName} (Tuần này có {currentWeekTotalSlots} ca ➔ x4: {projectedMonthSlots} ca sẽ mở trong tháng).
                      </p>
                    </div>

                    {/* Policy Box */}
                    <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-3.5 text-xs text-teal-950 space-y-1.5">
                      <div className="flex items-center gap-2 font-black text-teal-900">
                        <Target className="size-4 text-teal-700 shrink-0" />
                        <span>Cam kết tối thiểu: 110 ca/tháng</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        GV cần mở tối thiểu <strong>110 ca trong tháng</strong> để đảm bảo đủ lịch dạy và đạt mốc hoạt động (Mốc <strong>Chuyên nghiệp 🌟</strong> tương ứng với 110 ca).
                      </p>
                    </div>

                    {/* Conditional Status Banner */}
                    {projectedMonthSlots < MIN_TEACHER_MONTHLY_COMMITMENT ? (
                      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-1">
                        <div className="flex items-center gap-2 font-black text-amber-800">
                          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                          <span>⚠️ Chưa đạt cam kết tối thiểu!</span>
                        </div>
                        <p className="leading-relaxed text-amber-900">
                          Bạn chỉ đang xác nhận mở <strong>{projectedMonthSlots} ca</strong> trong tháng {formatMonthKey(monthKey)} (thiếu <strong>{MIN_TEACHER_MONTHLY_COMMITMENT - projectedMonthSlots} ca</strong> để đạt mốc tối thiểu 110 ca/tháng). GV cần mở tối thiểu 110 ca trong tháng để đảm bảo đủ lịch dạy và đạt mốc hoạt động.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs text-emerald-950 space-y-1">
                        <div className="flex items-center gap-2 font-black text-emerald-800">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span>✅ Đạt mốc hoạt động cam kết!</span>
                        </div>
                        <p className="leading-relaxed text-emerald-900">
                          Bạn đang xác nhận mở <strong>{projectedMonthSlots} ca</strong> trong tháng {formatMonthKey(monthKey)} (Đạt mốc cam kết tối thiểu 110 ca/tháng - Mốc Chuyên nghiệp 🌟).
                        </p>
                      </div>
                    )}

                    {/* Pending Slots List */}
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
                                <span>{day?.name ?? date} ({day?.dateFormatted ?? date})</span>
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
                        onClick={submitBatch}
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
                  {/* View Mode Switch: Week vs Day */}
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
                      <span className="block text-[10px] font-bold uppercase text-slate-400">
                        Ca Book (Sales)
                      </span>
                      <strong className="text-sm font-black text-blue-600">
                        {props.weekSummary.bookedCa} ca
                      </strong>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div title="Số ca mở tính ở tab Đăng Ký Lịch tuần này">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">
                        Ca Mở (Đăng Ký)
                      </span>
                      <strong className="text-sm font-black text-emerald-700">
                        {props.weekSummary.totalCa ?? props.weekSummary.availableCa} ca
                      </strong>
                    </div>
                    <div className="h-6 w-px bg-slate-200" />
                    <div title="Fill Rate = (Ca Book Sales ÷ Ca Mở Đăng Ký) × 100%">
                      <span className="block text-[10px] font-bold uppercase text-slate-400">
                        Fill Rate
                      </span>
                      <strong className="text-sm font-black text-indigo-600">
                        {props.weekSummary.fillRatePercentage ?? (
                          (props.weekSummary.totalCa ?? props.weekSummary.availableCa) > 0
                            ? Math.round(
                                (props.weekSummary.bookedCa /
                                  (props.weekSummary.totalCa ?? props.weekSummary.availableCa)) *
                                  100
                              )
                            : 0
                        )}%
                      </strong>
                    </div>
                    {(props.weekSummary.completedCa ?? 0) > 0 && (
                      <>
                        <div className="h-6 w-px bg-slate-200" />
                        <div title="Done Rate = (Ca Hoàn Thành ÷ Ca Book Sales) × 100%">
                          <span className="block text-[10px] font-bold uppercase text-slate-400">
                            Done Rate
                          </span>
                          <strong className="text-sm font-black text-purple-600">
                            {props.weekSummary.doneRatePercentage ?? (
                              props.weekSummary.bookedCa > 0
                                ? Math.round(
                                    ((props.weekSummary.completedCa ?? 0) /
                                      props.weekSummary.bookedCa) *
                                      100
                                  )
                                : 0
                            )}%
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
                  onLessonClick={setActiveLesson}
                  onAvailabilityClick={setActiveAvailability}
                  availabilityMode="hidden"
                  onSelectStudentCode={handleViewStudentSessions}
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
                  onLessonClick={setActiveLesson}
                  onAvailabilityClick={setActiveAvailability}
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
                onOpenLessonDetail={setActiveLesson}
                onOpenStudentSessions={(code) => setActiveStudentForSessions(code)}
              />
            )}

            {teacherTab === 'student_tracking' && (
              <StudentTracking
                role={role}
                students={props.studentTracking}
                teacherName={selectedTeacher?.name ?? ''}
                onSelectStudent={setActiveStudentForSessions}
                onReserveStudent={(s) => setReservationStudent(s)}
                onResumeStudent={(s) => setResumeStudent(s)}
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
                onMonthChange={(newMonth) => {
                  setMonthKey(newMonth)
                  reload({ monthKey: newMonth })
                }}
                onSelectStudentCode={handleViewStudentSessions}
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
        ) : role === 'admin' ? (
          <div className="flex flex-col gap-5">
            {adminTab === 'dashboard' ? (
              <>
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

                <AdminDashboard
                  stats={props.adminStats}
                  monthKey={monthKey}
                  onSelectStudent={(s) => handleViewStudentSessions(s.studentCode)}
                  onOpenCalculator={() => setAdminTab('lead_calculator')}
                />
              </>
            ) : adminTab === 'sales_dashboard' ? (
              <>
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

                <SalesOverviewDashboard
                  adminStats={props.adminStats}
                  teachers={props.people.teachers}
                  allWeekAvailabilities={props.allWeekAvailabilities}
                  allWeekLessons={props.allWeekLessons}
                  weekDays={props.weekDays}
                  weekName={weekName}
                  monthKey={monthKey}
                  studentTracking={props.studentTracking}
                  onSelectTeacherForSchedule={(tId) => {
                    setTeacherId(tId)
                    setRole('sales')
                    setNonTeacherTab('schedule')
                    reload({ teacherId: tId, role: 'sales' })
                  }}
                  onSelectStudentCode={handleViewStudentSessions}
                  onOpenLeadCalculator={() => setAdminTab('lead_calculator')}
                />
              </>
            ) : adminTab === 'salary' ? (
              <SalaryCalculator
                monthKey={monthKey}
                monthSummary={props.monthSummary}
                adminStats={props.adminStats}
                mode="admin"
                role={role}
                monthLessonSessions={props.monthLessonSessions}
                onSwitchToTeacher={(tId) => {
                  setTeacherId(tId)
                  setRole('teacher')
                  setTeacherTab('salary')
                }}
                onMonthChange={(newMonth) => {
                  setMonthKey(newMonth)
                  reload({ monthKey: newMonth })
                }}
                onSelectStudentCode={handleViewStudentSessions}
                redirectParams={mutationRedirectParams}
              />
            ) : adminTab === 'ranking' ? (
              <RankingPolicyTab
                role={role}
                studentTracking={props.studentTracking}
                monthKey={monthKey}
                adminStats={props.adminStats}
                currentTeacherId={typeof teacherId === 'number' ? teacherId : (props.people.teachers[0]?.id ?? 0)}
                currentTeacherName={selectedTeacher?.name || props.people.teachers[0]?.name}
              />
            ) : adminTab === 'lead_calculator' ? (
              <LeadCapacityCalculator
                autoEmptySlots={currentCenterEmptySlots}
                autoEmptySource={`Lịch khả dụng toàn trung tâm tháng ${monthKey}`}
                onViewSchedule={() => setAdminTab('dashboard')}
              />
            ) : adminTab === 'users' ? (
              <UserManagement
                users={props.adminUsers}
                currentUser={currentUser}
                people={props.people}
              />
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <CalendarToolbar
              role={role}
              monthKey={monthKey}
              weekName={weekName}
              weeks={props.weeks}
              teacherId={teacherId}
              teachers={props.people.teachers}
              onBookNew={() => setBookingOpen(true)}
              onEditTeacherSchedule={handleOpenSalesEditSchedule}
              hideWeekControls={nonTeacherTab === 'students' || nonTeacherTab === 'salary'}
              onChange={(values) => {
                if (values.monthKey) setMonthKey(values.monthKey)
                if (values.weekName) setWeekName(values.weekName)
                if (values.teacherId) setTeacherId(values.teacherId)
                reload(values)
              }}
            />

            {/* CS Reservation Reminder Banner - ONLY displayed for CS portal */}
            {role === 'cs' && props.csReservationReminders && props.csReservationReminders.totalReserved > 0 && (
              <CSReminderBanner
                reminders={props.csReservationReminders}
                students={role === 'cs' ? centerStudents : props.studentTracking}
                onResumeStudent={(s) => setResumeStudent(s)}
                onSelectStudent={(code) => handleViewStudentSessions(code)}
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
                  onSelectTeacherForSchedule={(tId) => {
                    setTeacherId(tId)
                    setNonTeacherTab('schedule')
                    reload({ teacherId: tId })
                  }}
                  onSelectStudentCode={handleViewStudentSessions}
                  onOpenLeadCalculator={() => setNonTeacherTab('lead_calculator')}
                />
              ) : nonTeacherTab === 'students' ? (
              <StudentTracking
                role={role}
                students={role === 'cs' ? centerStudents : props.studentTracking}
                teacherName={role === 'cs' ? 'Toàn trung tâm' : (selectedTeacher?.name ?? '')}
                teachers={role === 'cs' ? props.people.teachers : undefined}
                isCenterWide={role === 'cs'}
                onSelectStudent={setActiveStudentForSessions}
                onReserveStudent={(s) => setReservationStudent(s)}
                onResumeStudent={(s) => setResumeStudent(s)}
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
                onLessonClick={setActiveLesson}
                onAvailabilityClick={setActiveAvailability}
                availabilityMode={role === 'sales' ? 'readonly' : 'hidden'}
                onSelectStudentCode={handleViewStudentSessions}
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
                onSwitchToTeacher={(tId) => {
                  setTeacherId(tId)
                  setRole('teacher')
                  setTeacherTab('salary')
                }}
                onMonthChange={(newMonth) => {
                  setMonthKey(newMonth)
                  reload({ monthKey: newMonth })
                }}
                onSelectStudentCode={handleViewStudentSessions}
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
                  onEditSchedule={teacherId !== 'all' ? handleOpenSalesEditSchedule : undefined}
                />

                {/* Banner when in grid edit mode for Sales */}
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
                          Click trực tiếp vào các ô ca rảnh trên lưới để chọn những ca bạn muốn xóa cho GV <strong>{selectedTeacher?.name}</strong>. Thao tác không trừ hạn mức của giáo viên.
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
                  onLessonClick={setActiveLesson}
                  onAvailabilityClick={setActiveAvailability}
                  onEmptySlotClick={(date, time, dayHeaderLabel) => {
                    setBookingPrefill({ date, time, dayName: dayHeaderLabel.split(' (')[0] })
                    setBookingOpen(true)
                  }}
                  availabilityMode={role === 'sales' ? 'readonly' : 'hidden'}
                  isEditMode={role === 'sales' && isEditScheduleGridMode}
                  selectedDeleteIds={selectedDeleteSlotIds}
                  onToggleDeleteSlot={toggleDeleteSlotId}
                />

                {/* Sticky delete bar for Sales in grid edit mode */}
                {role === 'sales' && isEditScheduleGridMode && selectedDeleteSlotIds.size > 0 && (
                  <div className="sticky bottom-4 z-40 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-400 bg-rose-700 px-5 py-3 shadow-xl shadow-rose-900/30 text-white animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5">
                      <span className="text-sm font-black">
                        🗑️ Đang chọn <strong>{selectedDeleteSlotIds.size}</strong> ca rảnh của GV {selectedTeacher?.name} để xóa
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
                        onClick={() => setGridDeleteConfirmOpen(true)}
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
      )}
      </div>

      <div aria-hidden={activeLesson === null && !bookingOpen}>
        <LessonDetailDialog
          role={role}
          lesson={activeLesson}
          open={activeLesson !== null}
          onOpenChange={(open) => {
            if (!open) setActiveLesson(null)
          }}
          onReschedule={(lesson) => {
            setActiveLesson(null)
            setRescheduleLesson(lesson)
          }}
          onEditEnrollment={setEditEnrollment}
          redirectParams={mutationRedirectParams}
          onViewStudentSessions={handleViewStudentSessions}
        />

        <AvailabilityDetailDialog
          availability={activeAvailability}
          open={activeAvailability !== null}
          onOpenChange={(open) => {
            if (!open) setActiveAvailability(null)
          }}
          redirectParams={mutationRedirectParams}
          isUnlimited={true}
          role={role}
          onDeleteSuccess={handleSingleAvailabilityDeleteSuccess}
          onOpenEditDialog={() => setTeacherEditScheduleOpen(true)}
        />

        <TeacherEditScheduleDialog
          open={teacherEditScheduleOpen}
          onOpenChange={setTeacherEditScheduleOpen}
          teacherName={selectedTeacher?.name || 'Giáo viên'}
          teacherId={role === 'teacher' ? effectiveTeacherId : (typeof teacherId === 'number' ? teacherId : (selectedTeacher?.id ?? effectiveTeacherId))}
          monthKey={monthKey}
          weekName={weekName}
          weekAvailabilities={props.teacherAvailabilities}
          monthAvailabilities={props.monthAvailabilities ?? props.teacherAvailabilities}
          isUnlimited={true}
          role={role}
          onConfirmDelete={handleBatchDeleteAvailabilities}
          onSwitchToGridMode={() => {
            setIsEditScheduleGridMode(true)
            setSelectedDeleteSlotIds(new Set())
            if (role === 'sales') {
              setNonTeacherTab('schedule')
            }
            toast.info('🎯 Đã bật chế độ chọn ca trên lịch. Hãy click vào các ca rảnh muốn xóa.')
          }}
        />

        <TeacherSyncScheduleDialog
          open={syncConfirmOpen}
          onOpenChange={setSyncConfirmOpen}
          teacherId={role === 'teacher' ? effectiveTeacherId : (typeof teacherId === 'number' ? teacherId : (selectedTeacher?.id ?? effectiveTeacherId))}
          teacherName={selectedTeacher?.name || selectedPerson?.name || 'Giáo viên'}
          monthKey={monthKey}
          weekName={weekName}
          weekDays={props.weekDays}
          currentSavedSlotsCount={currentWeekSavedAvailabilities}
          pendingSlots={pendingSlots}
          defaultDuration={defaultDuration}
          weeks={props.weeks}
          mutationRedirectParams={mutationRedirectParams}
          onSyncSuccess={() => {
            setPendingSlots(new Set())
            toast.success('Đã đồng bộ lịch dạy thành công!')
          }}
        />

        {/* Grid Delete Confirm Modal */}
        {gridDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-900">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-800">
                  <Trash2 className="size-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {role === 'sales' || role === 'admin'
                      ? `Xác nhận xóa ${selectedDeleteSlotIds.size} ca rảnh của GV ${selectedTeacher?.name || ''}?`
                      : `Xác nhận xóa ${selectedDeleteSlotIds.size} ca rảnh đã chọn?`}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {role === 'sales' || role === 'admin'
                      ? '👑 Quyền Sales: Không giới hạn số lần sửa'
                      : '✨ Không giới hạn số lần sửa'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-950 space-y-1.5">
                {role === 'sales' || role === 'admin' ? (
                  <p className="leading-relaxed">
                    Bạn đang chuẩn bị xóa <strong>{selectedDeleteSlotIds.size} ca rảnh</strong> đã chọn trên lịch cho giáo viên <strong>{selectedTeacher?.name}</strong>.
                    Thao tác này được thực hiện với quyền Quản lý Sales và không bị giới hạn số lần.
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    Bạn đang chuẩn bị xóa <strong>{selectedDeleteSlotIds.size} ca rảnh</strong> đã chọn trên lịch.
                    Thao tác này không bị giới hạn số lần, bạn có thể đăng ký lại ca mới bất cứ lúc nào.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGridDeleteConfirmOpen(false)}
                  className="rounded-xl px-4 text-xs font-bold cursor-pointer"
                >
                  Quay lại
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleBatchDeleteAvailabilities(Array.from(selectedDeleteSlotIds))}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 px-5 text-xs font-extrabold text-white shadow-sm cursor-pointer active:scale-95"
                >
                  Xác nhận xóa {selectedDeleteSlotIds.size} ca
                </Button>
              </div>
            </div>
          </div>
        )}

        <SalesBookingDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          teachers={props.people.teachers}
          salesId={personId}
          selectedTeacherId={typeof teacherId === 'number' ? teacherId : (props.people.teachers[0]?.id ?? 0)}
          timeIntervals={props.timeIntervals}
          redirectParams={mutationRedirectParams}
          prefill={bookingPrefill}
          enrollments={props.enrollments ?? []}
        />

        <RescheduleDialog
          lesson={rescheduleLesson}
          open={rescheduleLesson !== null}
          onOpenChange={(open) => {
            if (!open) setRescheduleLesson(null)
          }}
          timeIntervals={props.timeIntervals}
          redirectParams={mutationRedirectParams}
          role={role}
          onEditEnrollment={setEditEnrollment}
        />

        <StudentSessionsDialog
          open={activeStudentForSessions !== null}
          onOpenChange={(open) => {
            if (!open) setActiveStudentForSessions(null)
          }}
          student={currentActiveStudentForSessions}
          redirectParams={mutationRedirectParams}
          role={role}
          allStudents={role === 'cs' ? centerStudents : props.studentTracking}
          onSelectStudent={setActiveStudentForSessions}
          onReserveStudent={(s) => setReservationStudent(s)}
          onResumeStudent={(s) => setResumeStudent(s)}
          teachers={props.people.teachers}
          timeIntervals={props.timeIntervals}
        />

        <EditEnrollmentDialog
          enrollment={editEnrollment}
          open={editEnrollment !== null}
          onOpenChange={(open) => {
            if (!open) setEditEnrollment(null)
          }}
          redirectParams={mutationRedirectParams}
        />

        <ReservationDialog
          open={reservationStudent !== null}
          student={currentReservationStudent}
          teacherName={currentReservationStudent?.teacherName || selectedTeacher?.name}
          redirectParams={mutationRedirectParams}
          onClose={() => setReservationStudent(null)}
        />

        <ResumeReservationDialog
          open={resumeStudent !== null}
          student={currentResumeStudent}
          teachers={props.people.teachers}
          redirectParams={mutationRedirectParams}
          onClose={() => setResumeStudent(null)}
        />

        <LeadCapacityCalculatorDialog
          open={leadCalculatorOpen}
          onOpenChange={setLeadCalculatorOpen}
          initialEmptySlots={currentCenterEmptySlots || 46}
        />

        <TeacherKpiConfirmDialog
          open={kpiConfirmOpen}
          onOpenChange={setKpiConfirmOpen}
          targetWeekly={weeklyTargetValue}
          monthKey={monthKey}
          changeCount={kpiQuota.count}
          onConfirm={handleConfirmSaveKpiTarget}
        />
      </div>
    </main>
  </div>
)
}

function peopleForRole(role: PersonRole, people: SchedulerProps['people']) {
  if (role === 'admin') return []
  return role === 'teacher' ? people.teachers : role === 'sales' ? people.sales : people.cs
}

function firstPersonId(role: PersonRole, people: SchedulerProps['people']) {
  return peopleForRole(role, people)[0]?.id ?? 0
}

function portalTitle(role: PersonRole) {
  if (role === 'admin') return 'Cổng Quản Trị Admin'
  if (role === 'sales') return 'Cổng Tư Vấn Sales'
  if (role === 'cs') return 'Cổng Chăm Sóc Học Viên CS'

  return 'Cổng Giảng Viên'
}

function portalSubtitle(role: PersonRole) {
  if (role === 'admin') return 'Hệ thống tổng quan • Báo cáo & Thống kê toàn trung tâm'
  if (role === 'sales') return 'Đặt lịch học thử & tư vấn • Theo dõi lịch trống giảng viên'
  if (role === 'cs') return 'Điều phối lịch học • Chăm sóc & Đồng hành học viên'

  return 'Quản lý ca dạy • Đăng ký lịch khả dụng & Xem học viên'
}

function roleBadgeLabel(role: PersonRole, name?: string) {
  if (role === 'admin') return '👑 Quản Lý'
  if (role === 'teacher') return `GV: ${name ?? ''}`.trim()

  return name ?? (role === 'sales' ? 'Sales' : 'CS')
}

function RoleScheduleSummary({
  role,
  teacherName,
  weekSummary,
  onEditSchedule,
}: {
  role: PersonRole
  teacherName: string
  weekSummary: SchedulerProps['weekSummary']
  onEditSchedule?: () => void
}) {
  const availableCa = weekSummary.availableCa
  const bookedCa = weekSummary.bookedCa
  const completedCa = weekSummary.completedCa ?? 0
  const totalCa = weekSummary.totalCa ?? availableCa
  const fillRate =
    weekSummary.fillRatePercentage ??
    (totalCa > 0 ? Math.round((bookedCa / totalCa) * 100) : 0)
  const doneRate =
    weekSummary.doneRatePercentage ??
    (bookedCa > 0 ? Math.round((completedCa / bookedCa) * 100) : 0)

  const isAllTeachers = !teacherName || teacherName.includes('Toàn Trung Tâm')

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 shadow-inner">
        <span>
          {isAllTeachers ? 'Phạm vi: ' : 'Giáo Viên: '}
          <strong className="text-sm font-black text-emerald-800">
            {teacherName || 'Toàn Trung Tâm (Tất cả Giảng Viên)'}
          </strong>
        </span>
        {role === 'cs' && (
          <span className="text-slate-500">
            (💡 <strong>Click ca học</strong> xem chi tiết hoặc <strong>Kéo thả</strong> để dời lịch)
          </span>
        )}
      </div>
      {role === 'sales' ? (
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span
            className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 font-bold text-emerald-800 shadow-2xs"
            title="Số ca mở tính ở tab Đăng Ký Lịch của GV tuần này"
          >
            🎯 Ca Mở (Đăng Ký): <strong>{totalCa}</strong> ca{' '}
            <span className="text-[11px] font-normal text-emerald-600">(Rảnh: {availableCa} ca)</span>
          </span>
          <span
            className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 font-bold text-blue-800 shadow-2xs"
            title="Số ca book tính ở Lịch Sales tuần này"
          >
            📚 Ca Book (Sales): <strong>{bookedCa}</strong> ca{' '}
            <span className="text-[11px] font-normal text-blue-600">(Đã Book: {bookedCa} ca)</span>
          </span>
          <span
            className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 font-bold text-indigo-800 shadow-2xs"
            title="Fill Rate = (Ca Book Sales ÷ Ca Mở Đăng Ký) × 100%"
          >
            📈 Fill Rate: <strong>{fillRate}%</strong>
          </span>
          {onEditSchedule && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditSchedule}
              className="h-8 rounded-xl border-rose-300 bg-rose-50/90 text-rose-800 hover:bg-rose-100 hover:text-rose-900 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
              title="Sửa đổi lịch đăng ký của GV này (Xóa các ca rảnh - Quyền Sales: Không giới hạn)"
            >
              <Trash2 className="size-3.5 text-rose-600" />
              <span>Sửa Lịch GV</span>
            </Button>
          )}
        </div>
      ) : role === 'cs' ? (
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span
            className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 font-bold text-blue-800 shadow-2xs"
            title="Số ca book ở Lịch Sales tuần này"
          >
            📚 Ca Book (Sales): <strong>{bookedCa}</strong> ca{' '}
            <span className="text-[11px] font-normal text-blue-600">(Đã Book tuần này: {bookedCa} ca)</span>
          </span>
          <span
            className="rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-1.5 font-bold text-purple-800 shadow-2xs"
            title="Số ca hoàn thành (điểm danh CS/GV)"
          >
            ✅ Hoàn Thành: <strong>{completedCa}</strong> ca
          </span>
          <span
            className="rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-1.5 font-bold text-purple-800 shadow-2xs"
            title="Done Rate = (Ca Hoàn Thành ÷ Ca Book Sales) × 100%"
          >
            🎯 Done Rate: <strong>{doneRate}%</strong>
          </span>
          <span
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 shadow-2xs"
            title="Tổng ca GV mở ở tab Đăng Ký Lịch"
          >
            Ca Mở (Đăng Ký): <strong>{totalCa}</strong> ca (Fill: {fillRate}%)
          </span>
        </div>
      ) : (
        <div className="text-xs font-bold text-blue-600">Đã Book tuần này: {bookedCa} ca</div>
      )}
    </div>
  )
}

function readWeeklyTargetOverrides() {
  if (typeof window === 'undefined') return {}

  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(WEEKLY_TARGET_STORAGE_KEY) ?? '{}'
    )

    if (parsed && typeof parsed === 'object') {
      return Object.fromEntries(
        Object.entries(parsed)
          .filter(([, value]) => Number.isInteger(value) && Number(value) > 0)
          .map(([key, value]) => [key, Number(value)])
      )
    }
  } catch {
    return {}
  }

  return {}
}

function writeWeeklyTargetOverrides(overrides: Record<string, number>) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(WEEKLY_TARGET_STORAGE_KEY, JSON.stringify(overrides))
}

function weeklyTargetOverrideKey(teacherId: number | 'all' | string, monthKey: string, week: string) {
  return `${teacherId}:${monthKey}:${week}`
}
