import { router } from '@inertiajs/react'
import {
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Sparkles,
  User,
  Users,
  Video,
  X,
} from 'lucide-react'
import { type ReactElement, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  lessonSessionPath,
  teacherAvailabilitiesPath,
  teacherAvailabilityPath,
} from '@/lib/routes'
import { cn } from '@/lib/utils'
import type {
  LessonSession,
  Person,
  PersonRole,
  SchedulerMutationRedirectParams,
  TeacherAvailability,
  WeekDay,
} from '../types'
import { TagBadges } from './note-tags'
import { StructuredNoteDisplay } from './structured-lesson-note'

type Props = {
  role: PersonRole
  personId: number
  teacherId: number | 'all' | string
  teachers?: Person[]
  weekDays: WeekDay[]
  timeIntervals: string[]
  availabilities: TeacherAvailability[]
  lessons: LessonSession[]
  defaultDuration: number
  redirectParams: SchedulerMutationRedirectParams
  onLessonClick: (lesson: LessonSession) => void
  onAvailabilityClick: (availability: TeacherAvailability) => void
  availabilityMode?: 'interactive' | 'readonly' | 'hidden'
  locked?: boolean
  onEmptySlotClick?: (date: string, time: string, dayHeaderLabel: string) => void
  onSelectStudentCode?: (studentCode: string) => void
}

