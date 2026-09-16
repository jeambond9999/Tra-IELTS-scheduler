import { router } from '@inertiajs/react'
import {
  AlertTriangle,
  Calendar,
  Clock,
  HelpCircle,
  PauseCircle,
  Sparkles,
  User,
  X,
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { SchedulerMutationRedirectParams, SchedulerProps } from '../types'

type StudentRecord = SchedulerProps['studentTracking'][number]

type Props = {
  open: boolean
  student: StudentRecord | null
  teacherName?: string
  redirectParams?: SchedulerMutationRedirectParams
  onClose: () => void
}

export function ReservationDialog({
  open,
  student,
  teacherName,
  redirectParams,
  onClose,
}: Props) {
  const todayStr = new Date().toISOString().split('T')[0]
  
  // Default resume date to ~30 days from today
  const defaultResumeStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  }, [])

  const [reservedFrom, setReservedFrom] = useState(todayStr)
  const [resumeDate, setResumeDate] = useState(defaultResumeStr)
  const [reservationNote, setReservationNote] = useState('')
  const [loading, setLoading] = useState(false)

  // Calculate days difference
  const { diffDays, isOverdue } = useMemo(() => {
    if (!reservedFrom || !resumeDate) return { diffDays: 0, isOverdue: false }
    const from = new Date(reservedFrom)
    const to = new Date(resumeDate)
    const diffTime = to.getTime() - from.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return {
      diffDays,
      isOverdue: diffDays > 60,
    }
  }, [reservedFrom, resumeDate])

  if (!student || !student.enrollmentId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reservedFrom) {
      toast.error('Vui lòng chọn ngày bắt đầu bảo lưu.')
      return
    }

    if (resumeDate && diffDays < 1) {
      toast.error('Ngày học lại phải sau ngày bắt đầu bảo lưu.')
      return
    }

    setLoading(true)
    router.post(
      `/enrollments/${student.enrollmentId}/reserve`,
      {
        reservation: {
          reserved_from: reservedFrom,
          resume_date: resumeDate || null,
          reservation_note: reservationNote,
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(`Đã bảo lưu khóa học cho học viên ${student.studentName}`)
          onClose()
        },
        onError: (errs) => {
          toast.error(Object.values(errs)[0] || 'Lỗi khi bảo lưu khóa học.')
        },
        onFinish: () => setLoading(false),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-6 shadow-2xl border-slate-200">
        <DialogHeader className="flex flex-col gap-1 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <PauseCircle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Bảo Lưu Khóa Học
              </DialogTitle>
              <p className="text-xs text-slate-500 font-medium">
                Tạm dừng lộ trình học & lưu vết để xếp lịch lại sau
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {/* Student Info Card */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-extrabold text-slate-900 block">
                  {student.studentName}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-bold">
                  {student.studentCode} • {student.course}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-bold bg-white text-slate-700 border-amber-200">
                👨‍🏫 {teacherName || 'Giảng viên'}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 bg-white/80 rounded-xl p-2 border border-amber-100">
              <span>Đã hoàn thành: <strong>{student.completed}/{student.total} buổi</strong></span>
              <span className="text-slate-600">Còn lại: <strong>{student.remaining} buổi</strong></span>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              ℹ️ Các buổi chưa học từ ngày bắt đầu bảo lưu sẽ được gỡ khỏi lịch dạy của GV để giải phóng ca trống.
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold text-slate-700">
                Ngày bắt đầu bảo lưu: <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                required
                value={reservedFrom}
                onChange={(e) => setReservedFrom(e.target.value)}
                className="h-9 rounded-xl text-xs bg-slate-50 font-bold border-slate-200"
              />
            </div>

            {/* Expected Resume Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold text-slate-700">
                Ngày dự kiến học lại:
              </Label>
              <Input
                type="date"
                value={resumeDate}
                onChange={(e) => setResumeDate(e.target.value)}
                className="h-9 rounded-xl text-xs bg-slate-50 font-bold border-slate-200"
              />
            </div>
          </div>

          {/* Center 2-Month Rule Info / Warning */}
          {resumeDate && (
            <div
              className={cn(
                'rounded-2xl p-3 text-[11px] font-semibold border flex items-start gap-2',
                isOverdue
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              )}
            >
              {isOverdue ? (
                <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-extrabold">
                  {isOverdue
                    ? `⚠️ Thời gian bảo lưu: ${diffDays} ngày (Vượt quá quy định 2 tháng / 60 ngày!)`
                    : `✓ Thời gian bảo lưu: ${diffDays} ngày (Hợp lệ ≤ 60 ngày)`}
                </div>
                <p className="text-[10px] opacity-90 leading-tight">
                  Quy định trung tâm: Học viên được bảo lưu tối đa <strong>không quá 2 tháng</strong>. Hệ thống sẽ tự động nhắc nhở CS khi sắp đến hạn.
                </p>
              </div>
            </div>
          )}

          {/* Reason / Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-extrabold text-slate-700">
                Lý do / Ghi chú bảo lưu:
              </Label>
              <span className="text-[10px] text-slate-400 font-bold">Chọn lý do nhanh bên dưới:</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {[
                'Bận thi học kỳ',
                'Đi công tác / du lịch',
                'Bận việc gia đình',
                'Lý do sức khỏe',
                'Chờ xếp lịch mới',
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    const tag = `[${reason}]`
                    setReservationNote((prev) =>
                      prev.includes(tag) ? prev.replace(tag, '').trim() : (prev ? `${tag} ${prev}` : tag)
                    )
                  }}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-lg border font-bold transition shadow-2xs cursor-pointer',
                    reservationNote.includes(`[${reason}]`)
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  + {reason}
                </button>
              ))}
            </div>

            <Textarea
              rows={2}
              placeholder="VD: [Bận thi học kỳ] Học viên xin bảo lưu 3 tuần..."
              value={reservationNote}
              onChange={(e) => setReservationNote(e.target.value)}
              className="rounded-xl text-xs bg-slate-50 font-medium border-slate-200 resize-none"
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="rounded-xl bg-amber-600 text-xs font-black text-white hover:bg-amber-700 shadow-md"
            >
              {loading ? 'Đang xử lý...' : '⏸️ Xác Nhận Bảo Lưu Khóa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
