import { router } from '@inertiajs/react'
import { Clock3, Plus, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  rescheduleLessonSessionPath,
  teacherAvailabilitiesPath,
  teacherAvailabilityPath,
} from '@/lib/routes'
import { cn } from '@/lib/utils'
import { blocksForDuration } from '../calendar'
import type {
  LessonSession,
  Person,
  PersonRole,
  SchedulerMutationRedirectParams,
  TeacherAvailability,
  WeekDay,
} from '../types'
import { TagBadges } from './note-tags'

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
  pendingSlots?: Set<string>
  onSlotToggle?: (date: string, time: string) => void
  onEmptySlotClick?: (date: string, time: string, dayHeaderLabel: string) => void
  isEditMode?: boolean
  selectedDeleteIds?: Set<number>
  onToggleDeleteSlot?: (availabilityId: number) => void
}

export function ScheduleGrid({
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
  availabilityMode = role === 'teacher' ? 'interactive' : role === 'sales' ? 'readonly' : 'hidden',
  locked = false,
  pendingSlots,
  onSlotToggle,
  onEmptySlotClick,
  isEditMode = false,
  selectedDeleteIds,
  onToggleDeleteSlot,
}: Props) {
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [draggingLessonId, setDraggingLessonId] = useState<number | null>(null)
  const [draggingAvailabilityId, setDraggingAvailabilityId] = useState<number | null>(null)
  const [internalTeacherFilter, setInternalTeacherFilter] = useState<'all' | number>('all')

  const isAllMode = teacherId === 'all' || !teacherId || Number(teacherId) === 0

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

  const visibleAvailabilities = availabilityMode === 'hidden' ? [] : selectedAvailabilities
  const canManageAvailability =
    !locked &&
    ((role === 'teacher' && availabilityMode === 'interactive') ||
      (role === 'sales' && availabilityMode === 'readonly'))
  const canRescheduleLessons = !locked && (role === 'teacher' || role === 'cs' || role === 'sales')

  const rescheduleLesson = (lessonId: number, scheduledOn: string, startTime: string) => {
    setAvailabilityError(null)
    router.patch(
      rescheduleLessonSessionPath(lessonId),
      {
        lesson_session: {
          scheduled_on: scheduledOn,
          start_time: startTime,
        },
        ...redirectParams,
      },
      { preserveScroll: true, onError: (errors) => setAvailabilityError(firstError(errors)) }
    )
  }

  const moveAvailability = (availabilityId: number, availableOn: string, startTime: string) => {
    setAvailabilityError(null)
    router.patch(
      teacherAvailabilityPath(availabilityId),
      {
        teacher_availability: {
          available_on: availableOn,
          start_time: startTime,
        },
        ...redirectParams,
      },
      { preserveScroll: true, onError: (errors) => setAvailabilityError(firstError(errors)) }
    )
  }

  const now = new Date()
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <section
      aria-label="Lịch tuần"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      data-person-id={personId}
      data-scheduler-grid="prototype"
    >
      {availabilityError && (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"
        >
          {availabilityError}
        </p>
      )}
      {(isAllMode || role === 'cs') && teachers && teachers.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-900">🔍 Lọc nhanh theo GV trong lưới:</span>
            <div className="w-52">
              <Select
                value={String(internalTeacherFilter)}
                onValueChange={(v) => setInternalTeacherFilter(v === 'all' ? 'all' : Number(v))}
              >
                <SelectTrigger
                  aria-label="Lọc nhanh theo Giáo Viên"
                  className="h-8 rounded-xl text-xs font-black bg-white border-indigo-200 text-indigo-900 cursor-pointer shadow-2xs"
                >
                  <SelectValue placeholder="Tất cả Giảng Viên" />
                </SelectTrigger>
                <SelectContent position="popper" className="rounded-xl text-xs max-h-64 z-50 bg-white shadow-md border border-slate-200">
                  <SelectItem value="all" className="text-xs font-black text-indigo-700 py-1.5 cursor-pointer">
                    🌟 Tất cả Giảng Viên ({lessons.length} ca tuần này)
                  </SelectItem>
                  {teachers.map((t) => {
                    const count = lessons.filter((l) => l.teacherId === t.id).length
                    return (
                      <SelectItem key={t.id} value={String(t.id)} className="text-xs font-bold py-1.5 cursor-pointer">
                        {t.name} ({count} ca)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isAllMode && (
            <span className="text-[11px] font-extrabold text-indigo-800 bg-white/80 px-3 py-1 rounded-xl border border-indigo-200/60 shadow-2xs">
              💡 Chế độ toàn trung tâm: Hiển thị đồng thời các ca song song của tất cả GV
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
        <div
          className="grid min-w-[900px] grid-cols-8 gap-2 rounded-2xl border border-slate-200 bg-slate-100 p-3 text-center text-xs font-bold"
          style={{ gridAutoRows: 'minmax(46px, auto)' }}
        >
          <div className="sticky top-0 left-0 z-30 flex min-h-[48px] items-center justify-center rounded-xl bg-slate-100 py-1 font-mono text-slate-500">
            Khung Giờ
          </div>
          {weekDays.map((day, index) => {
            const isToday = day.isoDate === todayIso
            return (
              <div
                key={day.isoDate}
                id={`day-header-${day.isoDate}`}
                data-today={isToday ? 'true' : undefined}
                className={cn(
                  'sticky top-0 z-20 flex min-h-[48px] flex-col items-center justify-center rounded-xl py-1 text-sm font-black transition-all duration-300',
                  isToday
                    ? 'bg-emerald-700 text-white shadow-lg ring-2 ring-emerald-500 ring-offset-2 scale-[1.02]'
                    : 'bg-slate-100 text-slate-800'
                )}
                style={{ gridColumn: index + 2, gridRow: 1 }}
              >
                <div className="flex items-center gap-1.5">
                  <span>{day.name}</span>
                  {isToday && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-200 border border-emerald-400/40 shadow-xs">
                      <span className="size-1.5 rounded-full bg-emerald-300 animate-ping inline-block" />
                      Hôm nay
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isToday ? 'text-emerald-100 font-bold' : 'text-slate-500'
                  )}
                >
                  {day.dateFormatted}
                </span>
              </div>
            )
          })}

          {timeIntervals.map((time, rowIndex) => (
            <div
              key={time}
              className="sticky left-0 z-10 flex min-h-[46px] items-center justify-center rounded-xl border border-slate-200 bg-white py-2 text-center font-mono text-[11px] font-bold text-slate-500 shadow-sm"
              style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
            >
              {time}
            </div>
          ))}

          {weekDays.flatMap((day, dayIndex) =>
            timeIntervals.map((time, rowIndex) => {
              const matchingLessons = selectedLessons.filter(
                (entry) => entry.scheduledOn === day.isoDate && entry.startTime === time
              )
              const availability = selectedAvailabilities.find(
                (entry) => entry.availableOn === day.isoDate && entry.startTime === time
              )

              if (matchingLessons.length === 0 && slotIsCovered(day.isoDate, time, selectedLessons, visibleAvailabilities, isAllMode)) {
                return null
              }

              const placement = { gridColumn: dayIndex + 2, gridRow: rowIndex + 2 }

              if (matchingLessons.length === 1) {
                const lesson = matchingLessons[0]
                const noteBadge =
                  lesson.lessonNotes?.trim() || lesson.enrollment?.student?.studentNote?.trim()
                const showRegistrationMeet =
                  role === 'teacher' && availabilityMode === 'interactive'
                const showTeachingTimeRange = role !== 'sales' && !showRegistrationMeet
                const rowSpan = isAllMode ? 1 : blocksForDuration(lesson.durationMinutes)

                return (
                  <button
                    key={`${day.isoDate}-${time}-${lesson.id}`}
                    type="button"
                    draggable={canRescheduleLessons}
                    data-lesson-id={lesson.id}
                    title={role === 'cs' ? 'Click xem chi tiết hoặc Kéo thả dời lịch' : undefined}
                    onDragStart={(event) => {
                      if (!canRescheduleLessons) return

                      setDraggingLessonId(lesson.id)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({ lessonId: lesson.id })
                      )
                    }}
                    onDragEnd={() => setDraggingLessonId(null)}
                    onClick={() => onLessonClick(lesson)}
                    className={cn(
                      'z-10 flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border-2 p-2.5 text-left text-[11px] leading-snug shadow-sm transition-all hover:shadow-md',
                      canRescheduleLessons && 'cursor-grab active:cursor-grabbing',
                      draggingLessonId === lesson.id && 'opacity-60',
                      lessonTone(lesson)
                    )}
                    style={{
                      ...placement,
                      gridRow: `${rowIndex + 2} / span ${rowSpan}`,
                    }}
                  >
                    <span>
                      {(isAllMode || role === 'cs' || lesson.teacherName) && (
                        <span className="mb-1 inline-flex items-center gap-1 rounded bg-indigo-100/90 px-1.5 py-0.5 text-[10px] font-black text-indigo-900 border border-indigo-200">
                          <span>👨‍🏫</span>
                          <span className="truncate">GV: {lesson.teacherName || 'Chưa rõ'}</span>
                        </span>
                      )}
                      <span className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-extrabold text-slate-900">
                          {lesson.enrollment?.student?.name} - {lesson.enrollment?.student?.code}
                        </span>
                        {noteBadge && <span title={noteBadge} className="shrink-0">📌</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-600">
                        {role !== 'sales' && lesson.enrollment?.courseName ? `${lesson.enrollment.courseName} • ` : ''}{lesson.dayLabel}
                      </span>
                      {/* Status indicator on card */}
                      <div className="mt-1 flex items-center gap-1 flex-wrap">
                        {lesson.lessonStatus === 'completed' && lesson.csStatus === 'completed' ? (
                          <span className="rounded bg-emerald-700 text-white font-black px-1.5 py-0.5 text-[9px] shadow-2xs">
                            🎉 Khớp lệnh (GV & CS)
                          </span>
                        ) : (
                          <>
                            <span className={cn(
                              'rounded px-1 py-0.5 text-[9px] font-bold border',
                              lesson.lessonStatus === 'completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            )}>
                              GV: {lesson.lessonStatus === 'completed' ? '✅' : '⏳'}
                            </span>
                            <span className={cn(
                              'rounded px-1 py-0.5 text-[9px] font-bold border',
                              lesson.csStatus === 'completed'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            )}>
                              CS: {lesson.csStatus === 'completed' ? '✅' : '⏳'}
                            </span>
                          </>
                        )}
                      </div>
                      {noteBadge && (
                        <div className="mt-1">
                          <TagBadges text={noteBadge} />
                        </div>
                      )}
                    </span>
                    {(showTeachingTimeRange || showRegistrationMeet) && (
                      <span className="mt-2 flex items-center justify-between gap-2">
                        {showTeachingTimeRange && (
                          <span className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                            <Clock3 className="size-3" /> {lesson.startTime} -&gt; {lesson.endTime}
                          </span>
                        )}
                        {showRegistrationMeet && (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white shadow">
                            <Video className="size-3" /> Google Meet
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                )
              }

              if (matchingLessons.length > 1) {
                return (
                  <div
                    key={`${day.isoDate}-${time}-multiple`}
                    className="z-10 flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-2xl border-2 border-indigo-300 bg-indigo-50/50 p-2 shadow-sm"
                    style={{
                      ...placement,
                      gridRow: `${rowIndex + 2} / span 1`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1 pb-1 border-b border-indigo-200/80">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-black text-white shadow-2xs">
                        🔥 {matchingLessons.length} ca song song
                      </span>
                      <span className="font-mono text-[10px] font-bold text-indigo-900">
                        {time}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {matchingLessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => onLessonClick(lesson)}
                          className={cn(
                            'flex flex-col rounded-xl border p-2 text-left text-[10px] transition hover:shadow-sm cursor-pointer',
                            lessonTone(lesson)
                          )}
                        >
                          <span className="font-black text-indigo-950 truncate flex items-center gap-1">
                            <span>👨‍🏫</span>
                            <span>{lesson.teacherName}</span>
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {lesson.enrollment?.student?.name} ({lesson.enrollment?.student?.code})
                          </span>
                          <span className="text-[9px] text-slate-600 truncate">
                            {lesson.enrollment?.courseName ? `${lesson.enrollment.courseName} • ` : ''}{lesson.dayLabel} ({lesson.startTime}-{lesson.endTime})
                          </span>
                          <div className="mt-0.5 flex items-center gap-1">
                            {lesson.lessonStatus === 'completed' && lesson.csStatus === 'completed' ? (
                              <span className="rounded bg-emerald-700 text-white font-black px-1 py-0.2 text-[8px]">
                                🎉 Khớp lệnh
                              </span>
                            ) : (
                              <>
                                <span className={cn('px-1 py-0.2 rounded text-[8px] font-bold border', lesson.lessonStatus === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200')}>
                                  GV: {lesson.lessonStatus === 'completed' ? '✅' : '⏳'}
                                </span>
                                <span className={cn('px-1 py-0.2 rounded text-[8px] font-bold border', lesson.csStatus === 'completed' ? 'bg-purple-50 text-purple-800 border-purple-300' : 'bg-slate-50 text-slate-500 border-slate-200')}>
                                  CS: {lesson.csStatus === 'completed' ? '✅' : '⏳'}
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }

              if (availability && availabilityMode !== 'hidden') {
                const span = isAllMode ? 1 : blocksForDuration(availability.durationMinutes)
                const isSalesBooking = !canManageAvailability && Boolean(onEmptySlotClick)

                if (isSalesBooking) {
                  const subSlots = Array.from({ length: span }, (_, i) => {
                    const subTime = addMinutes(availability.startTime, i * 20)
                    const subEndTime = addMinutes(subTime, 20)
                    return { subTime, subEndTime }
                  })

                  return (
                    <div
                      key={`${day.isoDate}-${time}`}
                      className="z-10 flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-emerald-600 bg-emerald-50/70 shadow-sm"
                      style={{
                        ...placement,
                        gridRow: `${rowIndex + 2} / span ${span}`,
                      }}
                    >
                      {subSlots.map(({ subTime, subEndTime }) => (
                        <button
                          key={subTime}
                          type="button"
                          onClick={() => onEmptySlotClick?.(day.isoDate, subTime, day.headerLabel)}
                          title={`Xếp lịch ${day.headerLabel} lúc ${subTime}`}
                          className="group flex flex-1 items-center justify-between px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 transition-colors hover:bg-emerald-100/90 border-b last:border-b-0 border-emerald-200"
                        >
                          <span className="font-mono text-[10px] text-emerald-900 font-semibold">
                            {subTime} - {subEndTime}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-emerald-700">
                              {locked ? 'Đã khóa' : 'Rảnh'}
                            </span>
                            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600/15 text-emerald-800 transition-all group-hover:bg-emerald-600 group-hover:text-white shadow-xs">
                              <Plus className="size-3.5" />
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                }

                if (isEditMode) {
                  const isSelectedForDelete = selectedDeleteIds?.has(availability.id) ?? false
                  return (
                    <button
                      key={`${day.isoDate}-${time}`}
                      type="button"
                      onClick={() => onToggleDeleteSlot?.(availability.id)}
                      title={`Click để ${isSelectedForDelete ? 'bỏ chọn' : 'chọn'} xóa ca ${day.name} lúc ${availability.startTime}`}
                      className={cn(
                        'z-10 flex min-w-0 items-center justify-between rounded-2xl border-2 px-2 text-[11px] font-bold shadow-sm transition-all cursor-pointer select-none',
                        isSelectedForDelete
                          ? 'border-rose-500 bg-rose-100/90 text-rose-950 ring-2 ring-rose-400 scale-[1.02]'
                          : 'border-rose-300 bg-rose-50/40 text-rose-800 hover:bg-rose-100/70'
                      )}
                      data-availability-id={availability.id}
                      style={{
                        ...placement,
                        gridRow: `${rowIndex + 2} / span ${span}`,
                      }}
                    >
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <span
                          className={cn(
                            'flex size-3.5 items-center justify-center rounded text-[9px] font-black border transition-all',
                            isSelectedForDelete
                              ? 'bg-rose-600 border-rose-700 text-white'
                              : 'bg-white border-rose-300 text-transparent'
                          )}
                        >
                          ✓
                        </span>
                        <span>{availability.startTime}</span>
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-black',
                          isSelectedForDelete ? 'text-rose-700' : 'text-slate-400'
                        )}
                      >
                        {isSelectedForDelete ? 'Sẽ xóa' : 'Chọn xóa'}
                      </span>
                    </button>
                  )
                }

                return (
                  <button
                    key={`${day.isoDate}-${time}`}
                    type="button"
                    disabled={!canManageAvailability}
                    draggable={canManageAvailability && role === 'teacher'}
                    onDragStart={(event) => {
                      if (!canManageAvailability || role !== 'teacher') return

                      setDraggingAvailabilityId(availability.id)
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({ availabilityId: availability.id })
                      )
                    }}
                    onDragEnd={() => setDraggingAvailabilityId(null)}
                    onClick={() => {
                      if (canManageAvailability) onAvailabilityClick(availability)
                    }}
                    className={cn(
                      'z-10 flex min-w-0 items-center justify-between rounded-2xl border-2 border-emerald-600 bg-emerald-50/50 px-2 text-[11px] font-bold text-emerald-800 shadow-sm transition-colors enabled:hover:bg-emerald-100 disabled:cursor-default',
                      canManageAvailability && role === 'teacher' && 'cursor-grab active:cursor-grabbing',
                      canManageAvailability && role === 'sales' && 'cursor-pointer hover:border-emerald-700 hover:bg-emerald-100/90 shadow-xs',
                      draggingAvailabilityId === availability.id && 'opacity-60'
                    )}
                    data-availability-id={availability.id}
                    style={{
                      ...placement,
                      gridRow: `${rowIndex + 2} / span ${span}`,
                    }}
                  >
                    <span className="font-mono text-[10px] text-slate-500">
                      {availability.startTime}
                    </span>
                    <span className="text-[9px] font-black text-emerald-700">
                      {locked ? 'Đã khóa' : 'Rảnh'}
                    </span>
                  </button>
                )
              }

              const slotKey = `${day.isoDate}|${time}`
              const isBatchMode = Boolean(onSlotToggle)
              const isPending = pendingSlots?.has(slotKey) ?? false
              const isClickable = isEditMode
                ? false
                : isBatchMode
                  ? canManageAvailability
                  : canManageAvailability || canRescheduleLessons || Boolean(onEmptySlotClick)

              return (
                <button
                  key={`${day.isoDate}-${time}`}
                  type="button"
                  disabled={!isClickable}
                  data-slot-date={day.isoDate}
                  data-slot-time={time}
                  onDragOver={(event) => {
                    if (!canRescheduleLessons && !canManageAvailability) return

                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(event) => {
                    if (!canRescheduleLessons && !canManageAvailability) return

                    event.preventDefault()
                    const rawPayload = event.dataTransfer.getData('application/json')
                    const dragPayload = safeParseDragPayload(rawPayload)
                    const lessonId = Number(dragPayload.lessonId)
                    const availabilityId = Number(dragPayload.availabilityId)

                    if (Number.isFinite(lessonId) && canRescheduleLessons) {
                      setDraggingLessonId(null)
                      rescheduleLesson(lessonId, day.isoDate, time)
                      return
                    }

                    if (Number.isFinite(availabilityId) && canManageAvailability) {
                      setDraggingAvailabilityId(null)
                      moveAvailability(availabilityId, day.isoDate, time)
                    }
                  }}
                  onClick={() => {
                    if (onEmptySlotClick && !canManageAvailability) {
                      onEmptySlotClick(day.isoDate, time, day.headerLabel)
                      return
                    }

                    if (!canManageAvailability) return

                    if (isBatchMode) {
                      onSlotToggle?.(day.isoDate, time)
                    } else {
                      setAvailabilityError(null)
                      router.post(
                        teacherAvailabilitiesPath(),
                        {
                          teacher_availability: {
                            teacher_id: teacherId,
                            available_on: day.isoDate,
                            start_time: time,
                            duration_minutes: defaultDuration,
                          },
                          ...redirectParams,
                        },
                        { onError: (errors) => setAvailabilityError(firstError(errors)) }
                      )
                    }
                  }}
                  aria-label={
                    canManageAvailability
                      ? `Mở ca ${day.headerLabel} lúc ${time}`
                      : onEmptySlotClick
                        ? `Xếp lịch ${day.headerLabel} lúc ${time}`
                        : undefined
                  }
                  aria-pressed={isBatchMode ? isPending : undefined}
                  className={cn(
                    'group flex min-h-[46px] min-w-0 cursor-pointer flex-col justify-center rounded-2xl border p-2.5 text-[11px] shadow-sm transition-all disabled:cursor-default',
                    isPending
                      ? 'border-teal-400 bg-teal-50 text-teal-700 ring-2 ring-teal-300'
                      : day.isoDate === todayIso
                        ? 'border-emerald-300/70 bg-emerald-50/25 text-slate-500 enabled:hover:bg-emerald-50/60 ring-1 ring-emerald-400/20'
                        : 'border-slate-200 bg-white text-slate-400 enabled:hover:bg-slate-50'
                  )}
                  style={placement}
                >
                  <span className="flex w-full items-center justify-between font-mono text-[10px]">
                    <span>{time} - {addMinutes(time, defaultDuration)}</span>
                    {isPending ? (
                      <span className="text-[11px] font-black text-teal-600">✓</span>
                    ) : canManageAvailability || onEmptySlotClick ? (
                      <Plus
                        data-icon
                        className="size-3.5 text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    ) : (
                      <span>Trống</span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

function slotIsCovered(
  date: string,
  time: string,
  lessons: LessonSession[],
  availabilities: TeacherAvailability[],
  isAllMode?: boolean
) {
  if (isAllMode) return false

  return [...lessons, ...availabilities].some((entry) => {
    if (
      (('scheduledOn' in entry && entry.scheduledOn) ||
        ('availableOn' in entry && entry.availableOn)) !== date
    ) {
      return false
    }

    return entry.startTime < time && entry.endTime > time
  })
}

function lessonTone(lesson: LessonSession) {
  const reminderPattern = /\[Hẹn đóng:(.+?)\]/i
  const match = lesson.enrollment.tuitionNote?.match(reminderPattern)
  
  if (match) {
    const reminderDays = (match[1]?.match(/\d+/g) || []).map(Number)
    const sessionDays = (lesson.dayLabel.split('/')[0]?.match(/\d+/g) || []).map(Number)
    const isDue = sessionDays.some((d) => reminderDays.includes(d))
    if (isDue) {
      return 'border-pink-500 bg-pink-100 text-slate-900 ring-2 ring-pink-500/50 shadow-md shadow-pink-200/50'
    }
  }

  // Khớp lệnh: Cả GV và CS đều hoàn thành
  if (lesson.lessonStatus === 'completed' && lesson.csStatus === 'completed') {
    return 'border-emerald-400 bg-emerald-50/70 text-slate-900 ring-1 ring-emerald-300'
  }

  // Một bên hoàn thành (GV hoặc CS): màu xanh dương nhạt
  if (lesson.lessonStatus === 'completed' || lesson.csStatus === 'completed') {
    return 'border-blue-300 bg-blue-50/70 text-slate-900'
  }

  return 'border-amber-400 bg-amber-50 text-slate-900'
}

function firstError(errors: Record<string, string[]>) {
  return (
    Object.values(errors)
      .flat()
      .find((message) => message.length > 0) ?? 'Không thể cập nhật ca rảnh.'
  )
}

function safeParseDragPayload(payload: string): {
  availabilityId?: string | number
  lessonId?: string | number
} {
  try {
    const parsed: unknown = JSON.parse(payload)

    if (
      parsed &&
      typeof parsed === 'object' &&
      ('lessonId' in parsed || 'availabilityId' in parsed)
    ) {
      return parsed as { availabilityId?: string | number; lessonId?: string | number }
    }
  } catch {
    return {}
  }

  return {}
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}
