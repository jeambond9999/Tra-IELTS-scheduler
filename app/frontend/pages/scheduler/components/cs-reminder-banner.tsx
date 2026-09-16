import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  HelpCircle,
  PauseCircle,
  Play,
  PhoneCall,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CSReservationReminders, SchedulerProps } from '../types'

type StudentRecord = SchedulerProps['studentTracking'][number]

type Props = {
  reminders?: CSReservationReminders
  students: SchedulerProps['studentTracking']
  onResumeStudent: (student: StudentRecord) => void
  onSelectStudent: (studentCode: string) => void
}

export function CSReminderBanner({
  reminders,
  students,
  onResumeStudent,
  onSelectStudent,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  if (!reminders || reminders.totalReserved === 0) {
    return null
  }

  const { totalReserved, overdueCount, expiringSoonCount, items } = reminders

  const handleResumeClick = (enrollmentId: number, studentCode: string) => {
    const student = students.find(
      (s) => s.enrollmentId === enrollmentId || s.studentCode === studentCode
    )
    if (student) {
      onResumeStudent(student)
    }
  }

  return (
    <section className="rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 shadow-sm space-y-3">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md animate-bounce">
            <Bell className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                📌 Nhắc Nhở CS: Theo Dõi {totalReserved} Học Viên Bảo Lưu
              </h3>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-[10px] font-extrabold bg-rose-600 animate-pulse">
                  🚨 {overdueCount} HV quá hạn 2 tháng
                </Badge>
              )}
              {expiringSoonCount > 0 && (
                <Badge variant="secondary" className="text-[10px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                  ⏳ {expiringSoonCount} HV sắp đến ngày học lại
                </Badge>
              )}
            </div>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              Quy định trung tâm: Bảo lưu không quá 60 ngày. CS chủ động liên hệ trước khi hết hạn để xếp lịch học tiếp.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2 text-xs font-bold text-amber-900 border border-amber-200 hover:bg-amber-100 shadow-2xs transition"
        >
          <span>{expanded ? 'Thu gọn' : 'Xem danh sách cần CS liên hệ'}</span>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {/* Expandable Reminder Table / Cards */}
      {expanded && (
        <div className="pt-2 border-t border-amber-200/80 space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div
                key={item.enrollmentId}
                className={cn(
                  'rounded-2xl border bg-white p-3.5 flex flex-col justify-between gap-2.5 shadow-xs transition hover:shadow-md',
                  item.isOverdue
                    ? 'border-rose-300 bg-rose-50/40'
                    : item.isExpiringSoon
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-sm text-slate-900 block">
                        {item.studentName}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {item.studentCode} • {item.course}
                      </span>
                    </div>

                    {item.isOverdue ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                        🚨 Quá 60 ngày
                      </span>
                    ) : item.isExpiringSoon ? (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                        ⏳ Sắp học lại
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                        ⏸️ Đang bảo lưu
                      </span>
                    )}
                  </div>

                  {/* Reservation Details */}
                  <div className="mt-2 space-y-1 text-[11px] font-medium text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span>Ngày bắt đầu:</span>
                      <strong className="text-slate-900 font-mono">
                        {item.reservedFrom ? new Date(item.reservedFrom).toLocaleDateString('vi-VN') : '—'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Đã bảo lưu:</span>
                      <strong className={cn('font-mono', item.reservationDays > 60 ? 'text-rose-700 font-black' : 'text-slate-900')}>
                        {item.reservationDays} ngày / max 60 ngày
                      </strong>
                    </div>
                    {item.resumeDate && (
                      <div className="flex items-center justify-between">
                        <span>Hẹn học lại:</span>
                        <strong className="text-emerald-800 font-mono">
                          {new Date(item.resumeDate).toLocaleDateString('vi-VN')}
                          {item.daysUntilResume !== null && item.daysUntilResume !== undefined && (
                            <span className="text-[10px] text-slate-500 font-normal ml-1">
                              ({item.daysUntilResume > 0 ? `còn ${item.daysUntilResume} ngày` : 'đến hạn'})
                            </span>
                          )}
                        </strong>
                      </div>
                    )}
                    {item.reservationNote && (
                      <div className="text-[10px] text-slate-500 italic truncate pt-0.5 border-t border-slate-200/60" title={item.reservationNote}>
                        💬 "{item.reservationNote}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleResumeClick(item.enrollmentId, item.studentCode)}
                    className="flex-1 h-8 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-black shadow-2xs flex items-center justify-center gap-1"
                  >
                    <Play className="size-3 fill-white" />
                    <span>Xếp Lịch Học Lại</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectStudent(item.studentCode)}
                    className="h-8 rounded-xl text-xs font-bold px-2.5"
                    title="Xem chi tiết lộ trình và điểm danh"
                  >
                    Xem lịch
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
