import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  Flame,
  GraduationCap,
  Layers,
  Moon,
  PieChart,
  Search,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  AdminTeacherStat,
  LessonSession,
  Person,
  SchedulerProps,
  TeacherAvailability,
  WeekDay,
} from '../types'

export interface SalesOverviewDashboardProps {
  adminStats: AdminTeacherStat[]
  teachers: Person[]
  allWeekAvailabilities?: TeacherAvailability[]
  allWeekLessons?: LessonSession[]
  weekDays: WeekDay[]
  weekName: string
  monthKey: string
  studentTracking?: SchedulerProps['studentTracking']
  onSelectTeacherForSchedule: (teacherId: number | 'all') => void
  onSelectStudentCode?: (code: string) => void
  onOpenLeadCalculator?: () => void
}

// Calculate ca unit for lesson
export function getLessonCa(lesson: { durationMinutes: number; dayLabel?: string }): number {
  const dur = lesson.durationMinutes || 40
  const dayPart = (lesson.dayLabel || '').split('/')[0] || ''
  const isDouble =
    dur >= 50 ||
    dayPart.includes('&') ||
    dayPart.includes('-') ||
    (dayPart.match(/\d+/g)?.length ?? 0) >= 2
  return isDouble ? 2 : Math.max(1, Math.round(dur / 40))
}

// Calculate ca unit for availability
export function getAvailabilityCa(avail: { durationMinutes: number }): number {
  return Math.max(1, Math.round((avail.durationMinutes || 40) / 40))
}

type TimeBucketKey = 'morning' | 'noon' | 'afternoon' | 'evening'

interface TimeBucketDef {
  key: TimeBucketKey
  label: string
  timeRange: string
  icon: typeof Sunrise
  color: string
  bgColor: string
  borderColor: string
}

const TIME_BUCKETS: TimeBucketDef[] = [
  {
    key: 'morning',
    label: 'Buổi Sáng',
    timeRange: '06:00 - 11:59',
    icon: Sunrise,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50/80',
    borderColor: 'border-amber-200',
  },
  {
    key: 'noon',
    label: 'Buổi Trưa',
    timeRange: '12:00 - 13:59',
    icon: Sun,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50/80',
    borderColor: 'border-orange-200',
  },
  {
    key: 'afternoon',
    label: 'Buổi Chiều',
    timeRange: '14:00 - 17:59',
    icon: Sunset,
    color: 'text-sky-700',
    bgColor: 'bg-sky-50/80',
    borderColor: 'border-sky-200',
  },
  {
    key: 'evening',
    label: 'Buổi Tối',
    timeRange: '18:00 - 23:00',
    icon: Moon,
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50/80',
    borderColor: 'border-indigo-200',
  },
]