export function DailyScheduleView({
  role,
  personId,
  teacherId,
  teachers,
  weekDays,
  timeIntervals,
  availabilities,
  lessons,
  defaultDuration,
  redirectParams,
  onLessonClick,
  onAvailabilityClick,
  availabilityMode = 'hidden',
  locked = false,
  onEmptySlotClick,
  onSelectStudentCode,
}: Props): ReactElement {
  // Find current today ISO or default to first day of week
  const todayIso = new Date().toISOString().slice(0, 10)
  const initialDayIndex = useMemo(() => {
    const found = weekDays.findIndex((d) => d.isoDate === todayIso)
    return found !== -1 ? found : 0
  }, [weekDays, todayIso])

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(initialDayIndex)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterMode, setFilterMode] = useState<'all' | 'lessons' | 'availability'>('all')
  const [internalTeacherFilter, setInternalTeacherFilter] = useState<'all' | number>('all')

  const isAllMode = teacherId === 'all' || !teacherId || Number(teacherId) === 0
  const currentDay = weekDays[selectedDayIndex] || weekDays[0]
  const currentDate = currentDay?.isoDate ?? ''

  const [optimisticStatus, setOptimisticStatus] = useState<Record<number, string>>({})
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set())

  const handleUpdateLessonStatus = (lessonId: number, nextStatus: string) => {
    setOptimisticStatus((prev) => ({ ...prev, [lessonId]: nextStatus }))
    setUpdatingIds((prev) => new Set(prev).add(lessonId))

    const nextLessonStatus =
      nextStatus === 'completed' ? 'completed' : nextStatus === 'absent' ? 'absent' : 'scheduled'

    // CS chỉ update cs_status, GV chỉ update lesson_status, Admin/Sales update cả 2
    const patchPayload =
      role === 'cs'
        ? { cs_status: nextStatus }
        : role === 'teacher'
          ? { lesson_status: nextLessonStatus }
          : {
              cs_status: nextStatus,
              lesson_status: nextLessonStatus,
            }

    router.patch(
      lessonSessionPath(lessonId),
      {
        lesson_session: patchPayload,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          setUpdatingIds((prev) => {
            const next = new Set(prev)
            next.delete(lessonId)
            return next
          })
          toast.success(
            role === 'cs'
              ? nextStatus === 'completed'
                ? '✅ CS: Đã xác nhận hoàn thành ca học!'
                : 'CS: Đã chuyển ca học về chưa duyệt.'
              : role === 'teacher'
                ? nextStatus === 'completed'
                  ? '✅ GV: Đã điểm danh hoàn thành ca dạy!'
                  : 'GV: Đã chuyển ca học về chưa dạy.'
                : '✅ Đã cập nhật trạng thái ca học thành công!'
          )
        },
        onError: () => {
          setUpdatingIds((prev) => {
            const next = new Set(prev)
            next.delete(lessonId)
            return next
          })
          setOptimisticStatus((prev) => {
            const copy = { ...prev }
            delete copy[lessonId]
            return copy
          })
          toast.error('Có lỗi xảy ra khi cập nhật trạng thái ca học.')
        },
      }
    )
  }

  // Filter lessons & availabilities for this teacher or all teachers
  const selectedLessons = useMemo(() => {
    let result = lessons
    if (!isAllMode) {
      result = result.filter((l) => l.teacherId === Number(teacherId))
    }
    if (internalTeacherFilter !== 'all') {
      result = result.filter((l) => l.teacherId === Number(internalTeacherFilter))
    }
    return result
  }, [lessons, teacherId, isAllMode, internalTeacherFilter])

  const selectedAvailabilities = useMemo(() => {
    let result = availabilities
    if (!isAllMode) {
      result = result.filter((a) => a.teacherId === Number(teacherId))
    }
    if (internalTeacherFilter !== 'all') {
      result = result.filter((a) => a.teacherId === Number(internalTeacherFilter))
    }
    return result
  }, [availabilities, teacherId, isAllMode, internalTeacherFilter])

  const visibleAvailabilities =
    availabilityMode === 'hidden' ? [] : selectedAvailabilities

  // Filter by current day
  const dayLessons = useMemo(
    () =>
      selectedLessons
        .filter((l) => l.scheduledOn === currentDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [selectedLessons, currentDate]
  )

  const dayAvailabilities = useMemo(
    () =>
      visibleAvailabilities
        .filter((a) => a.availableOn === currentDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [visibleAvailabilities, currentDate]
  )

  // Lesson search filter (by student name, code, course, notes, or teacher name)
  const filteredDayLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return dayLessons

    return dayLessons.filter((l) => {
      const studentName = l.enrollment?.student?.name?.toLowerCase() || ''
      const studentCode = l.enrollment?.student?.code?.toLowerCase() || ''
      const courseName = l.enrollment?.courseName?.toLowerCase() || ''
      const teacherName = l.teacherName?.toLowerCase() || ''
      const notes = l.lessonNotes?.toLowerCase() || ''
      return (
        studentName.includes(q) ||
        studentCode.includes(q) ||
        courseName.includes(q) ||
        teacherName.includes(q) ||
        notes.includes(q)
      )
    })
  }, [dayLessons, searchQuery])

  // Count lessons per day in this week
  const lessonCountByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of selectedLessons) {
      counts[l.scheduledOn] = (counts[l.scheduledOn] || 0) + 1
    }
    return counts
  }, [selectedLessons])

  const availabilityCountByDate = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of visibleAvailabilities) {
      counts[a.availableOn] = (counts[a.availableOn] || 0) + 1
    }
    return counts
  }, [visibleAvailabilities])

  // Quick navigation
  const handlePrevDay = () => {
    setSelectedDayIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleNextDay = () => {
    setSelectedDayIndex((prev) => Math.min(prev + 1, weekDays.length - 1))
  }

  const handleToday = () => {
    const idx = weekDays.findIndex((d) => d.isoDate === todayIso)
    if (idx !== -1) setSelectedDayIndex(idx)
  }

  const isToday = currentDate === todayIso

  const totalMinutes = useMemo(() => {
    return filteredDayLessons.reduce((acc, l) => acc + (l.durationMinutes || 40), 0)
  }, [filteredDayLessons])

  const totalHoursFormatted = (totalMinutes / 60).toFixed(1)

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. Day Selector Bar (Monday -> Sunday pills) ── */}
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedDayIndex <= 0}
              onClick={handlePrevDay}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <Button
              type="button"
              variant={isToday ? 'default' : 'outline'}
              size="sm"
              onClick={handleToday}
              className={cn(
                'h-8 px-3 rounded-xl text-xs font-bold transition-all',
                isToday
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white font-black'
                  : 'text-slate-700'
              )}
            >
              Hôm nay
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedDayIndex >= weekDays.length - 1}
              onClick={handleNextDay}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <ChevronRight className="size-4" />
            </Button>

            <div className="ml-2 flex items-center gap-2">
              <Calendar className="size-4 text-emerald-600" />
              <span className="text-sm font-black text-slate-900">
                {currentDay?.name} ({currentDay?.dateFormatted})
              </span>
              {isToday && (
                <span className="rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 uppercase tracking-wide">
                  Hôm nay
                </span>
              )}
            </div>
          </div>

          {/* Filters: Teacher dropdown & Search bar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {teachers && teachers.length > 0 && (isAllMode || role === 'cs') && (
              <div className="w-full sm:w-48">
                <Select
                  value={String(internalTeacherFilter)}
                  onValueChange={(v) => setInternalTeacherFilter(v === 'all' ? 'all' : Number(v))}
                >
                  <SelectTrigger
                    aria-label="Lọc nhanh theo Giáo Viên"
                    className="h-8 rounded-xl text-xs font-bold bg-slate-50 border-slate-200 cursor-pointer text-indigo-900"
                  >
                    <SelectValue placeholder="Lọc GV..." />
                  </SelectTrigger>
                  <SelectContent position="popper" className="rounded-xl text-xs max-h-64 z-50 bg-white shadow-md border border-slate-200">
                    <SelectItem value="all" className="text-xs font-black text-indigo-700 py-1.5 cursor-pointer">
                      🌟 Tất cả Giảng Viên
                    </SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="text-xs font-bold py-1.5 cursor-pointer">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search bar for student name / course / teacher */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm HV, GV, khóa học..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-8 rounded-xl text-xs bg-slate-50 border-slate-200 font-semibold focus:bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Week Day Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 pt-2 border-t border-slate-100">
          {weekDays.map((day, idx) => {
            const isSelected = idx === selectedDayIndex
            const isDayToday = day.isoDate === todayIso
            const countLessons = lessonCountByDate[day.isoDate] || 0
            const countAvail = availabilityCountByDate[day.isoDate] || 0

            return (
              <button
                key={day.isoDate}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-2xl transition-all border text-center relative',
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-emerald-400 font-black'
                    : isDayToday
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold hover:bg-emerald-100/60'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                )}
              >
                <span className={cn('text-xs', isSelected ? 'text-white' : 'text-slate-900 font-bold')}>
                  {day.name}
                </span>
                <span className={cn('text-[11px] font-mono', isSelected ? 'text-emerald-300' : 'text-slate-500')}>
                  {day.dateFormatted}
                </span>

                {/* Counter Badges */}
                <div className="mt-1 flex items-center gap-1">
                  {countLessons > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      )}
                    >
                      {countLessons} ca
                    </span>
                  )}
                  {countAvail > 0 && availabilityMode !== 'hidden' && (
                    <span
                      className={cn(
                        'text-[10px] font-black px-1.5 py-0.2 rounded-full',
                        isSelected
                          ? 'bg-teal-400 text-slate-900'
                          : 'bg-teal-100 text-teal-800'
                      )}
                    >
                      +{countAvail} rảnh
                    </span>
                  )}
                  {countLessons === 0 && countAvail === 0 && (
                    <span className="text-[10px] opacity-40 font-medium">—</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Daily Summary Metric Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-sm font-black text-sm">
            {currentDay?.dayNum}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              Lịch làm việc {currentDay?.name} ({currentDay?.dateFormatted})
            </h3>
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
              <span>{filteredDayLessons.length} ca dạy</span>
              <span>•</span>
              <span>Tổng thời lượng: ~{totalHoursFormatted} giờ</span>
              {(isAllMode || role === 'cs') && filteredDayLessons.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-indigo-700 font-bold">
                    {new Set(filteredDayLessons.map((l) => l.teacherId)).size} GV tham gia
                  </span>
                </>
              )}
              {dayAvailabilities.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-teal-700 font-bold">{dayAvailabilities.length} ca rảnh</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Filter tags: All | Lessons only | Availabilities */}
        <div className="flex items-center gap-1.5 rounded-xl bg-white/80 p-1 border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all',
              filterMode === 'all'
                ? 'bg-slate-900 text-white font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Tất cả ({filteredDayLessons.length + (availabilityMode !== 'hidden' ? dayAvailabilities.length : 0)})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('lessons')}
            className={cn(
              'px-2.5 py-1 rounded-lg transition-all',
              filterMode === 'lessons'
                ? 'bg-emerald-700 text-white font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Ca dạy ({filteredDayLessons.length})
          </button>
          {availabilityMode !== 'hidden' && (
            <button
              type="button"
              onClick={() => setFilterMode('availability')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all',
                filterMode === 'availability'
                  ? 'bg-teal-700 text-white font-black'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Ca rảnh ({dayAvailabilities.length})
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Chronological Daily Agenda / Timeline ── */}
      {filteredDayLessons.length === 0 && (filterMode === 'lessons' || dayAvailabilities.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-xs">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
            <CalendarDays className="size-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Không có ca dạy nào trong {currentDay?.name} ({currentDay?.dateFormatted})
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              {searchQuery
                ? `Không tìm thấy kết quả khớp với "${searchQuery}".`
                : 'Giáo viên không có ca học nào được xếp vào ngày này.'}
            </p>
          </div>

          {searchQuery && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-2 rounded-xl text-xs font-bold"
            >
              Xóa tìm kiếm
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Lessons List */}
          {filterMode !== 'availability' &&
            filteredDayLessons.map((lesson) => {
              const student = lesson.enrollment?.student
              const isGvDone = lesson.lessonStatus === 'completed'
              const isGvAbsent = lesson.lessonStatus === 'absent'
              const isCsDone = (role === 'cs' && optimisticStatus[lesson.id] ? optimisticStatus[lesson.id] === 'completed' : lesson.csStatus === 'completed')
              const isCsAbsent = (role === 'cs' && optimisticStatus[lesson.id] ? optimisticStatus[lesson.id] === 'absent' : lesson.csStatus === 'absent')
              const isMatched = isGvDone && isCsDone

              const effectiveStatus =
                optimisticStatus[lesson.id] ??
                (role === 'cs'
                  ? (lesson.csStatus || 'upcoming')
                  : role === 'teacher'
                    ? (lesson.lessonStatus === 'completed' ? 'completed' : lesson.lessonStatus === 'absent' ? 'absent' : 'upcoming')
                    : isMatched
                      ? 'completed'
                      : (lesson.csStatus === 'completed' || lesson.lessonStatus === 'completed' ? 'completed' : 'upcoming'))
              const isCompleted = effectiveStatus === 'completed'
              const isAbsent = effectiveStatus === 'absent'
              const isUpdating = updatingIds.has(lesson.id)
              const meetLink = lesson.enrollment?.meetLink

              return (
                <div
                  key={lesson.id}
                  onClick={() => onLessonClick(lesson)}
                  className={cn(
                    'group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer',
                    isMatched
                      ? 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400 ring-1 ring-emerald-300/40'
                      : isCompleted
                        ? 'border-blue-200 bg-blue-50/20 hover:border-blue-300'
                        : isAbsent
                          ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                          : 'border-slate-200 hover:border-emerald-400 hover:ring-2 hover:ring-emerald-100'
                  )}
                >
                  {/* Left: Time badge & status */}
                  <div className="flex items-start md:items-center gap-4">
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900 text-white px-3.5 py-2.5 min-w-[90px] shadow-sm">
                      <span className="font-mono text-xs font-black">
                        {lesson.startTime}
                      </span>
                      <span className="text-[10px] text-slate-400">đến</span>
                      <span className="font-mono text-xs font-black text-emerald-300">
                        {lesson.endTime}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                        ({lesson.durationMinutes}m)
                      </span>
                    </div>

                    {/* Student & Course Details */}
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition">
                          {student?.name || 'Học viên'}
                        </span>
                        <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                          {student?.code || 'N/A'}
                        </span>

                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[11px] font-extrabold px-2.5 py-0.5 rounded-full',
                            lesson.dayLabel?.includes('&')
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800'
                          )}
                        >
                          {lesson.dayLabel || 'Day 1'}
                        </Badge>

                        {(isAllMode || role === 'cs' || lesson.teacherName) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-black text-indigo-800 shadow-2xs">
                            <span>👨‍🏫</span>
                            <span>GV: {lesson.teacherName || 'Chưa rõ'}</span>
                          </span>
                        )}

                        {/* TÁCH BẠCH TRẠNG THÁI GV & CS */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            'text-[10px] font-extrabold px-2 py-0.5 rounded-lg border',
                            isGvDone
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isGvAbsent
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            GV: {isGvDone ? 'Đã dạy ✅' : isGvAbsent ? 'Vắng ❌' : 'Chưa dạy ⏳'}
                          </span>

                          <span className={cn(
                            'text-[10px] font-extrabold px-2 py-0.5 rounded-lg border',
                            isCsDone
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : isCsAbsent
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            CS: {isCsDone ? 'Đã duyệt ✅' : isCsAbsent ? 'Vắng ❌' : 'Chờ duyệt ⏳'}
                          </span>

                          {isMatched && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-700 text-white shadow-xs">
                              🎉 Khớp lệnh
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                        <BookOpen className="size-3.5 text-emerald-600" />
                        <span>Khóa: {lesson.enrollment?.courseName}</span>
                      </p>

                      {/* Note / Aim / Tags */}
                      {(lesson.lessonNotes || student?.studentNote || student?.aim) && (
                        <div className="flex flex-col gap-1 mt-1.5 text-[11px] text-slate-600">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {student?.aim && (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-lg font-bold">
                                Aim: {student.aim}
                              </span>
                            )}
                            {student?.studentNote && <TagBadges text={student.studentNote} />}
                          </div>
                          {lesson.lessonNotes && (
                            <StructuredNoteDisplay note={lesson.lessonNotes} compact />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions (Meet link, View Student, Status badge) */}
                  <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                    {meetLink && (
                      <a
                        href={meetLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 transition shadow-sm"
                      >
                        <Video className="size-3.5" />
                        <span>Vào Meet</span>
                        <ExternalLink className="size-3 opacity-80" />
                      </a>
                    )}

                    {student?.code && onSelectStudentCode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectStudentCode(student.code)
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs px-3 py-2 transition shadow-2xs"
                      >
                        Xem Lịch HV
                      </button>
                    )}

                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={effectiveStatus}
                        disabled={isUpdating}
                        onValueChange={(val) => handleUpdateLessonStatus(lesson.id, val)}
                      >
                        <SelectTrigger
                          aria-label="Cập nhật trạng thái ca học"
                          className={cn(
                            'h-8 px-3 rounded-full text-xs font-black border transition shadow-2xs cursor-pointer gap-1.5',
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                              : isAbsent
                                ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            {isUpdating ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin text-slate-600 shrink-0" />
                                <span>Đang lưu...</span>
                              </>
                            ) : isCompleted ? (
                              <>
                                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                <span>{role === 'cs' ? 'CS: Đã duyệt' : role === 'teacher' ? 'GV: Đã dạy' : 'Đã hoàn thành'}</span>
                              </>
                            ) : isAbsent ? (
                              <>
                                <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                                <span>Vắng mặt</span>
                              </>
                            ) : (
                              <>
                                <Clock className="size-3.5 text-blue-600 shrink-0" />
                                <span>{role === 'cs' ? 'CS: Chờ duyệt' : role === 'teacher' ? 'GV: Chưa dạy' : 'Chưa diễn ra'}</span>
                              </>
                            )}
                          </div>
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          align="end"
                          className="rounded-2xl text-xs z-50 bg-white shadow-xl border border-slate-200 min-w-[190px] p-1.5"
                        >
                          <SelectItem
                            value="completed"
                            className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-emerald-800 focus:bg-emerald-50"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                              <span>{role === 'cs' ? 'CS: Xác nhận Đã học' : role === 'teacher' ? 'GV: Điểm danh Đã dạy' : 'Đã hoàn thành'}</span>
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="upcoming"
                            className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-blue-800 focus:bg-blue-50"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="size-3.5 text-blue-600 shrink-0" />
                              <span>{role === 'cs' ? 'CS: Chưa duyệt' : role === 'teacher' ? 'GV: Chưa dạy' : 'Chưa diễn ra'}</span>
                            </div>
                          </SelectItem>
                          <SelectItem
                            value="absent"
                            className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-rose-800 focus:bg-rose-50"
                          >
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                              <span>Vắng mặt (Absent)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )
            })}

          {/* Availabilities List */}
          {filterMode !== 'lessons' &&
            availabilityMode !== 'hidden' &&
            dayAvailabilities.map((avail) => (
              <div
                key={avail.id}
                onClick={() => onAvailabilityClick(avail)}
                className="flex items-center justify-between gap-4 rounded-3xl border border-teal-200 bg-teal-50/50 hover:bg-teal-50 p-4 transition cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center rounded-2xl bg-teal-800 text-white px-3 py-1.5 min-w-[80px]">
                    <span className="font-mono text-xs font-black">
                      {avail.startTime}
                    </span>
                    <span className="text-[10px] text-teal-200">
                      {avail.endTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-teal-500 animate-pulse" />
                      Ca rảnh đăng ký sẵn sàng dạy ({avail.durationMinutes} phút)
                      {avail.teacherName && (
                        <span className="ml-1 inline-flex items-center rounded-md bg-teal-100 px-1.5 py-0.5 text-[10px] font-black text-teal-800">
                          👨‍🏫 GV: {avail.teacherName}
                        </span>
                      )}
                    </span>
                    <p className="text-[11px] font-semibold text-teal-700">
                      Chờ Sales xếp học viên vào ca này
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold text-teal-800 hover:bg-teal-100 rounded-xl"
                >
                  Chi tiết ca rảnh →
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
