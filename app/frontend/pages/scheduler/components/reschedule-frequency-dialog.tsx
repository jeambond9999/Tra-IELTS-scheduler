import { router } from '@inertiajs/react'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Person, StudentSessionItem, StudentTracking } from '../types'

const WEEK_DAYS = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật',
]

const DAY_INDEX: Record<string, number> = {
  'Thứ 2': 1,
  'Thứ 3': 2,
  'Thứ 4': 3,
  'Thứ 5': 4,
  'Thứ 6': 5,
  'Thứ 7': 6,
  'Chủ Nhật': 0,
}

const isSessionCompleted = (s: StudentSessionItem) =>
  s.csStatus === 'completed' || s.lessonStatus === 'completed'

const getDayNumbersFromSession = (s: StudentSessionItem): number[] => {
  const label = s.dayLabel || ''
  const dayPart = label.split('/')[0] || ''
  const nums = dayPart.match(/\d+/g)?.map(Number) || []
  return nums
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentTracking
  teachers: Person[]
  timeIntervals: string[]
  redirectParams?: Record<string, string | number | undefined>
}

export function RescheduleFrequencyDialog({
  open,
  onOpenChange,
  student,
  teachers,
  timeIntervals,
  redirectParams,
}: Props): ReactElement {
  const sessions = student.sessions || []
  const totalDays = useMemo(() => {
    return Math.max(student.total || 0, sessions.length || 0, 1)
  }, [student.total, sessions.length])

  // Find first uncompleted Day number (1 to totalDays)
  const defaultFromDayNumber = useMemo(() => {
    for (let d = 1; d <= totalDays; d++) {
      const targetSession =
        sessions.find((s) => getDayNumbersFromSession(s).includes(d)) ||
        sessions[d - 1]
      if (!targetSession || !isSessionCompleted(targetSession)) {
        return d
      }
    }
    return totalDays
  }, [sessions, totalDays])

  const [fromDayNumber, setFromDayNumber] = useState<number>(() => defaultFromDayNumber)
  const [frequency, setFrequency] = useState<number>(2)

  const initialTargetSession = useMemo(() => {
    return (
      sessions.find((s) => getDayNumbersFromSession(s).includes(defaultFromDayNumber)) ||
      sessions[defaultFromDayNumber - 1] ||
      sessions[0]
    )
  }, [sessions, defaultFromDayNumber])

  const [teacherId, setTeacherId] = useState<string>(() =>
    initialTargetSession?.teacherId ? String(initialTargetSession.teacherId) : ''
  )
  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    return initialTargetSession?.durationMinutes || 40
  })
  const [doubleSession, setDoubleSession] = useState<boolean>(() => {
    return (
      (initialTargetSession?.durationMinutes || 40) >= 50 ||
      Boolean(initialTargetSession?.dayLabel?.includes('&'))
    )
  })

  const [startDate, setStartDate] = useState<string>(() => {
    return initialTargetSession?.scheduledOn || new Date().toISOString().slice(0, 10)
  })

  const [patterns, setPatterns] = useState<Array<{ day: string; time: string }>>([
    { day: 'Thứ 4', time: initialTargetSession?.startTime || '18:20' },
    { day: 'Thứ 6', time: initialTargetSession?.startTime || '18:20' },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Sync state whenever dialog opens or student changes
  useEffect(() => {
    if (open) {
      setFromDayNumber(defaultFromDayNumber)
      const targetSession =
        sessions.find((s) => getDayNumbersFromSession(s).includes(defaultFromDayNumber)) ||
        sessions[defaultFromDayNumber - 1] ||
        sessions[0]

      const teacherToUse = targetSession?.teacherId
        ? String(targetSession.teacherId)
        : (sessions[0]?.teacherId ? String(sessions[0].teacherId) : '')
      setTeacherId(teacherToUse)

      const durationToUse = targetSession?.durationMinutes || sessions[0]?.durationMinutes || 40
      setDurationMinutes(durationToUse)
      setDoubleSession(
        durationToUse >= 50 ||
        Boolean(targetSession?.dayLabel?.includes('&'))
      )

      const startDateToUse =
        targetSession?.scheduledOn || new Date().toISOString().slice(0, 10)
      setStartDate(startDateToUse)

      const baseTime = targetSession?.startTime || sessions[0]?.startTime || '18:20'
      setPatterns([
        { day: 'Thứ 4', time: baseTime },
        { day: 'Thứ 6', time: baseTime },
      ])
    }
  }, [open, student.enrollmentId, defaultFromDayNumber])

  // Handle frequency change
  const handleFrequencyChange = (newFreq: number) => {
    setFrequency(newFreq)
    const baseTime = patterns[0]?.time || '18:20'
    if (newFreq === 1) {
      setPatterns([{ day: patterns[0]?.day || 'Thứ 6', time: baseTime }])
    } else if (newFreq === 2) {
      setPatterns([
        { day: patterns[0]?.day || 'Thứ 4', time: baseTime },
        { day: patterns[1]?.day || 'Thứ 6', time: baseTime },
      ])
    } else if (newFreq === 3) {
      setPatterns([
        { day: 'Thứ 2', time: baseTime },
        { day: 'Thứ 4', time: baseTime },
        { day: 'Thứ 6', time: baseTime },
      ])
    }
  }

  // Handle changing the starting day number from dropdown
  const handleFromDayChange = (newDayNum: number) => {
    setFromDayNumber(newDayNum)
    const targetSession =
      sessions.find((s) => getDayNumbersFromSession(s).includes(newDayNum)) ||
      sessions[newDayNum - 1]

    if (targetSession?.scheduledOn) {
      setStartDate(targetSession.scheduledOn)
    }
    if (targetSession?.teacherId) {
      setTeacherId(String(targetSession.teacherId))
    }
    if (targetSession?.startTime) {
      setPatterns((prev) =>
        prev.map((p) => ({ ...p, time: targetSession.startTime }))
      )
    }
    if (targetSession?.durationMinutes) {
      setDurationMinutes(targetSession.durationMinutes)
      setDoubleSession(
        targetSession.durationMinutes >= 50 ||
        Boolean(targetSession.dayLabel?.includes('&'))
      )
    }
  }

  // Calculate kept days and remaining days to schedule
  const keptDaysCount = useMemo(() => {
    return Math.max(0, fromDayNumber - 1)
  }, [fromDayNumber])

  const remainingDaysToSchedule = useMemo(() => {
    return Math.max(0, totalDays - keptDaysCount)
  }, [totalDays, keptDaysCount])

  // Live simulation of new schedule
  const previewSessions = useMemo(() => {
    if (!startDate || patterns.length === 0 || remainingDaysToSchedule <= 0) {
      return []
    }

    try {
      const result: Array<{
        date: string
        dayName: string
        time: string
        dayLabel: string
      }> = []

      const [sYear, sMonth, sDay] = startDate.split('-').map(Number)
      if (!sYear || !sMonth || !sDay) return []
      const cursor = new Date(sYear, sMonth - 1, sDay, 12, 0, 0)
      if (Number.isNaN(cursor.getTime())) return []

      let currentDay = fromDayNumber
      const total = totalDays
      const step = doubleSession || durationMinutes >= 80 ? 2 : 1

      const patternsByWday: Record<number, Array<{ day: string; time: string }>> = {}
      for (const p of patterns) {
        const wday = DAY_INDEX[p.day]
        if (wday !== undefined) {
          if (!patternsByWday[wday]) patternsByWday[wday] = []
          patternsByWday[wday].push(p)
        }
      }

      for (const wday in patternsByWday) {
        patternsByWday[wday].sort((a, b) => a.time.localeCompare(b.time))
      }

      const firstTime = patterns[0]?.time

      for (let dayOffset = 0; dayOffset < 180 && currentDay <= total; dayOffset++) {
        const checkDate = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dayOffset, 12, 0, 0)
        const wday = checkDate.getDay()
        let matching = patternsByWday[wday] || []

        if (dayOffset === 0 && firstTime) {
          matching = matching.filter((p) => p.time >= firstTime)
        }

        for (const pattern of matching) {
          if (currentDay > total) break
          const dayStart = currentDay
          const dayEnd = Math.min(currentDay + step - 1, total)
          const dayLabel =
            dayStart === dayEnd
              ? `Day ${dayStart}/${total}`
              : `Day ${dayStart} & ${dayEnd}/${total}`

          const yyyy = checkDate.getFullYear()
          const mm = String(checkDate.getMonth() + 1).padStart(2, '0')
          const dd = String(checkDate.getDate()).padStart(2, '0')

          result.push({
            date: `${dd}/${mm}/${yyyy}`,
            dayName: pattern.day,
            time: pattern.time,
            dayLabel,
          })

          currentDay = dayEnd + 1
        }
      }

      return result
    } catch {
      return []
    }
  }, [
    startDate,
    patterns,
    remainingDaysToSchedule,
    fromDayNumber,
    totalDays,
    doubleSession,
    durationMinutes,
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (patterns.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 khung giờ trong tuần.')
      return
    }

    if (!startDate) {
      setErrorMessage('Vui lòng chọn ngày bắt đầu áp dụng.')
      return
    }

    setIsSubmitting(true)

    router.post(
      `/enrollments/${student.enrollmentId}/reschedule_remaining`,
      {
        reschedule: {
          from_day_number: fromDayNumber,
          start_day_number: fromDayNumber,
          start_date: startDate,
          frequency_per_week: frequency,
          duration_minutes: durationMinutes,
          teacher_id: teacherId,
          double_session: doubleSession,
          schedule_patterns: patterns,
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSubmitting(false)
          onOpenChange(false)
        },
        onError: (errors) => {
          setIsSubmitting(false)
          setErrorMessage(Object.values(errors).join(', '))
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-md">
              <Zap className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900">
                Đổi Tần Suất & Xếp Lại Lịch Học
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500">
                Chuyển đổi tần suất học (ví dụ 1 buổi ➔ 2 buổi/tuần) cho các buổi còn lại
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Student & Course Summary Card */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-black text-slate-900 text-base">
                <span>{student.studentName}</span>
                <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  {student.studentCode}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600 mt-0.5 flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-emerald-600" /> Khóa: {student.course}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="rounded-xl bg-white/90 border border-slate-200 px-2.5 py-1 text-slate-700 shadow-2xs">
                Tổng: <strong>{totalDays} buổi</strong>
              </span>
              <span className="rounded-xl bg-emerald-100 text-emerald-800 px-2.5 py-1">
                Đã học / Giữ lại: <strong>{keptDaysCount} buổi</strong>
              </span>
              <span className="rounded-xl bg-amber-100 text-amber-800 px-2.5 py-1 font-black">
                Xếp lại: <strong>{remainingDaysToSchedule} buổi</strong>
              </span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-600 bg-white/80 rounded-xl p-2.5 border border-slate-200/80 flex items-start gap-2">
            <Sparkles className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>Cơ chế tự động:</strong>{' '}
              {keptDaysCount > 0 ? (
                <>
                  Các buổi trước đó (
                  <strong>
                    {keptDaysCount === 1 ? 'Day 1' : `Day 1 ➔ Day ${keptDaysCount}`}
                  </strong>
                  ) được giữ nguyên 100%. Toàn bộ{' '}
                  <strong>
                    {remainingDaysToSchedule} buổi còn lại (từ Day {fromDayNumber} ➔ Day{' '}
                    {totalDays})
                  </strong>{' '}
                  sẽ được tự động xếp lại theo tần suất mới.
                </>
              ) : (
                <>
                  Toàn bộ{' '}
                  <strong>
                    {remainingDaysToSchedule} buổi (Day 1 ➔ Day {totalDays})
                  </strong>{' '}
                  sẽ được xếp lại theo tần suất mới.
                </>
              )}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
          {/* Step 1: Start From Day Number */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-slate-500" />
                1. Bắt đầu áp dụng lịch mới từ Day mấy:
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                Xếp tiếp {remainingDaysToSchedule} buổi (Day {fromDayNumber} ➔ {totalDays})
              </span>
            </Label>
            <Select
              value={String(fromDayNumber)}
              onValueChange={(val) => handleFromDayChange(Number(val))}
            >
              <SelectTrigger className="h-10 rounded-2xl border-slate-200 font-bold text-xs bg-slate-50/50">
                <SelectValue placeholder="Chọn Day bắt đầu đổi lịch" />
              </SelectTrigger>
              <SelectContent className="max-h-64 rounded-2xl text-xs">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map((dayNum) => {
                  const targetSession =
                    sessions.find((s) => getDayNumbersFromSession(s).includes(dayNum)) ||
                    sessions[dayNum - 1]
                  const isDone = targetSession ? isSessionCompleted(targetSession) : false

                  return (
                    <SelectItem
                      key={dayNum}
                      value={String(dayNum)}
                      className="font-semibold text-xs py-2"
                    >
                      <span className="font-bold text-emerald-800">
                        Day {dayNum}/{totalDays}
                      </span>
                      {targetSession ? (
                        <>
                          {' — '}
                          <span>{targetSession.scheduledOn} ({targetSession.startTime})</span>
                          {isDone ? (
                            <span className="text-[10px] ml-2 text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                              ✓ Đã học
                            </span>
                          ) : (
                            <span className="text-[10px] ml-2 text-slate-500 font-medium">
                              (Chưa học)
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] ml-2 text-slate-500 font-medium">
                          — Bắt đầu xếp từ Day {dayNum}
                        </span>
                      )}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: New Frequency */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500" />
              2. Chọn tần suất học mới:
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { freq: 1, label: '1 buổi / tuần' },
                { freq: 2, label: '2 buổi / tuần (Khuyên dùng)' },
                { freq: 3, label: '3 buổi / tuần' },
              ].map(({ freq, label }) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => handleFrequencyChange(freq)}
                  className={cn(
                    'h-10 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center text-center p-2',
                    frequency === freq
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-black'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Pick Weekday Patterns */}
          <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 border border-slate-200 p-3.5">
            <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-emerald-600" />
                3. Chọn các khung giờ cố định trong tuần ({patterns.length} buổi):
              </span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {patterns.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="size-6 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs">
                    #{idx + 1}
                  </span>

                  <div className="flex-1">
                    <Select
                      value={p.day}
                      onValueChange={(val) => {
                        const next = [...patterns]
                        next[idx] = { ...next[idx], day: val }
                        setPatterns(next)
                      }}
                    >
                      <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl text-xs">
                        {WEEK_DAYS.map((d) => (
                          <SelectItem key={d} value={d} className="text-xs font-semibold">
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24">
                    <Select
                      value={p.time}
                      onValueChange={(val) => {
                        const next = [...patterns]
                        next[idx] = { ...next[idx], time: val }
                        setPatterns(next)
                      }}
                    >
                      <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-52 rounded-xl text-xs">
                        {timeIntervals.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs font-semibold">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4: Start Date & Teacher & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-700">
                📅 Ngày bắt đầu áp dụng:
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 rounded-xl border-slate-200 font-bold text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-700">
                ⏱️ Thời lượng mỗi ca:
              </Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(v) => {
                  const val = Number(v)
                  setDurationMinutes(val)
                  setDoubleSession(val >= 80)
                }}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="40">40 phút (1 Day)</SelectItem>
                  <SelectItem value="50">50 phút (1 Day)</SelectItem>
                  <SelectItem value="60">60 phút (1 Day)</SelectItem>
                  <SelectItem value="80">80 phút (Dạy kép 2 Day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-700">
                👨‍🏫 Giáo viên phụ trách:
              </Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 font-bold text-xs">
                  <SelectValue placeholder="Chọn giáo viên" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="text-xs font-semibold">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Step 5: Live Preview of Rescheduled Sessions */}
          <div className="flex flex-col gap-2 rounded-2xl bg-emerald-950/5 border border-emerald-200/80 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                <CalendarDays className="size-4 text-emerald-600" />
                Dự kiến danh sách {previewSessions.length} buổi học mới:
              </span>
              <span className="text-[11px] font-bold text-emerald-700">
                {frequency} buổi / tuần
              </span>
            </div>

            {previewSessions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Chưa đủ thông tin để tạo lịch xem trước.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                {previewSessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-white border border-emerald-100 p-2 text-xs font-semibold shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                        {s.dayLabel}
                      </span>
                      <span className="text-slate-700 font-bold">{s.dayName} ({s.date})</span>
                    </div>
                    <span className="font-mono text-emerald-700 font-extrabold text-[11px]">
                      {s.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-2xl text-xs font-bold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || previewSessions.length === 0}
              className="h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 shadow-sm"
            >
              {isSubmitting ? (
                'Đang xếp lại lịch...'
              ) : (
                <>
                  <Zap className="size-3.5 mr-1.5" /> Xác Nhận Xếp Lại {remainingDaysToSchedule} Buổi (Từ Day {fromDayNumber} ➔ Day {totalDays})
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