function getTimeBucket(timeStr: string): TimeBucketKey {
  if (!timeStr) return 'morning'
  const hour = parseInt(timeStr.split(':')[0], 10)
  if (isNaN(hour)) return 'morning'
  if (hour < 12) return 'morning'
  if (hour < 14) return 'noon'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

type MatrixViewMode = 'all' | 'lessons' | 'availabilities' | 'empty'
type TeacherWorkloadFilter = 'all' | 'need_slots' | 'balanced' | 'heavy'
type TeacherSortOption = 'booked_asc' | 'booked_desc' | 'fill_asc' | 'fill_desc' | 'empty_desc'

export function SalesOverviewDashboard({
  adminStats,
  teachers,
  allWeekAvailabilities = [],
  allWeekLessons = [],
  weekDays,
  weekName,
  monthKey,
  studentTracking = [],
  onSelectTeacherForSchedule,
  onSelectStudentCode,
  onOpenLeadCalculator,
}: SalesOverviewDashboardProps) {
  // Filters & State
  const [matrixTeacherFilter, setMatrixTeacherFilter] = useState<number | 'all'>('all')
  const [matrixViewMode, setMatrixViewMode] = useState<MatrixViewMode>('all')
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('')
  const [workloadFilter, setWorkloadFilter] = useState<TeacherWorkloadFilter>('all')
  const [teacherSort, setTeacherSort] = useState<TeacherSortOption>('booked_asc')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string | 'all'>('all')

  // Combine teacher data for the week
  const teacherWorkloadList = useMemo(() => {
    return teachers.map((teacher) => {
      // Find stat from adminStats
      const stat = adminStats.find((s) => s.teacherId === teacher.id)
      
      // Lessons of this teacher in current week
      const tLessons = allWeekLessons.filter((l) => l.teacherId === teacher.id)
      const weekBookedCa = tLessons.reduce((sum, l) => sum + getLessonCa(l), 0)

      // Availabilities of this teacher in current week
      const tAvails = allWeekAvailabilities.filter((a) => a.teacherId === teacher.id)
      const weekAvailCa = tAvails.reduce((sum, a) => sum + getAvailabilityCa(a), 0)

      // Available unbooked slots
      const weekEmptySlots = Math.max(0, weekAvailCa - weekBookedCa)
      const fillRate = weekAvailCa > 0 ? Math.round((weekBookedCa / weekAvailCa) * 100) : 0

      // Student count
      const activeStudents = stat?.studentCount ?? 0

      // Monthly metrics
      const monthBookedCa = stat?.monthSummary?.bookedCa ?? 0
      const monthCompletedCa = stat?.monthSummary?.completedCa ?? 0
      const monthTotalCa = stat?.monthSummary?.totalCa ?? (weekAvailCa * 4)

      // Workload equity status:
      // - need_slots: < 14 ca/week or (weekAvailCa >= 14 && fillRate < 45%)
      // - heavy: >= 25 ca/week or fillRate >= 85%
      // - balanced: 14 - 24 ca/week
      let status: 'need_slots' | 'balanced' | 'heavy' = 'balanced'
      let statusLabel = 'Tải Cân Bằng'
      let statusAdvice = 'Số ca lý tưởng, tải ổn định'

      if (weekBookedCa < 14 || (weekAvailCa >= 14 && fillRate < 45)) {
        status = 'need_slots'
        statusLabel = 'Thiếu Ca / Cần Bù'
        statusAdvice = 'Ưu tiên xếp học viên mới vào GV này'
      } else if (weekBookedCa >= 25 || fillRate >= 85) {
        status = 'heavy'
        statusLabel = 'Tải Cao / Sắp Đầy'
        statusAdvice = 'Hạn chế xếp dồn thêm, chia bớt ca'
      }

      return {
        id: teacher.id,
        name: teacher.name,
        target: teacher.weeklyAvailabilityTarget || 28,
        weekAvailCa,
        weekBookedCa,
        weekEmptySlots,
        fillRate,
        activeStudents,
        monthBookedCa,
        monthCompletedCa,
        monthTotalCa,
        status,
        statusLabel,
        statusAdvice,
        lessonsCount: tLessons.length,
      }
    })
  }, [teachers, adminStats, allWeekLessons, allWeekAvailabilities])

  // Center-wide Summary KPIs
  const centerSummary = useMemo(() => {
    const totalTeachers = teachers.length
    const needSlotsCount = teacherWorkloadList.filter((t) => t.status === 'need_slots').length
    const balancedCount = teacherWorkloadList.filter((t) => t.status === 'balanced').length
    const heavyCount = teacherWorkloadList.filter((t) => t.status === 'heavy').length

    const totalWeekAvailCa = teacherWorkloadList.reduce((sum, t) => sum + t.weekAvailCa, 0)
    const totalWeekBookedCa = teacherWorkloadList.reduce((sum, t) => sum + t.weekBookedCa, 0)
    const totalWeekEmptySlots = Math.max(0, totalWeekAvailCa - totalWeekBookedCa)
    const centerFillRate = totalWeekAvailCa > 0 ? Math.round((totalWeekBookedCa / totalWeekAvailCa) * 100) : 0

    return {
      totalTeachers,
      needSlotsCount,
      balancedCount,
      heavyCount,
      totalWeekAvailCa,
      totalWeekBookedCa,
      totalWeekEmptySlots,
      centerFillRate,
    }
  }, [teachers.length, teacherWorkloadList])

  // Filtered & Sorted Teacher List
  const filteredTeachers = useMemo(() => {
    let list = [...teacherWorkloadList]

    // Search
    if (teacherSearchQuery.trim()) {
      const q = teacherSearchQuery.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q))
    }

    // Workload status filter
    if (workloadFilter !== 'all') {
      list = list.filter((t) => t.status === workloadFilter)
    }

    // Sorting
    list.sort((a, b) => {
      switch (teacherSort) {
        case 'booked_asc':
          return a.weekBookedCa - b.weekBookedCa
        case 'booked_desc':
          return b.weekBookedCa - a.weekBookedCa
        case 'fill_asc':
          return a.fillRate - b.fillRate
        case 'fill_desc':
          return b.fillRate - a.fillRate
        case 'empty_desc':
          return b.weekEmptySlots - a.weekEmptySlots
        default:
          return 0
      }
    })

    return list
  }, [teacherWorkloadList, teacherSearchQuery, workloadFilter, teacherSort])

  // Time-of-Day x Day-of-Week Matrix Data
  const matrixData = useMemo(() => {
    // Filter by teacher if selected
    const filteredAvails = matrixTeacherFilter === 'all'
      ? allWeekAvailabilities
      : allWeekAvailabilities.filter((a) => a.teacherId === matrixTeacherFilter)

    const filteredLessons = matrixTeacherFilter === 'all'
      ? allWeekLessons
      : allWeekLessons.filter((l) => l.teacherId === matrixTeacherFilter)

    // Cell data: map of key `${day.isoDate}_${bucketKey}`
    type CellData = {
      availCa: number
      bookedCa: number
      emptySlots: number
      fillRate: number
      lessons: LessonSession[]
    }

    const grid: Record<string, CellData> = {}

    weekDays.forEach((day) => {
      TIME_BUCKETS.forEach((bucket) => {
        const key = `${day.isoDate}_${bucket.key}`
        grid[key] = {
          availCa: 0,
          bookedCa: 0,
          emptySlots: 0,
          fillRate: 0,
          lessons: [],
        }
      })
    })

    // Populate availabilities
    filteredAvails.forEach((a) => {
      const bKey = getTimeBucket(a.startTime)
      const cellKey = `${a.availableOn}_${bKey}`
      if (grid[cellKey]) {
        grid[cellKey].availCa += getAvailabilityCa(a)
      }
    })

    // Populate lessons
    filteredLessons.forEach((l) => {
      const bKey = getTimeBucket(l.startTime)
      const cellKey = `${l.scheduledOn}_${bKey}`
      if (grid[cellKey]) {
        grid[cellKey].bookedCa += getLessonCa(l)
        grid[cellKey].lessons.push(l)
      }
    })

    // Compute empty slots and fill rate per cell
    Object.values(grid).forEach((cell) => {
      cell.emptySlots = Math.max(0, cell.availCa - cell.bookedCa)
      cell.fillRate = cell.availCa > 0 ? Math.round((cell.bookedCa / cell.availCa) * 100) : 0
    })

    // Compute row totals (per time bucket across all days)
    const rowTotals: Record<TimeBucketKey, { availCa: number; bookedCa: number; emptySlots: number; fillRate: number }> = {
      morning: { availCa: 0, bookedCa: 0, emptySlots: 0, fillRate: 0 },
      noon: { availCa: 0, bookedCa: 0, emptySlots: 0, fillRate: 0 },
      afternoon: { availCa: 0, bookedCa: 0, emptySlots: 0, fillRate: 0 },
      evening: { availCa: 0, bookedCa: 0, emptySlots: 0, fillRate: 0 },
    }

    // Compute col totals (per day across all time buckets)
    const colTotals: Record<string, { availCa: number; bookedCa: number; emptySlots: number; fillRate: number }> = {}
    weekDays.forEach((d) => {
      colTotals[d.isoDate] = { availCa: 0, bookedCa: 0, emptySlots: 0, fillRate: 0 }
    })

    weekDays.forEach((day) => {
      TIME_BUCKETS.forEach((bucket) => {
        const cellKey = `${day.isoDate}_${bucket.key}`
        const cell = grid[cellKey]
        if (!cell) return

        rowTotals[bucket.key].availCa += cell.availCa
        rowTotals[bucket.key].bookedCa += cell.bookedCa

        colTotals[day.isoDate].availCa += cell.availCa
        colTotals[day.isoDate].bookedCa += cell.bookedCa
      })
    })

    // Finalize row totals
    TIME_BUCKETS.forEach((b) => {
      const r = rowTotals[b.key]
      r.emptySlots = Math.max(0, r.availCa - r.bookedCa)
      r.fillRate = r.availCa > 0 ? Math.round((r.bookedCa / r.availCa) * 100) : 0
    })

    // Finalize col totals
    weekDays.forEach((d) => {
      const c = colTotals[d.isoDate]
      c.emptySlots = Math.max(0, c.availCa - c.bookedCa)
      c.fillRate = c.availCa > 0 ? Math.round((c.bookedCa / c.availCa) * 100) : 0
    })

    return { grid, rowTotals, colTotals }
  }, [allWeekAvailabilities, allWeekLessons, weekDays, matrixTeacherFilter])

  // Course Trends & Distribution Data
  const courseTrendsData = useMemo(() => {
    // Collect all students from adminStats or studentTracking
    const studentMap = new Map<string, SchedulerProps['studentTracking'][number]>()

    if (adminStats && adminStats.length > 0) {
      adminStats.forEach((s) => {
        s.studentTracking?.forEach((student) => {
          const key = student.enrollmentId
            ? `enr-${student.enrollmentId}`
            : `${student.studentCode}-${student.course}`
          if (!studentMap.has(key)) {
            studentMap.set(key, student)
          }
        })
      })
    }

    studentTracking.forEach((st) => {
      const key = st.enrollmentId
        ? `enr-${st.enrollmentId}`
        : `${st.studentCode}-${st.course}`
      if (!studentMap.has(key)) {
        studentMap.set(key, st)
      }
    })

    const allStudents = Array.from(studentMap.values())
    const totalStudents = allStudents.length || 1

    // Group by course name
    type CourseAgg = {
      courseName: string
      studentCount: number
      activeCount: number
      almostEndCount: number
      weekLessonsCount: number
      weekCaCount: number
      students: typeof allStudents
    }

    const courseMap = new Map<string, CourseAgg>()

    allStudents.forEach((st) => {
      const cName = (st.course || 'Chưa phân loại').trim()
      if (!courseMap.has(cName)) {
        courseMap.set(cName, {
          courseName: cName,
          studentCount: 0,
          activeCount: 0,
          almostEndCount: 0,
          weekLessonsCount: 0,
          weekCaCount: 0,
          students: [],
        })
      }
      const agg = courseMap.get(cName)!
      agg.studentCount += 1
      if (st.isActive || (!st.isEnded && !st.isReserved)) agg.activeCount += 1
      if (st.almostEnd) agg.almostEndCount += 1
      agg.students.push(st)
    })

    // Count weekly lessons per course
    allWeekLessons.forEach((lesson) => {
      const cName = (lesson.enrollment?.courseName || 'Chưa phân loại').trim()
      const agg = courseMap.get(cName)
      if (agg) {
        agg.weekLessonsCount += 1
        agg.weekCaCount += getLessonCa(lesson)
      }
    })

    const list = Array.from(courseMap.values())
      .map((c) => {
        const sharePct = Math.round((c.studentCount / totalStudents) * 100)
        let trendTag: 'hot' | 'growing' | 'standard' = 'standard'
        let trendLabel = 'Khóa học'

        if (sharePct >= 25 || c.studentCount >= 10) {
          trendTag = 'hot'
          trendLabel = '🔥 Hot Trend / Khóa Chủ Lực'
        } else if (c.weekCaCount >= 8 || sharePct >= 15) {
          trendTag = 'growing'
          trendLabel = '📈 Nhu Cầu Cao'
        } else {
          trendTag = 'standard'
          trendLabel = '🎯 Chuyên Sâu'
        }

        return {
          ...c,
          sharePct,
          trendTag,
          trendLabel,
        }
      })
      .sort((a, b) => b.studentCount - a.studentCount)

    return { list, totalStudents }
  }, [adminStats, studentTracking, allWeekLessons])

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <PieChart className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Dashboard Phân Ca & Quản Trị Tải Giảng Viên (Sales)
                  <span className="rounded-xl bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-700">
                    Live
                  </span>
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  Nắm bắt toàn diện ca mở & ca dạy trong {weekName} (Tháng {monthKey}), điều phối ca công bằng giữa các GV & theo dõi xu hướng khóa học
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenLeadCalculator && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenLeadCalculator}
                className="h-9 rounded-xl border-emerald-300 bg-emerald-50/70 text-xs font-black text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900 shadow-2xs"
              >
                <Sparkles className="size-3.5 mr-1.5 text-emerald-600" />
                🧮 Lead Capacity Calculator
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => onSelectTeacherForSchedule('all')}
              className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800 shadow-sm"
            >
              <Calendar className="size-3.5 mr-1.5" />
              Xem Lịch Toàn Trung Tâm
            </Button>
          </div>
        </div>

        {/* 4 Executive Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2 border-t border-slate-100">
          {/* Card 1: Giảng viên & Cân bằng tải */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Đội ngũ Giảng Viên
              </span>
              <span className="flex size-7 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                <GraduationCap className="size-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{centerSummary.totalTeachers}</span>
                <span className="text-xs font-bold text-slate-500">giảng viên</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                {centerSummary.needSlotsCount > 0 ? (
                  <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-rose-800 border border-rose-200 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
                    {centerSummary.needSlotsCount} GV thiếu ca
                  </span>
                ) : (
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-emerald-800 border border-emerald-200">
                    Tất cả GV đủ ca
                  </span>
                )}
                <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-slate-700">
                  {centerSummary.balancedCount} cân bằng
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Ca Mở Tuần Này (Cung) */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                Tổng Ca Mở (Cung)
              </span>
              <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-200/70 text-emerald-800">
                <Clock className="size-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-950">{centerSummary.totalWeekAvailCa}</span>
                <span className="text-xs font-bold text-emerald-700">ca / {weekName}</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-emerald-900">
                Quy đổi cả tháng: ~<strong>{centerSummary.totalWeekAvailCa * 4}</strong> ca khả dụng
              </p>
            </div>
          </div>

          {/* Card 3: Ca Đã Book & Fill Rate (Cầu) */}
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-800">
                Ca Đã Book & Lấp Đầy
              </span>
              <span className="flex size-7 items-center justify-center rounded-xl bg-indigo-200/70 text-indigo-800">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-950">{centerSummary.totalWeekBookedCa}</span>
                <span className="text-xs font-bold text-indigo-700">ca đã book</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-indigo-200 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, centerSummary.centerFillRate)}%` }}
                  />
                </div>
                <span className="text-xs font-black text-indigo-900 shrink-0">
                  {centerSummary.centerFillRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Slot Trống Còn Lại */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                Slot Trống Xếp Ca Được
              </span>
              <span className="flex size-7 items-center justify-center rounded-xl bg-amber-200/70 text-amber-800">
                <Sparkles className="size-4" />
              </span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-950">{centerSummary.totalWeekEmptySlots}</span>
                <span className="text-xs font-bold text-amber-700">slot trống</span>
              </div>
              <p className="mt-2 text-[11px] font-medium text-amber-900">
                🎯 Cơ hội xếp thêm ca cho học viên mới ngay trong {weekName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MA TRẬN 4 BUỔI x 7 NGÀY (CUNG VS CẦU SÁNG / TRƯA / CHIỀU / TỐI) */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Clock className="size-4 text-indigo-600" />
              Ma Trận Cung - Cầu Khung Giờ (Sáng / Trưa / Chiều / Tối × Thứ trong tuần)
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Thống kê số ca GV mở (Cung) đối chiếu số ca học thực tế (Cầu) và slot trống của từng buổi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by Teacher */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold">
              <span className="text-slate-500">Xem theo:</span>
              <select
                aria-label="Chọn Giảng Viên cho ma trận"
                value={matrixTeacherFilter}
                onChange={(e) => {
                  const val = e.target.value
                  setMatrixTeacherFilter(val === 'all' ? 'all' : Number(val))
                }}
                className="bg-transparent font-black text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">Toàn Trung Tâm (Tất cả GV)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    GV: {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Switch */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMatrixViewMode('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  matrixViewMode === 'all'
                    ? 'bg-white text-slate-900 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Cung vs Cầu
              </button>
              <button
                type="button"
                onClick={() => setMatrixViewMode('lessons')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  matrixViewMode === 'lessons'
                    ? 'bg-white text-indigo-800 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Ca Dạy (Cầu)
              </button>
              <button
                type="button"
                onClick={() => setMatrixViewMode('availabilities')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  matrixViewMode === 'availabilities'
                    ? 'bg-white text-emerald-800 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Ca Mở (Cung)
              </button>
              <button
                type="button"
                onClick={() => setMatrixViewMode('empty')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  matrixViewMode === 'empty'
                    ? 'bg-white text-amber-800 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Slot Trống
              </button>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                <th className="p-3 font-extrabold w-36 text-center border-r border-slate-200">
                  Khung Giờ \ Thứ
                </th>
                {weekDays.map((day) => (
                  <th key={day.isoDate} className="p-2.5 font-black text-center border-r border-slate-200 min-w-[110px]">
                    <div className="text-slate-900 font-black">{day.name}</div>
                    <div className="text-[10px] font-semibold text-slate-500">{day.dateFormatted}</div>
                  </th>
                ))}
                <th className="p-2.5 font-black text-center bg-slate-200/70 text-slate-900 min-w-[110px]">
                  Tổng Cả Tuần
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIME_BUCKETS.map((bucket) => {
                const rowTot = matrixData.rowTotals[bucket.key]
                const IconComponent = bucket.icon

                return (
                  <tr key={bucket.key} className="hover:bg-slate-50/50 transition-colors">
                    {/* Time Bucket Header Cell */}
                    <td className={cn('p-3 border-r border-slate-200 font-bold', bucket.bgColor)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('p-1 rounded-lg bg-white shadow-2xs', bucket.color)}>
                          <IconComponent className="size-4" />
                        </span>
                        <div>
                          <div className={cn('font-black text-xs', bucket.color)}>{bucket.label}</div>
                          <div className="text-[10px] text-slate-500 font-semibold">{bucket.timeRange}</div>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {weekDays.map((day) => {
                      const cellKey = `${day.isoDate}_${bucket.key}`
                      const cell = matrixData.grid[cellKey] || {
                        availCa: 0,
                        bookedCa: 0,
                        emptySlots: 0,
                        fillRate: 0,
                        lessons: [],
                      }

                      return (
                        <td
                          key={day.isoDate}
                          className="p-2 text-center border-r border-slate-200 align-middle hover:bg-slate-100/50 transition-colors"
                        >
                          {matrixViewMode === 'all' && (
                            <div className="flex flex-col gap-1 py-1">
                              <div className="flex items-center justify-center gap-1.5 text-[11px] font-black">
                                <span
                                  title="Số ca GV mở"
                                  className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-800 border border-emerald-200"
                                >
                                  Mở: {cell.availCa}
                                </span>
                                <span
                                  title="Số ca học sinh book dạy"
                                  className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-800 border border-indigo-200"
                                >
                                  Dạy: {cell.bookedCa}
                                </span>
                              </div>
                              <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-500">
                                <span className={cn(
                                  'font-bold',
                                  cell.emptySlots > 0 ? 'text-amber-700' : 'text-slate-400'
                                )}>
                                  Trống: {cell.emptySlots}
                                </span>
                                <span>•</span>
                                <span className={cn(
                                  'font-black',
                                  cell.fillRate >= 80 ? 'text-purple-700' : cell.fillRate >= 50 ? 'text-indigo-600' : 'text-slate-500'
                                )}>
                                  {cell.fillRate}%
                                </span>
                              </div>
                            </div>
                          )}

                          {matrixViewMode === 'lessons' && (
                            <div className="flex flex-col items-center justify-center py-2">
                              <span className={cn(
                                'px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs',
                                cell.bookedCa > 0
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-400'
                              )}>
                                {cell.bookedCa} ca dạy
                              </span>
                              {cell.bookedCa > 0 && (
                                <span className="text-[10px] text-slate-500 mt-1 font-semibold">
                                  {cell.lessons.length} lớp
                                </span>
                              )}
                            </div>
                          )}

                          {matrixViewMode === 'availabilities' && (
                            <div className="flex flex-col items-center justify-center py-2">
                              <span className={cn(
                                'px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs',
                                cell.availCa > 0
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-400'
                              )}>
                                {cell.availCa} ca mở
                              </span>
                            </div>
                          )}

                          {matrixViewMode === 'empty' && (
                            <div className="flex flex-col items-center justify-center py-2">
                              <span className={cn(
                                'px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs',
                                cell.emptySlots > 0
                                  ? 'bg-amber-500 text-white animate-pulse'
                                  : 'bg-slate-100 text-slate-400'
                              )}>
                                {cell.emptySlots} slot trống
                              </span>
                            </div>
                          )}
                        </td>
                      )
                    })}

                    {/* Row Total Cell */}
                    <td className="p-2 text-center bg-slate-50 font-bold align-middle">
                      <div className="flex flex-col gap-1 py-1">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-black">
                          <span className="text-emerald-800">{rowTot.availCa} mở</span>
                          <span>/</span>
                          <span className="text-indigo-800">{rowTot.bookedCa} dạy</span>
                        </div>
                        <div className="text-[10px] font-black text-amber-800">
                          {rowTot.emptySlots} slot trống ({rowTot.fillRate}%)
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-extrabold text-slate-800">
                <td className="p-3 text-center border-r border-slate-200">
                  Tổng Theo Ngày
                </td>
                {weekDays.map((day) => {
                  const col = matrixData.colTotals[day.isoDate]
                  return (
                    <td key={day.isoDate} className="p-2.5 text-center border-r border-slate-200">
                      <div className="text-xs font-black text-indigo-950">
                        {col.bookedCa} / {col.availCa} ca
                      </div>
                      <div className="text-[10px] font-bold text-emerald-800">
                        {col.emptySlots} slot ({col.fillRate}%)
                      </div>
                    </td>
                  )
                })}
                <td className="p-2.5 text-center bg-indigo-100/70 text-indigo-950 font-black">
                  <div className="text-xs font-black">
                    {centerSummary.totalWeekBookedCa} / {centerSummary.totalWeekAvailCa} ca
                  </div>
                  <div className="text-[10px] font-extrabold text-indigo-700">
                    Lấp đầy: {centerSummary.centerFillRate}%
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Matrix Insights Callout for Sales */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-600 shrink-0" />
            <span className="text-slate-700">
              💡 <strong>Gợi ý xếp ca cho Sales:</strong> Khung <strong>Buổi Tối (18:00 - 23:00)</strong> luôn có nhu cầu học cao nhất ({matrixData.rowTotals.evening.bookedCa} ca đã book). Nếu học viên mới muốn học giờ tối mà đã đầy, Sales hãy chủ động hướng dẫn học sinh đăng ký các slot trống ở <strong>Buổi Chiều ({matrixData.rowTotals.afternoon.emptySlots} slot trống)</strong> hoặc <strong>Buổi Sáng ({matrixData.rowTotals.morning.emptySlots} slot trống)</strong> để dễ chọn GV chất lượng!
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: BẢNG CÂN BẰNG TẢI & PHÂN CHIA CA GIỮA CÁC GIẢNG VIÊN */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="size-4 text-indigo-600" />
              Bảng Cân Bằng Tải & Phân Chia Ca Giữa Các Giảng Viên
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Theo dõi số ca trong tuần của từng GV để phân chia học viên mới công bằng, tránh tình trạng GV quá tải trong khi GV khác đói ca
            </p>
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Tìm giảng viên"
                placeholder="Tìm tên giảng viên..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="h-8.5 w-44 pl-8 rounded-xl border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white"
              />
            </div>

            {/* Workload Status Filter */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setWorkloadFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  workloadFilter === 'all'
                    ? 'bg-white text-slate-900 font-black shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                Tất cả ({teachers.length})
              </button>
              <button
                type="button"
                onClick={() => setWorkloadFilter('need_slots')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all flex items-center gap-1',
                  workloadFilter === 'need_slots'
                    ? 'bg-rose-600 text-white font-black shadow-xs'
                    : 'text-rose-700 hover:text-rose-900'
                )}
              >
                <span className="size-1.5 rounded-full bg-current" />
                Cần bù ca ({centerSummary.needSlotsCount})
              </button>
              <button
                type="button"
                onClick={() => setWorkloadFilter('balanced')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  workloadFilter === 'balanced'
                    ? 'bg-emerald-700 text-white font-black shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                )}
              >
                Cân bằng ({centerSummary.balancedCount})
              </button>
              <button
                type="button"
                onClick={() => setWorkloadFilter('heavy')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  workloadFilter === 'heavy'
                    ? 'bg-amber-600 text-white font-black shadow-xs'
                    : 'text-amber-700 hover:text-amber-900'
                )}
              >
                Tải cao ({centerSummary.heavyCount})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold">
              <ArrowUpDown className="size-3 text-slate-400" />
              <select
                aria-label="Sắp xếp danh sách GV"
                value={teacherSort}
                onChange={(e) => setTeacherSort(e.target.value as TeacherSortOption)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="booked_asc">Ca đã book: Thấp ➔ Cao (Ưu tiên bù)</option>
                <option value="booked_desc">Ca đã book: Cao ➔ Thấp</option>
                <option value="empty_desc">Slot trống: Nhiều ➔ Ít</option>
                <option value="fill_asc">Fill rate: Thấp ➔ Cao</option>
                <option value="fill_desc">Fill rate: Cao ➔ Thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Teachers Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-extrabold">
                <th className="p-3.5 pl-4">Giảng Viên</th>
                <th className="p-3.5 text-center">Trạng Thái Tải (Equity)</th>
                <th className="p-3.5 text-center">Ca Đã Book (Tuần)</th>
                <th className="p-3.5 text-center">Ca Mở (Tuần)</th>
                <th className="p-3.5 text-center">Slot Trống</th>
                <th className="p-3.5 text-center">Fill Rate</th>
                <th className="p-3.5 text-center">Học Viên Active</th>
                <th className="p-3.5 text-center">Tiến Độ Tháng</th>
                <th className="p-3.5 pr-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((teacher) => {
                const isNeedSlots = teacher.status === 'need_slots'
                const isHeavy = teacher.status === 'heavy'

                return (
                  <tr
                    key={teacher.id}
                    className={cn(
                      'hover:bg-slate-50/70 transition-colors',
                      isNeedSlots ? 'bg-rose-50/20' : ''
                    )}
                  >
                    {/* Teacher Info */}
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-2xl font-black text-sm shadow-xs',
                          isNeedSlots
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isHeavy
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        )}>
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                            {teacher.name}
                            {isNeedSlots && (
                              <span className="rounded-md bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-800 border border-rose-200">
                                Cần bù
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-500">
                            Target cam kết: {teacher.target} ca/tuần (~{teacher.target * 4} ca/tháng)
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 text-center align-middle">
                      <div className="inline-flex flex-col items-center">
                        <span className={cn(
                          'px-2.5 py-1 rounded-xl text-[11px] font-black border flex items-center gap-1 shadow-2xs',
                          isNeedSlots
                            ? 'bg-rose-100 border-rose-300 text-rose-900'
                            : isHeavy
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        )}>
                          {isNeedSlots ? (
                            <AlertTriangle className="size-3 text-rose-600" />
                          ) : isHeavy ? (
                            <Clock className="size-3 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="size-3 text-emerald-600" />
                          )}
                          {teacher.statusLabel}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 mt-1 max-w-[160px] text-center">
                          {teacher.statusAdvice}
                        </span>
                      </div>
                    </td>

                    {/* Booked Ca */}
                    <td className="p-3.5 text-center align-middle">
                      <span className={cn(
                        'text-sm font-black px-2.5 py-1 rounded-xl inline-block',
                        isNeedSlots
                          ? 'bg-rose-100 text-rose-950 font-black'
                          : 'text-indigo-900 bg-indigo-50 font-black'
                      )}>
                        {teacher.weekBookedCa} ca
                      </span>
                    </td>

                    {/* Avail Ca */}
                    <td className="p-3.5 text-center align-middle font-bold text-slate-700">
                      {teacher.weekAvailCa} ca
                    </td>

                    {/* Empty Slots */}
                    <td className="p-3.5 text-center align-middle">
                      <span className={cn(
                        'text-xs font-black px-2 py-0.5 rounded-lg inline-block',
                        teacher.weekEmptySlots > 0
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-slate-100 text-slate-400'
                      )}>
                        {teacher.weekEmptySlots} slot
                      </span>
                    </td>

                    {/* Fill Rate */}
                    <td className="p-3.5 text-center align-middle">
                      <div className="flex flex-col items-center gap-1 w-20 mx-auto">
                        <span className="font-black text-slate-900 text-xs">
                          {teacher.fillRate}%
                        </span>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              teacher.fillRate >= 80
                                ? 'bg-purple-600'
                                : teacher.fillRate >= 45
                                ? 'bg-emerald-600'
                                : 'bg-rose-500'
                            )}
                            style={{ width: `${Math.min(100, teacher.fillRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Active Students */}
                    <td className="p-3.5 text-center align-middle">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-lg">
                        {teacher.activeStudents} HV
                      </span>
                    </td>

                    {/* Month Progress */}
                    <td className="p-3.5 text-center align-middle">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-800">
                          {teacher.monthBookedCa} ca
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Tháng {monthKey}
                        </span>
                      </div>
                    </td>

                    {/* Action Button: Jump to Schedule */}
                    <td className="p-3.5 pr-4 text-right align-middle">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onSelectTeacherForSchedule(teacher.id)}
                        className={cn(
                          'h-8 rounded-xl px-3 text-xs font-black transition-all shadow-2xs',
                          isNeedSlots
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        )}
                      >
                        <span>Xếp Ca</span>
                        <ArrowRight className="size-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: THỐNG KÊ XU HƯỚNG & PHÂN BỔ CÁC KHÓA HỌC */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="size-4 text-indigo-600" />
              Thống Kê Xu Hướng & Phân Bổ Các Khóa Học
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Theo dõi thị phần học viên, số ca học đang diễn ra của từng khóa để đón đầu xu hướng và tư vấn khóa học hiệu quả
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Tổng cộng:</span>
            <span className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-black text-indigo-900">
              {courseTrendsData.list.length} Khóa học • {courseTrendsData.totalStudents} Học viên
            </span>
          </div>
        </div>

        {/* Visual Course Distribution Bar */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Tỷ trọng thị phần các khóa học (% Active Students)
          </span>
          <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
            {courseTrendsData.list.map((c, i) => {
              const bgColors = [
                'bg-indigo-600',
                'bg-emerald-600',
                'bg-sky-500',
                'bg-amber-500',
                'bg-purple-600',
                'bg-rose-500',
                'bg-teal-500',
                'bg-slate-500',
              ]
              const color = bgColors[i % bgColors.length]
              if (c.sharePct <= 0) return null

              return (
                <div
                  key={c.courseName}
                  title={`${c.courseName}: ${c.studentCount} HV (${c.sharePct}%)`}
                  className={cn('h-full transition-all', color)}
                  style={{ width: `${c.sharePct}%` }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600 pt-1">
            {courseTrendsData.list.slice(0, 5).map((c, i) => {
              const dotColors = [
                'bg-indigo-600',
                'bg-emerald-600',
                'bg-sky-500',
                'bg-amber-500',
                'bg-purple-600',
              ]
              return (
                <div key={c.courseName} className="flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full', dotColors[i % dotColors.length])} />
                  <span>{c.courseName}:</span>
                  <strong className="text-slate-900">{c.sharePct}%</strong>
                </div>
              )
            })}
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courseTrendsData.list.map((c) => {
            const isHot = c.trendTag === 'hot'
            const isGrowing = c.trendTag === 'growing'

            return (
              <div
                key={c.courseName}
                className={cn(
                  'flex flex-col justify-between rounded-2xl border p-4.5 gap-4 transition-all shadow-2xs hover:shadow-sm',
                  isHot
                    ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white'
                    : isGrowing
                    ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/30 to-white'
                    : 'border-slate-200 bg-white'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-slate-900 text-sm leading-snug">
                      {c.courseName}
                    </h3>
                    <span className={cn(
                      'shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg border',
                      isHot
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : isGrowing
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    )}>
                      {c.trendLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[10px] block font-bold text-slate-400 uppercase">
                        Học Viên
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <strong className="text-lg font-black text-slate-900">{c.studentCount}</strong>
                        <span className="text-[11px] font-semibold text-slate-500">HV ({c.sharePct}%)</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                      <span className="text-[10px] block font-bold text-slate-400 uppercase">
                        Ca Trong Tuần
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <strong className="text-lg font-black text-indigo-900">{c.weekCaCount}</strong>
                        <span className="text-[11px] font-semibold text-indigo-600">ca dạy</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer preview students */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-500">
                    {c.activeCount} đang học • {c.almostEndCount} sắp kết thúc
                  </span>
                  {c.students.length > 0 && onSelectStudentCode && (
                    <button
                      type="button"
                      onClick={() => onSelectStudentCode(c.students[0].studentCode)}
                      className="font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Xem HV ➔
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
