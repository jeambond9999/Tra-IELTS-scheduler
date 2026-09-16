import { router } from '@inertiajs/react'
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import type { Person, SchedulerMutationRedirectParams, SchedulerProps } from '../types'

type StudentRecord = SchedulerProps['studentTracking'][number]

type Props = {
  open: boolean
  student: StudentRecord | null
  teachers: Person[]
  redirectParams?: SchedulerMutationRedirectParams
  onClose: () => void
}

const WEEKDAYS = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ Nhật',
]

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
]

export function ResumeReservationDialog({
  open,
  student,
  teachers,
  redirectParams,
  onClose,
}: Props) {
  const todayStr = new Date().toISOString().split('T')[0]

  const [resumeDate, setResumeDate] = useState(
    student?.resumeDate ? student.resumeDate.split('T')[0] : todayStr
  )
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(
    teachers[0]?.id || 0
  )
  const [frequency, setFrequency] = useState<1 | 2>(2)
  const [slot1Day, setSlot1Day] = useState('Thứ 2')
  const [slot1Time, setSlot1Time] = useState('19:00')
  const [slot2Day, setSlot2Day] = useState('Thứ 5')
  const [slot2Time, setSlot2Time] = useState('19:00')
  const [loading, setLoading] = useState(false)

  const remainingSessionsCount = student?.remaining || 0
  const completedCount = student?.completed || 0
  const totalCount = student?.total || 0

  // Preview generated dates from resumeDate
  const previewDates = useMemo(() => {
    if (!resumeDate || remainingSessionsCount <= 0) return []

    const dayNameToIndex: Record<string, number> = {
      'Chủ Nhật': 0,
      'Thứ 2': 1,
      'Thứ 3': 2,
      'Thứ 4': 3,
      'Thứ 5': 4,
      'Thứ 6': 5,
      'Thứ 7': 6,
    }

    const patterns =
      frequency === 1
        ? [{ day: slot1Day, time: slot1Time }]
        : [
            { day: slot1Day, time: slot1Time },
            { day: slot2Day, time: slot2Time },
          ]

    const patternDays = patterns.map((p) => ({
      targetWday: dayNameToIndex[p.day] ?? 1,
      dayName: p.day,
      time: p.time,
    }))

    const results: Array<{
      dateStr: string
      dayLabel: string
      dayOfWeek: string
      time: string
    }> = []

    let cur = new Date(resumeDate)
    let added = 0
    let safety = 0

    while (added < remainingSessionsCount && safety < 300) {
      safety++
      const curWday = cur.getDay()
      const match = patternDays.find((p) => p.targetWday === curWday)

      if (match) {
        const dayNumber = completedCount + added + 1
        const yyyy = cur.getFullYear()
        const mm = String(cur.getMonth() + 1).padStart(2, '0')
        const dd = String(cur.getDate()).padStart(2, '0')
        const dateStr = `${dd}/${mm}/${yyyy}`

        results.push({
          dateStr,
          dayLabel: `Day ${dayNumber}/${totalCount}`,
          dayOfWeek: match.dayName,
          time: match.time,
        })
        added++
      }

      cur.setDate(cur.getDate() + 1)
    }

    return results
  }, [
    resumeDate,
    remainingSessionsCount,
    completedCount,
    totalCount,
    frequency,
    slot1Day,
    slot1Time,
    slot2Day,
    slot2Time,
  ])

  if (!student || !student.enrollmentId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resumeDate) {
      toast.error('Vui lòng chọn ngày bắt đầu học lại.')
      return
    }

    const schedulePatterns =
      frequency === 1
        ? [{ day: slot1Day, time: slot1Time }]
        : [
            { day: slot1Day, time: slot1Time },
            { day: slot2Day, time: slot2Time },
          ]

    setLoading(true)
    router.post(
      `/enrollments/${student.enrollmentId}/resume`,
      {
        reschedule: {
          start_date: resumeDate,
          resume_date: resumeDate,
          frequency_per_week: frequency,
          teacher_id: selectedTeacherId || undefined,
          schedule_patterns: schedulePatterns,
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(
            `🚀 Đã kích hoạt học lại và xếp lịch cho học viên ${student.studentName} thành công!`
          )
          onClose()
        },
        onError: (errs) => {
          toast.error(Object.values(errs)[0] || 'Lỗi khi kích hoạt học lại.')
        },
        onFinish: () => setLoading(false),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border-slate-200">
        <DialogHeader className="flex flex-col gap-1 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <Play className="size-5 fill-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Kích Hoạt Học Lại & Xếp Lịch Mới
              </DialogTitle>
              <p className="text-xs text-slate-500 font-medium">
                Tiếp tục lộ trình học từ Day {completedCount + 1} theo lịch mới
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {/* Reservation Summary Card */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-extrabold text-slate-900 block">
                  {student.studentName}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-bold">
                  {student.studentCode} • {student.course}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold bg-white text-emerald-800 border-emerald-200">
                Đã học: {completedCount}/{totalCount} buổi
              </Badge>
            </div>

            {student.preReservationSchedule && (
              <div className="text-[11px] font-semibold text-slate-700 bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                📌 <strong>Lịch sử:</strong> {student.preReservationSchedule}
              </div>
            )}

            {student.reservationNote && (
              <div className="text-[10px] text-slate-500 italic">
                💬 Ghi chú bảo lưu: "{student.reservationNote}"
              </div>
            )}
          </div>

          {/* New Schedule Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
            <h4 className="font-black text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="size-4 text-emerald-700" />
              Thiết Lập Lịch Học Mới Sau Bảo Lưu
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Resume Start Date */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold text-slate-700">
                  Ngày bắt đầu học lại: <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  required
                  value={resumeDate}
                  onChange={(e) => setResumeDate(e.target.value)}
                  className="h-9 rounded-xl text-xs bg-slate-50 font-bold border-slate-200"
                />
              </div>

              {/* Teacher Selection */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold text-slate-700">
                  Giảng viên phụ trách:
                </Label>
                <Select
                  value={String(selectedTeacherId)}
                  onValueChange={(v) => setSelectedTeacherId(Number(v))}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-slate-50 font-bold border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Frequency Selection */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold text-slate-700">
                Tần suất học trong tuần:
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency(1)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-black transition-all border shadow-2xs',
                    frequency === 1
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  1 buổi / tuần
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency(2)}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-xs font-black transition-all border shadow-2xs',
                    frequency === 2
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  )}
                >
                  2 buổi / tuần
                </button>
              </div>
            </div>

            {/* Weekly Slots Selection */}
            <div className="space-y-2">
              {/* Slot 1 */}
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 font-extrabold text-[11px] text-slate-600">
                  Buổi 1:
                </span>
                <Select value={slot1Day} onValueChange={setSlot1Day}>
                  <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 font-bold flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={slot1Time} onValueChange={setSlot1Time}>
                  <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 font-bold w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Slot 2 if frequency === 2 */}
              {frequency === 2 && (
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-extrabold text-[11px] text-slate-600">
                    Buổi 2:
                  </span>
                  <Select value={slot2Day} onValueChange={setSlot2Day}>
                    <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 font-bold flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={slot2Time} onValueChange={setSlot2Time}>
                    <SelectTrigger className="h-8 rounded-xl text-xs bg-slate-50 font-bold w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Live Schedule Preview */}
          {previewDates.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-emerald-700" />
                  Lịch học tự động tạo ({previewDates.length} buổi tiếp theo):
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Day {completedCount + 1} ➔ Day {totalCount}
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {previewDates.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="font-bold text-emerald-800 w-24">
                      {p.dayLabel}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {p.dayOfWeek}, {p.dateStr}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50">
                      {p.time}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold"
            >
              Đóng
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="rounded-xl bg-emerald-700 text-xs font-black text-white hover:bg-emerald-800 shadow-md"
            >
              {loading ? 'Đang xếp lịch...' : '🚀 Kích Hoạt & Xếp Lịch Ngay'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
