import { router } from '@inertiajs/react'
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { type ReactElement, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { syncWeekTeacherAvailabilitiesPath } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { formatMonthKey } from '../calendar'
import type { SchedulerMutationRedirectParams, WeekDay } from '../types'

export const MIN_TEACHER_MONTHLY_COMMITMENT = 110

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherId: number | string
  teacherName: string
  monthKey: string
  weekName: string
  weekDays: WeekDay[]
  currentSavedSlotsCount: number
  pendingSlots: Set<string>
  defaultDuration?: number
  weeks: string[]
  mutationRedirectParams: SchedulerMutationRedirectParams
  onSyncSuccess?: () => void
}

export function TeacherSyncScheduleDialog({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  monthKey,
  weekName,
  weekDays,
  currentSavedSlotsCount,
  pendingSlots,
  defaultDuration = 40,
  weeks,
  mutationRedirectParams,
  onSyncSuccess,
}: Props): ReactElement {
  const pendingCount = pendingSlots.size
  const totalSourceSlots = currentSavedSlotsCount + pendingCount

  // Next month calculation
  const nextMonthKey = useMemo(() => {
    try {
      const [y, m] = monthKey.split('-').map(Number)
      const nextDate = new Date(y, m, 1)
      const nextY = nextDate.getFullYear()
      const nextM = String(nextDate.getMonth() + 1).padStart(2, '0')
      return `${nextY}-${nextM}`
    } catch {
      return monthKey
    }
  }, [monthKey])

  // Sync mode: 'weeks' (chọn theo tuần) or 'date' (chọn đến ngày cụ thể)
  const [syncMode, setSyncMode] = useState<'weeks' | 'date'>('weeks')

  // Target weeks in current month
  const sourceIndex = weeks.indexOf(weekName)
  const defaultSelectedWeeks = useMemo(() => {
    return weeks.filter((_, idx) => idx > (sourceIndex >= 0 ? sourceIndex : 0))
  }, [weeks, sourceIndex])

  const [selectedWeeks, setSelectedWeeks] = useState<string[]>(defaultSelectedWeeks)
  const [includeNextMonth, setIncludeNextMonth] = useState(false)

  // Target date mode
  const [untilDate, setUntilDate] = useState<string>(() => {
    // Default to last day of current month
    try {
      const [y, m] = monthKey.split('-').map(Number)
      const lastDay = new Date(y, m, 0)
      const yStr = lastDay.getFullYear()
      const mStr = String(lastDay.getMonth() + 1).padStart(2, '0')
      const dStr = String(lastDay.getDate()).padStart(2, '0')
      return `${yStr}-${mStr}-${dStr}`
    } catch {
      return ''
    }
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleToggleWeek = (w: string) => {
    setSelectedWeeks((prev) => (prev.includes(w) ? prev.filter((item) => item !== w) : [...prev, w]))
  }

  const handleSelectAllSubsequent = () => {
    setSelectedWeeks(weeks.filter((w) => w !== weekName))
  }

  const handleClearAllWeeks = () => {
    setSelectedWeeks([])
  }

  // Quick chips for date mode
  const handleSetQuickDate = (type: 'end_current_month' | 'end_next_month' | 'plus_2_weeks' | 'plus_4_weeks') => {
    const [y, m] = monthKey.split('-').map(Number)
    if (type === 'end_current_month') {
      const lastDay = new Date(y, m, 0)
      setUntilDate(lastDay.toISOString().split('T')[0])
    } else if (type === 'end_next_month') {
      const lastDay = new Date(y, m + 1, 0)
      setUntilDate(lastDay.toISOString().split('T')[0])
    } else if (type === 'plus_2_weeks') {
      const d = new Date()
      d.setDate(d.getDate() + 14)
      setUntilDate(d.toISOString().split('T')[0])
    } else if (type === 'plus_4_weeks') {
      const d = new Date()
      d.setDate(d.getDate() + 28)
      setUntilDate(d.toISOString().split('T')[0])
    }
  }

  // Calculate estimated slots
  const effectiveTargetWeeksCount = useMemo(() => {
    if (syncMode === 'weeks') {
      return selectedWeeks.length + (includeNextMonth ? weeks.length : 0)
    }
    // Date mode estimate: rough number of weeks from current week
    return 3
  }, [syncMode, selectedWeeks.length, includeNextMonth, weeks.length])

  const projectedTotalSlots = totalSourceSlots * (effectiveTargetWeeksCount + 1)

  const handleConfirmSync = () => {
    if (totalSourceSlots === 0) {
      setErrorMessage('Tuần hiện tại chưa có ca rảnh nào để đồng bộ.')
      return
    }

    if (syncMode === 'weeks' && selectedWeeks.length === 0 && !includeNextMonth) {
      setErrorMessage('Vui lòng chọn ít nhất một tuần để đồng bộ.')
      return
    }

    if (syncMode === 'date' && !untilDate) {
      setErrorMessage('Vui lòng chọn ngày muốn đồng bộ đến.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    // Build target_weeks config
    const targetWeeksPayload: Array<{ week_name: string; month_key: string }> = []
    if (syncMode === 'weeks') {
      selectedWeeks.forEach((w) => {
        targetWeeksPayload.push({ week_name: w, month_key: monthKey })
      })
      if (includeNextMonth) {
        weeks.forEach((w) => {
          targetWeeksPayload.push({ week_name: w, month_key: nextMonthKey })
        })
      }
    }

    // Build pending_slots array to save
    const pendingSlotsPayload = Array.from(pendingSlots).map((key) => {
      const [available_on, start_time] = key.split('|')
      return { available_on, start_time }
    })

    const payload: Record<string, any> = {
      teacher_id: teacherId,
      source_week_name: weekName,
      month_key: monthKey,
      duration_minutes: defaultDuration,
      pending_slots: pendingSlotsPayload,
      ...mutationRedirectParams,
    }

    if (syncMode === 'weeks') {
      payload.target_weeks = targetWeeksPayload
    } else {
      payload.until_date = untilDate
      // Pass all weeks in current and next month to let until_date filter them
      const allUpcomingWeeks: Array<{ week_name: string; month_key: string }> = []
      weeks.forEach((w) => {
        allUpcomingWeeks.push({ week_name: w, month_key: monthKey })
      })
      weeks.forEach((w) => {
        allUpcomingWeeks.push({ week_name: w, month_key: nextMonthKey })
      })
      payload.target_weeks = allUpcomingWeeks
    }

    router.post(syncWeekTeacherAvailabilitiesPath(), payload, {
      preserveScroll: true,
      onSuccess: () => {
        setIsSubmitting(false)
        onOpenChange(false)
        onSyncSuccess?.()
      },
      onError: (errors) => {
        setIsSubmitting(false)
        const msg = Object.values(errors).flat()[0]
        setErrorMessage(msg ? String(msg) : 'Lỗi khi đồng bộ lịch.')
      },
      onFinish: () => {
        setIsSubmitting(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0 rounded-3xl border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-5 text-white">
          <DialogTitle className="text-base font-black text-white flex items-center gap-2">
            <RefreshCw className="size-5 text-emerald-200" />
            <span>Đồng Bộ Lịch Dạy (Sync Ca Rảnh)</span>
          </DialogTitle>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            Giảng viên: <strong>{teacherName}</strong> • Nguồn: <strong>{weekName}</strong> (Tháng{' '}
            {formatMonthKey(monthKey)})
          </p>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 rounded-2xl"
            >
              <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Source Week Info & Pending Slots Banner */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <CalendarDays className="size-4 text-emerald-700" />
                Lịch nguồn: {weekName}
              </span>
              <Badge variant="outline" className="bg-white text-emerald-900 border-emerald-300 font-bold">
                {totalSourceSlots} ca rảnh / tuần
              </Badge>
            </div>

            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
              <span>Đã lưu trong tuần: <strong>{currentSavedSlotsCount} ca</strong></span>
              {pendingCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-800 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                    +{pendingCount} ca mới chọn trên bảng (màu vàng)
                  </span>
                </>
              )}
            </div>

            {pendingCount > 0 && (
              <div className="text-[11px] text-emerald-900 bg-white/90 border border-emerald-300/80 rounded-xl p-2.5 font-medium leading-relaxed flex items-start gap-2">
                <Sparkles className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  💡 <strong>Xác nhận lưu an toàn</strong>: Hệ thống sẽ tự động <strong>lưu {pendingCount} ca mới chọn</strong> vào {weekName} trước, sau đó đồng bộ toàn bộ {totalSourceSlots} ca sang các thời gian bạn chọn bên dưới. Bạn không lo bị mất ca vừa chọn!
                </span>
              </div>
            )}
          </div>

          {/* 2. Choose Target Scope (Tùy chọn thời gian Sync) */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="size-4 text-slate-600" />
                Chọn thời gian muốn đồng bộ
              </label>

              {/* Mode switch */}
              <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSyncMode('weeks')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    syncMode === 'weeks' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Theo các tuần
                </button>
                <button
                  type="button"
                  onClick={() => setSyncMode('date')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    syncMode === 'date' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Đến ngày cụ thể
                </button>
              </div>
            </div>

            {/* Mode A: Select specific weeks */}
            {syncMode === 'weeks' ? (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tích chọn các tuần bạn muốn áp dụng:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllSubsequent}
                      className="text-emerald-700 hover:underline font-bold"
                    >
                      Chọn tất cả
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={handleClearAllWeeks}
                      className="text-slate-500 hover:underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {weeks.map((w, idx) => {
                    const isSource = w === weekName
                    const isChecked = selectedWeeks.includes(w)
                    return (
                      <label
                        key={w}
                        className={cn(
                          'flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none',
                          isSource
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : isChecked
                              ? 'bg-white border-emerald-500 shadow-xs text-slate-900 ring-1 ring-emerald-400/50'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isSource}
                          onCheckedChange={() => !isSource && handleToggleWeek(w)}
                        />
                        <span className="font-bold flex-1">{w}</span>
                        {isSource && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold">
                            Tuần nguồn
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>

                {/* Option to also sync next month */}
                <div className="pt-2 border-t border-slate-200/80">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-white transition">
                    <Checkbox
                      checked={includeNextMonth}
                      onCheckedChange={(val) => setIncludeNextMonth(Boolean(val))}
                    />
                    <span>
                      Đồng bộ sang cả <strong>Tháng {formatMonthKey(nextMonthKey)}</strong> (Toàn bộ 5 tuần tháng sau)
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              /* Mode B: Select until date */
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-bold block">
                    Đồng bộ lịch đến ngày:
                  </label>
                  <Input
                    type="date"
                    value={untilDate}
                    onChange={(e) => setUntilDate(e.target.value)}
                    className="bg-white font-bold h-9 text-xs"
                    required
                  />
                </div>

                {/* Quick selection chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Chọn nhanh mốc thời gian:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate('end_current_month')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-800 transition"
                    >
                      Hết tháng này ({formatMonthKey(monthKey)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate('end_next_month')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-800 transition"
                    >
                      Hết tháng sau ({formatMonthKey(nextMonthKey)})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate('plus_2_weeks')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-800 transition"
                    >
                      2 tuần tới
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetQuickDate('plus_4_weeks')}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg hover:border-emerald-500 hover:text-emerald-800 transition"
                    >
                      4 tuần tới
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Preview & KPI Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-semibold">Quy mô đồng bộ dự kiến:</span>
              <span className="font-extrabold text-slate-900">
                {totalSourceSlots} ca/tuần × {effectiveTargetWeeksCount + 1} tuần = ~{projectedTotalSlots} ca
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Mục tiêu tối thiểu cam kết (110 ca/tháng):</span>
              {projectedTotalSlots >= MIN_TEACHER_MONTHLY_COMMITMENT ? (
                <span className="font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                  ✅ Đạt {projectedTotalSlots}/110 ca
                </span>
              ) : (
                <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                  ⚠️ Dự kiến {projectedTotalSlots} ca (Thiếu {MIN_TEACHER_MONTHLY_COMMITMENT - projectedTotalSlots} ca)
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Bảo vệ dữ liệu an toàn 100%</strong>: Các ca rảnh đã mở trước đó và các ca học đã có học viên đăng ký sẽ được <strong>giữ nguyên an toàn</strong>. Hệ thống tự động bỏ qua những slot bị trùng, không bao giờ ghi đè làm mất lịch.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-bold text-slate-600 rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSync}
              disabled={isSubmitting || totalSourceSlots === 0}
              className="h-9 px-5 text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-md gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Đang lưu & đồng bộ...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Xác nhận lưu lịch & Sync</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
