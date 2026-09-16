import { Head, router, usePage } from '@inertiajs/react'
import {
  Calculator,
  Calendar,
  CalendarDays,
  LogOut,
  PieChart,
  RotateCcw,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  batchCreateTeacherAvailabilitiesPath,
  batchDestroyTeacherAvailabilitiesPath,
  rootPath,
  syncWeekTeacherAvailabilitiesPath,
  teacherPath,
} from '@/lib/routes'
import { cn } from '@/lib/utils'
import { AdminPortal } from './components/admin-portal'
import { GlobalStudentSearch } from './components/global-student-search'
import { RolePersonSelector } from './components/role-person-selector'
import { SalesCsPortal } from './components/sales-cs-portal'
import { SchedulerModals } from './components/scheduler-modals'
import { TeacherPortal } from './components/teacher-portal'
import logoImg from '@/images/logo.png'
import type {
  Enrollment,
  KpiQuotaState,
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
            <TeacherPortal
              role={role}
              props={props}
              mutationRedirectParams={mutationRedirectParams}
              teacherTab={teacherTab}
              monthKey={monthKey}
              weekName={weekName}
              weekRange={weekRange}
              teacherId={teacherId}
              personId={personId}
              defaultDuration={defaultDuration}
              selectedTeacher={selectedTeacher}
              onCalendarToolbarChange={(values) => {
                if (values.monthKey) setMonthKey(values.monthKey)
                if (values.weekName) setWeekName(values.weekName)
                if (values.teacherId) setTeacherId(values.teacherId)
                reload(values)
              }}
              onMonthChange={(newMonth) => {
                setMonthKey(newMonth)
                reload({ monthKey: newMonth })
              }}
              weeklyTargetInput={weeklyTargetInput}
              setWeeklyTargetInput={setWeeklyTargetInput}
              weeklyTargetInvalid={weeklyTargetInvalid}
              expectedMonthlyKpi={expectedMonthlyKpi}
              isKpiQuotaExceeded={isKpiQuotaExceeded}
              kpiQuota={kpiQuota}
              onOpenKpiConfirm={handleOpenKpiConfirm}
              currentWeekTotalSlots={currentWeekTotalSlots}
              projectedMonthSlots={projectedMonthSlots}
              pendingSlots={pendingSlots}
              setPendingSlots={setPendingSlots}
              onToggleSlot={toggleSlot}
              batchConfirmOpen={batchConfirmOpen}
              setBatchConfirmOpen={setBatchConfirmOpen}
              onSubmitBatch={submitBatch}
              isEditScheduleGridMode={isEditScheduleGridMode}
              setIsEditScheduleGridMode={setIsEditScheduleGridMode}
              selectedDeleteSlotIds={selectedDeleteSlotIds}
              setSelectedDeleteSlotIds={setSelectedDeleteSlotIds}
              onToggleDeleteSlot={toggleDeleteSlotId}
              onOpenTeacherEditSchedule={() => setTeacherEditScheduleOpen(true)}
              onOpenSyncConfirm={() => setSyncConfirmOpen(true)}
              onOpenGridDeleteConfirm={() => setGridDeleteConfirmOpen(true)}
              scheduleViewMode={scheduleViewMode}
              setScheduleViewMode={setScheduleViewMode}
              onLessonClick={setActiveLesson}
              onAvailabilityClick={setActiveAvailability}
              onSelectStudentCode={handleViewStudentSessions}
              onOpenLessonDetail={setActiveLesson}
              onSelectActiveStudent={setActiveStudentForSessions}
              onReserveStudent={(s) => setReservationStudent(s)}
              onResumeStudentRequest={(s) => setResumeStudent(s)}
              computedMonthSummary={computedMonthSummary}
              displayedWeeklyKpis={displayedWeeklyKpis}
            />

        ) : role === 'admin' ? (
          <AdminPortal
            role={role}
            props={props}
            mutationRedirectParams={mutationRedirectParams}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            monthKey={monthKey}
            weekName={weekName}
            teacherId={teacherId}
            selectedTeacher={selectedTeacher}
            currentUser={currentUser}
            currentCenterEmptySlots={currentCenterEmptySlots}
            onCalendarToolbarChange={(values) => {
              if (values.monthKey) setMonthKey(values.monthKey)
              if (values.weekName) setWeekName(values.weekName)
              if (values.teacherId) setTeacherId(values.teacherId)
              reload(values)
            }}
            onSelectStudentCode={handleViewStudentSessions}
            onSwitchToSalesSchedule={(tId) => {
              setTeacherId(tId)
              setRole('sales')
              setNonTeacherTab('schedule')
              reload({ teacherId: tId, role: 'sales' })
            }}
            onSwitchToTeacherSalary={(tId) => {
              setTeacherId(tId)
              setRole('teacher')
              setTeacherTab('salary')
            }}
          />
        ) : (
          <SalesCsPortal
            role={role}
            props={props}
            mutationRedirectParams={mutationRedirectParams}
            nonTeacherTab={nonTeacherTab}
            setNonTeacherTab={setNonTeacherTab}
            monthKey={monthKey}
            weekName={weekName}
            teacherId={teacherId}
            personId={personId}
            defaultDuration={defaultDuration}
            selectedTeacher={selectedTeacher}
            centerStudents={centerStudents}
            teacherWeeklyEmptySlots={teacherWeeklyEmptySlots}
            isEditScheduleGridMode={isEditScheduleGridMode}
            setIsEditScheduleGridMode={setIsEditScheduleGridMode}
            selectedDeleteSlotIds={selectedDeleteSlotIds}
            setSelectedDeleteSlotIds={setSelectedDeleteSlotIds}
            onToggleDeleteSlot={toggleDeleteSlotId}
            onOpenGridDeleteConfirm={() => setGridDeleteConfirmOpen(true)}
            onOpenBooking={() => setBookingOpen(true)}
            onOpenSalesEditSchedule={handleOpenSalesEditSchedule}
            onEmptySlotClick={(date, time, dayHeaderLabel) => {
              setBookingPrefill({ date, time, dayName: dayHeaderLabel.split(' (')[0] })
              setBookingOpen(true)
            }}
            onLessonClick={setActiveLesson}
            onAvailabilityClick={setActiveAvailability}
            onSelectStudentCode={handleViewStudentSessions}
            onSelectActiveStudent={setActiveStudentForSessions}
            onReserveStudent={(s) => setReservationStudent(s)}
            onResumeStudentRequest={(s) => setResumeStudent(s)}
            onCalendarToolbarChange={(values) => {
              if (values.monthKey) setMonthKey(values.monthKey)
              if (values.weekName) setWeekName(values.weekName)
              if (values.teacherId) setTeacherId(values.teacherId)
              reload(values)
            }}
            onSwitchToSalesScheduleSameRole={(tId) => {
              setTeacherId(tId)
              setNonTeacherTab('schedule')
              reload({ teacherId: tId })
            }}
            onSwitchToTeacherSalary={(tId) => {
              setTeacherId(tId)
              setRole('teacher')
              setTeacherTab('salary')
            }}
          />
        )}
      </div>

      <SchedulerModals
        role={role}
        props={props}
        redirectParams={mutationRedirectParams}
        activeLesson={activeLesson}
        onCloseLessonDetail={() => setActiveLesson(null)}
        rescheduleLesson={rescheduleLesson}
        onOpenReschedule={(lesson) => {
          setActiveLesson(null)
          setRescheduleLesson(lesson)
        }}
        onCloseReschedule={() => setRescheduleLesson(null)}
        activeAvailability={activeAvailability}
        onCloseAvailabilityDetail={() => setActiveAvailability(null)}
        onAvailabilityDeleteSuccess={handleSingleAvailabilityDeleteSuccess}
        teacherEditScheduleOpen={teacherEditScheduleOpen}
        onTeacherEditScheduleOpenChange={setTeacherEditScheduleOpen}
        syncConfirmOpen={syncConfirmOpen}
        onSyncConfirmOpenChange={setSyncConfirmOpen}
        gridDeleteConfirmOpen={gridDeleteConfirmOpen}
        onGridDeleteConfirmOpenChange={setGridDeleteConfirmOpen}
        selectedTeacherName={selectedTeacher?.name || selectedPerson?.name}
        displayTeacherId={
          role === 'teacher'
            ? effectiveTeacherId
            : (typeof teacherId === 'number' ? teacherId : (selectedTeacher?.id ?? effectiveTeacherId))
        }
        monthKey={monthKey}
        weekName={weekName}
        currentWeekSavedAvailabilities={currentWeekSavedAvailabilities}
        pendingSlots={pendingSlots}
        defaultDuration={defaultDuration}
        selectedDeleteSlotIds={selectedDeleteSlotIds}
        onConfirmBatchDeleteAvailabilities={handleBatchDeleteAvailabilities}
        onSyncSuccess={() => {
          setPendingSlots(new Set())
          toast.success('Đã đồng bộ lịch dạy thành công!')
        }}
        onEnterGridEditMode={() => {
          setIsEditScheduleGridMode(true)
          setSelectedDeleteSlotIds(new Set())
          if (role === 'sales') {
            setNonTeacherTab('schedule')
          }
        }}
        bookingOpen={bookingOpen}
        onBookingOpenChange={setBookingOpen}
        personId={personId}
        teacherId={teacherId}
        bookingPrefill={bookingPrefill}
        editEnrollment={editEnrollment}
        onOpenEditEnrollment={setEditEnrollment}
        onCloseEditEnrollment={() => setEditEnrollment(null)}
        activeStudentForSessions={activeStudentForSessions}
        currentActiveStudentForSessions={currentActiveStudentForSessions}
        onCloseStudentSessions={() => setActiveStudentForSessions(null)}
        onSelectActiveStudent={setActiveStudentForSessions}
        onViewStudentSessions={handleViewStudentSessions}
        centerStudents={centerStudents}
        reservationStudent={reservationStudent}
        currentReservationStudent={currentReservationStudent}
        onCloseReservation={() => setReservationStudent(null)}
        resumeStudent={resumeStudent}
        currentResumeStudent={currentResumeStudent}
        onCloseResume={() => setResumeStudent(null)}
        onReserveStudent={(s) => setReservationStudent(s)}
        onResumeStudentRequest={(s) => setResumeStudent(s)}
        leadCalculatorOpen={leadCalculatorOpen}
        onLeadCalculatorOpenChange={setLeadCalculatorOpen}
        currentCenterEmptySlots={currentCenterEmptySlots}
        kpiConfirmOpen={kpiConfirmOpen}
        onKpiConfirmOpenChange={setKpiConfirmOpen}
        weeklyTargetValue={weeklyTargetValue}
        kpiQuota={kpiQuota}
        onConfirmSaveKpiTarget={handleConfirmSaveKpiTarget}
      />
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
