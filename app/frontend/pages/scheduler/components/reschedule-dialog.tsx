import { router } from '@inertiajs/react'
import { Calendar, CalendarClock, Clock, FastForward, Info, Layers } from 'lucide-react'
import { type ReactElement, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { rescheduleLessonSessionPath } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type { Enrollment, LessonSession, SchedulerMutationRedirectParams } from '../types'

export function RescheduleDialog({
  lesson,
  open,
  onOpenChange,
  timeIntervals,
  redirectParams,
  role,
  onEditEnrollment,
}: {
  lesson: LessonSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  timeIntervals: string[]
  redirectParams: SchedulerMutationRedirectParams
  role?: string
  onEditEnrollment?: (enrollment: Enrollment) => void
}): ReactElement {
  const [scheduledOn, setScheduledOn] = useState('')
  const [startTime, setStartTime] = useState('')
  const [shiftMode, setShiftMode] = useState<'single' | 'all'>('single')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (lesson) {
      setScheduledOn(lesson.scheduledOn)
      setStartTime(lesson.startTime)
      setShiftMode('single')
      setErrorMessage(null)
      setIsSubmitting(false)
    }
  }, [lesson])

  if (!lesson) {
    return <Dialog open={open} onOpenChange={onOpenChange} />
  }

  // Calculate day difference
  let deltaDays = 0
  if (scheduledOn && lesson.scheduledOn) {
    const oldD = new Date(lesson.scheduledOn)
    const newD = new Date(scheduledOn)
    deltaDays = Math.round((newD.getTime() - oldD.getTime()) / (1000 * 60 * 60 * 24))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    router.patch(
      rescheduleLessonSessionPath(lesson.id),
      {
        lesson_session: {
          scheduled_on: scheduledOn,
          start_time: startTime,
        },
        shift_subsequent: shiftMode === 'all',
        ...redirectParams,
      },
      {
        onSuccess: () => {
          setIsSubmitting(false)
          onOpenChange(false)
        },
        onError: (errors) => {
          setIsSubmitting(false)
          setErrorMessage(firstError(errors))
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <CalendarClock className="size-5 text-emerald-200" />
                <span>Dời Lịch Học</span>
              </DialogTitle>
              <p className="text-xs text-emerald-100 font-semibold mt-1">
                {lesson.enrollment.student.name} ({lesson.enrollment.student.code}) • {lesson.enrollment.courseName}
              </p>
            </div>

            {(role === 'sales' || role === 'cs' || role === 'admin') && onEditEnrollment && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-bold border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
                onClick={() => {
                  onOpenChange(false)
                  onEditEnrollment(lesson.enrollment)
                }}
              >
                Sửa Khóa Học
              </Button>
            )}
          </div>

          {/* Current schedule banner */}
          <div className="mt-3.5 flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2 text-xs backdrop-blur-xs">
            <span className="text-emerald-100">Lịch hiện tại:</span>
            <span className="font-bold text-white flex items-center gap-2">
              <span className="bg-emerald-500/40 px-2 py-0.5 rounded-md text-[11px] font-extrabold">{lesson.dayLabel}</span>
              <span>{lesson.scheduledOn}</span>
              <span className="font-mono text-emerald-200">({lesson.startTime} - {lesson.endTime})</span>
            </span>
          </div>
        </div>

        {/* Body */}
        <form className="p-5 space-y-4 text-xs" onSubmit={handleSubmit}>
          {errorMessage && (
            <p
              role="alert"
              className="border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 rounded-xl"
            >
              {errorMessage}
            </p>
          )}

          {/* Date & Time selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-emerald-700" /> Chọn Ngày Mới *
              </span>
              <Input
                aria-label="Chọn Ngày Mới"
                type="date"
                value={scheduledOn}
                onChange={(event) => setScheduledOn(event.target.value)}
                required
                className="h-9 bg-slate-50 font-semibold focus:bg-white"
              />
            </div>

            <div className="grid gap-1 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5 text-emerald-700" /> Giờ Bắt Đầu Mới *
              </span>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger aria-label="Chọn Giờ Bắt Đầu Mới" className="h-9 bg-slate-50 font-bold focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeIntervals.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scope Selector: Single session vs All subsequent sessions */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
              Tùy Chọn Phạm Vi Dời Lịch:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Single Session */}
              <button
                type="button"
                onClick={() => setShiftMode('single')}
                className={cn(
                  'flex flex-col text-left p-3 rounded-2xl border-2 transition-all',
                  shiftMode === 'single'
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className={cn('size-2 rounded-full', shiftMode === 'single' ? 'bg-emerald-600' : 'bg-slate-400')} />
                    Chỉ dời 1 buổi này
                  </span>
                  {shiftMode === 'single' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                      Đã chọn
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Chỉ thay đổi ngày/giờ cho <strong>{lesson.dayLabel}</strong>. Tất cả các buổi học khác giữ nguyên.
                </p>
              </button>

              {/* Option 2: Shift All Subsequent Sessions */}
              <button
                type="button"
                onClick={() => setShiftMode('all')}
                className={cn(
                  'flex flex-col text-left p-3 rounded-2xl border-2 transition-all',
                  shiftMode === 'all'
                    ? 'border-teal-600 bg-teal-50/60 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className={cn('size-2 rounded-full', shiftMode === 'all' ? 'bg-teal-600' : 'bg-slate-400')} />
                    Dời toàn bộ các buổi sau
                  </span>
                  {shiftMode === 'all' && (
                    <span className="text-[10px] font-black text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">
                      Đã chọn
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Tự động <strong>tịnh tiến theo số ngày chênh lệch</strong> cho toàn bộ các buổi học tiếp theo của khóa.
                </p>
              </button>
            </div>
          </div>

          {/* Delta calculation preview card */}
          {shiftMode === 'all' && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-3 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-teal-900">
                <FastForward className="size-4 text-teal-700" />
                <span>Xem trước kết quả dời lịch:</span>
              </div>
              <p className="text-[11px] text-teal-800">
                {deltaDays > 0 ? (
                  <>
                    👉 Chênh lệch: <strong className="text-teal-950">+{deltaDays} ngày</strong> (từ {lesson.scheduledOn} ➔ {scheduledOn}).
                    <br />
                    Tất cả các buổi học sau {lesson.scheduledOn} sẽ được <strong className="text-teal-950">đẩy lùi +{deltaDays} ngày</strong> tương ứng.
                  </>
                ) : deltaDays < 0 ? (
                  <>
                    👉 Chênh lệch: <strong className="text-teal-950">{deltaDays} ngày</strong> (từ {lesson.scheduledOn} ➔ {scheduledOn}).
                    <br />
                    Tất cả các buổi học sau {lesson.scheduledOn} sẽ được <strong className="text-teal-950">đẩy sớm {Math.abs(deltaDays)} ngày</strong> tương ứng.
                  </>
                ) : (
                  <>
                    👉 Ngày học không đổi ({scheduledOn}). Chỉ cập nhật giờ bắt đầu thành <strong className="text-teal-950">{startTime}</strong>.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-bold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
            >
              <CalendarClock data-icon />
              {isSubmitting
                ? 'Đang xử lý...'
                : shiftMode === 'all'
                  ? `Xác Nhận Dời Buổi Này & Các Buổi Sau`
                  : 'Xác Nhận Dời 1 Buổi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function firstError(errors: Record<string, string[]>) {
  return (
    Object.values(errors)
      .flat()
      .find((message) => message.length > 0) ?? 'Không thể dời lịch học.'
  )
}

