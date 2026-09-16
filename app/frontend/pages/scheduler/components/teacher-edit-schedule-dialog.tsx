import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Lock,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatMonthKey } from '../calendar'
import type { TeacherAvailability } from '../types'

export interface TeacherEditScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherName: string
  teacherId: number | string
  monthKey: string
  weekName: string
  weekAvailabilities: TeacherAvailability[]
  monthAvailabilities: TeacherAvailability[]
  quotaCount?: number // 0, 1, 2
  maxQuota?: number
  isUnlimited?: boolean
  role?: string
  onConfirmDelete: (ids: number[]) => void
  onSwitchToGridMode?: () => void
}

const VIETNAMESE_DAYS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

function formatDateLabel(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T00:00:00`)
    const dayName = VIETNAMESE_DAYS[d.getDay()]
    const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    return `${dayName}, ${dateFormatted}`
  } catch {
    return isoDate
  }
}

export function TeacherEditScheduleDialog({
  open,
  onOpenChange,
  teacherName,
  monthKey,
  weekName,
  weekAvailabilities,
  monthAvailabilities,
  quotaCount = 0,
  maxQuota = 2,
  isUnlimited = true,
  role = 'teacher',
  onConfirmDelete,
  onSwitchToGridMode,
}: TeacherEditScheduleDialogProps) {
  const [scope, setScope] = useState<'week' | 'month'>('week')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isConfirming, setIsConfirming] = useState(false)

  const isQuotaExceeded = !isUnlimited && quotaCount >= maxQuota
  const currentList = scope === 'week' ? weekAvailabilities : monthAvailabilities

  // Group availabilities by date
  const groupedSlots = useMemo(() => {
    const map = new Map<string, TeacherAvailability[]>()
    currentList.forEach((item) => {
      const date = item.availableOn
      if (!map.has(date)) {
        map.set(date, [])
      }
      map.get(date)!.push(item)
    })
    // Sort chronologically by date
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    // Sort slots inside each date by start_time
    entries.forEach(([_, slots]) => {
      slots.sort((s1, s2) => s1.startTime.localeCompare(s2.startTime))
    })
    return entries
  }, [currentList])

  const totalAvailableInScope = currentList.length

  const handleToggleId = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllInScope = () => {
    if (selectedIds.size === totalAvailableInScope) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(currentList.map((item) => item.id)))
    }
  }

  const handleSelectDay = (slots: TeacherAvailability[]) => {
    const dayIds = slots.map((s) => s.id)
    const allSelected = dayIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        dayIds.forEach((id) => next.delete(id))
      } else {
        dayIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const handleReset = () => {
    setSelectedIds(new Set())
    setIsConfirming(false)
  }

  const handleExecuteDelete = () => {
    if (selectedIds.size === 0) return
    onConfirmDelete(Array.from(selectedIds))
    handleReset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleReset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="space-y-1.5 shrink-0 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-800 shadow-2xs">
                <Trash2 className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Sửa Đổi Lịch Đăng Ký Ca Rảnh
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  Giáo viên: <strong className="text-slate-700">{teacherName}</strong> · Tháng {formatMonthKey(monthKey)}
                </DialogDescription>
              </div>
            </div>

            {/* Quota Badge */}
            <div className="shrink-0 text-right">
              {isUnlimited ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black shadow-2xs border',
                    role === 'sales'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  )}
                >
                  <Sparkles className={cn('size-3.5', role === 'sales' ? 'text-amber-600' : 'text-emerald-600')} />
                  <span>{role === 'sales' ? '👑 Quyền Sales: Không giới hạn' : '✨ Không giới hạn lượt sửa'}</span>
                </span>
              ) : (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black shadow-2xs border',
                    isQuotaExceeded
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : quotaCount === 1
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  )}
                >
                  {isQuotaExceeded ? (
                    <>
                      <Lock className="size-3.5" />
                      <span>Đã dùng 2/2 lượt (Đã khóa)</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-3.5" />
                      <span>Còn {maxQuota - quotaCount}/{maxQuota} lần sửa tháng này</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Quota Exceeded Screen */}
        {isQuotaExceeded ? (
          <div className="py-6 space-y-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Lock className="size-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-black text-slate-900">
                Đã Hết Số Lần Sửa Đổi Trong Tháng {formatMonthKey(monthKey)}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Theo quy định, mỗi giáo viên chỉ được sửa đổi lịch đăng ký (xóa các ca lỡ đăng ký trước đó) tối đa <strong>2 lần/tháng</strong> nhằm đảm bảo tính ổn định của lịch tuyển sinh và vận hành.
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 max-w-md mx-auto font-medium">
              💡 Nếu bạn có việc đột xuất cần điều chỉnh khẩn cấp, vui lòng liên hệ trực tiếp <strong>Admin / Quản Lý Đào Tạo</strong> để được hỗ trợ mở khóa.
            </div>
            <DialogFooter className="pt-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl font-bold cursor-pointer"
              >
                Đã hiểu & Đóng
              </Button>
            </DialogFooter>
          </div>
        ) : isConfirming ? (
          /* Confirmation Step */
          <div className="py-4 space-y-4 overflow-y-auto">
            {isUnlimited ? (
              <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                  <AlertTriangle className="size-5 text-rose-600 shrink-0" />
                  <span>
                    {role === 'sales'
                      ? `Xác nhận xóa ${selectedIds.size} ca rảnh của GV ${teacherName}?`
                      : `Xác nhận xóa ${selectedIds.size} ca rảnh đã chọn?`}
                  </span>
                </div>
                <p className="text-xs text-rose-950 leading-relaxed font-medium">
                  Bạn đang chuẩn bị xóa vĩnh viễn <strong>{selectedIds.size} ca rảnh</strong> đã đăng ký{role === 'sales' ? ` của giáo viên ${teacherName}` : ''}.
                  {role === 'sales'
                    ? ' Thao tác này được thực hiện với Quyền Quản lý Sales (Không giới hạn).'
                    : ' Thao tác này không bị giới hạn số lần, bạn có thể tự do xóa và mở lại ca mới bất cứ lúc nào.'}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                  <Sparkles className="size-3.5 shrink-0 text-emerald-600" />
                  <span>{role === 'sales' ? 'Quyền Sales: Không bị giới hạn số lần sửa đổi lịch.' : 'Không giới hạn: Giáo viên có thể tự do điều chỉnh ca rảnh theo nhu cầu.'}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                  <AlertTriangle className="size-5 text-rose-600 shrink-0" />
                  <span>
                    {quotaCount === 0
                      ? `Xác nhận xóa ${selectedIds.size} ca rảnh đã chọn (Lần sửa 1/2)?`
                      : `CẢNH BÁO: ĐÂY LÀ LẦN SỬA ĐỔI CUỐI CÙNG (Lần 2/2)?`}
                  </span>
                </div>
                <p className="text-xs text-rose-950 leading-relaxed font-medium">
                  Bạn đang chuẩn bị xóa vĩnh viễn <strong>{selectedIds.size} ca rảnh</strong> đã đăng ký.
                  Hành động này sẽ được ghi nhận là <strong>LẦN SỬA THỨ {quotaCount + 1}/{maxQuota}</strong> trong tháng {formatMonthKey(monthKey)}.
                </p>
                {quotaCount + 1 >= maxQuota ? (
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 bg-rose-200/80 px-2.5 py-1.5 rounded-xl border border-rose-300">
                    <Lock className="size-3.5 shrink-0" />
                    <span>Sau khi bấm xác nhận, tính năng sửa đổi lịch của tháng này sẽ bị KHÓA CỐ ĐỊNH.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-200/60 px-2.5 py-1 rounded-xl">
                    <span>Sau lần này, bạn sẽ còn 1 lượt sửa đổi duy nhất cho tháng {formatMonthKey(monthKey)}.</span>
                  </div>
                )}
              </div>
            )}

            {/* List of selected slots to be deleted */}
            <div className="space-y-1.5">
              <span className="text-xs font-extrabold text-slate-700">
                Danh sách {selectedIds.size} ca sẽ bị xóa:
              </span>
              <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2.5 space-y-1">
                {currentList
                  .filter((item) => selectedIds.has(item.id))
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-slate-200 text-slate-800 shadow-2xs"
                    >
                      <span className="font-bold">{formatDateLabel(item.availableOn)}</span>
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {item.startTime} - {item.endTime} ({item.durationMinutes}p)
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirming(false)}
                className="rounded-xl font-bold cursor-pointer"
              >
                Quay lại chọn thêm
              </Button>
              <Button
                type="button"
                onClick={handleExecuteDelete}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md cursor-pointer transition-all active:scale-95"
              >
                {isUnlimited
                  ? `Xác nhận xóa ${selectedIds.size} ca`
                  : `Xác nhận xóa ${selectedIds.size} ca & Trừ 1 lượt`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Normal Slot Selection Screen */
          <div className="flex flex-col flex-1 min-h-0 space-y-3.5 pt-2">
            {/* Policy & Quota notice */}
            {isUnlimited ? (
              <div
                className={cn(
                  'rounded-2xl border p-3 text-xs flex items-start gap-2.5 shrink-0',
                  role === 'sales'
                    ? 'border-amber-200 bg-amber-50/70 text-amber-950'
                    : 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                )}
              >
                <Sparkles className={cn('size-4 shrink-0 mt-0.5', role === 'sales' ? 'text-amber-600' : 'text-emerald-600')} />
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    {role === 'sales'
                      ? 'Chế độ quản lý Sales: Không giới hạn lượt sửa'
                      : 'Chế độ sửa đổi lịch: Không giới hạn số lần sửa'}
                  </span>
                  <p className={cn('text-[11px] leading-relaxed font-medium', role === 'sales' ? 'text-amber-800' : 'text-emerald-800')}>
                    {role === 'sales' ? (
                      <>
                        Sales có thể xóa các ca rảnh đã đăng ký của giáo viên <strong>{teacherName}</strong> theo nhu cầu tuyển sinh và vận hành.
                      </>
                    ) : (
                      <>
                        Giáo viên có thể tự do chọn và xóa các ca lỡ đăng ký nhầm bất kỳ lúc nào mà <strong>không bị giới hạn số lần</strong> để luôn duy trì thời gian biểu chính xác nhất.
                      </>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-950 flex items-start gap-2.5 shrink-0">
                <Info className="size-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    Quy định sửa đổi: 1 tháng được sửa tối đa 2 lần
                  </span>
                  <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                    {quotaCount === 0 ? (
                      <>
                        Đây là <strong>lần sửa đầu tiên (1/2)</strong> trong tháng {formatMonthKey(monthKey)}. Bạn có thể chọn và xóa hàng loạt các ca lỡ đăng ký nhầm cùng lúc trong lần sửa này.
                      </>
                    ) : (
                      <>
                        ⚠️ Bạn đang chuẩn bị dùng <strong>lần sửa thứ 2/2 (lần cuối cùng)</strong> trong tháng {formatMonthKey(monthKey)}. Hãy kiểm tra kỹ các ca muốn xóa!
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Scope Filter & Select All Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0 pb-1 border-b border-slate-100">
              {/* Scope Switch: Week vs Month */}
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setScope('week')
                    setSelectedIds(new Set())
                  }}
                  className={cn(
                    'px-3 py-1 rounded-xl transition-all cursor-pointer',
                    scope === 'week'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Tuần này ({weekName})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope('month')
                    setSelectedIds(new Set())
                  }}
                  className={cn(
                    'px-3 py-1 rounded-xl transition-all cursor-pointer',
                    scope === 'month'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Toàn bộ tháng ({formatMonthKey(monthKey)})
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {totalAvailableInScope > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllInScope}
                    className="h-7 text-xs rounded-xl font-bold border-slate-300 cursor-pointer"
                  >
                    {selectedIds.size === totalAvailableInScope ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </Button>
                )}

                {onSwitchToGridMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      onSwitchToGridMode()
                    }}
                    className="h-7 text-xs rounded-xl font-bold border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                    title="Đóng hộp thoại và chọn trực tiếp trên lưới lịch"
                  >
                    <Calendar className="size-3.5 mr-1 text-emerald-700" />
                    Chọn trên bảng lịch 📅
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable Slots List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[160px]">
              {groupedSlots.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <span className="text-3xl block">🍃</span>
                  <p className="text-xs font-medium">
                    Không tìm thấy ca rảnh nào đã đăng ký trong{' '}
                    {scope === 'week' ? `tuần ${weekName}` : `tháng ${formatMonthKey(monthKey)}`}.
                  </p>
                </div>
              ) : (
                groupedSlots.map(([date, slots]) => {
                  const dayIds = slots.map((s) => s.id)
                  const allDaySelected = dayIds.every((id) => selectedIds.has(id))
                  const someDaySelected = dayIds.some((id) => selectedIds.has(id))

                  return (
                    <div
                      key={date}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 space-y-2 shadow-2xs"
                    >
                      {/* Date Header */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectDay(slots)}
                            className="text-xs font-extrabold text-slate-800 hover:text-emerald-800 cursor-pointer flex items-center gap-1.5"
                          >
                            <span
                              className={cn(
                                'flex size-4 items-center justify-center rounded-md border text-[10px] transition-all',
                                allDaySelected
                                  ? 'border-rose-600 bg-rose-600 text-white font-black'
                                  : someDaySelected
                                    ? 'border-rose-400 bg-rose-100 text-rose-700'
                                    : 'border-slate-300 bg-white'
                              )}
                            >
                              {allDaySelected ? '✓' : someDaySelected ? '–' : ''}
                            </span>
                            <span>{formatDateLabel(date)}</span>
                          </button>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            ({slots.length} ca)
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectDay(slots)}
                          className="text-[11px] font-bold text-slate-500 hover:text-rose-700 cursor-pointer"
                        >
                          {allDaySelected ? 'Bỏ chọn ngày' : 'Chọn cả ngày'}
                        </button>
                      </div>

                      {/* Slots in Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slots.map((slot) => {
                          const isChecked = selectedIds.has(slot.id)

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => handleToggleId(slot.id)}
                              className={cn(
                                'flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer shadow-2xs',
                                isChecked
                                  ? 'border-rose-400 bg-rose-50 text-rose-900 ring-1 ring-rose-300'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'flex size-4 items-center justify-center rounded-md border text-[10px] transition-all shrink-0',
                                    isChecked
                                      ? 'border-rose-600 bg-rose-600 text-white font-black'
                                      : 'border-slate-300 bg-white'
                                  )}
                                >
                                  {isChecked && '✓'}
                                </span>
                                <div className="flex items-center gap-1 font-mono text-xs font-bold">
                                  <Clock className="size-3 text-slate-400" />
                                  <span>{slot.startTime} - {slot.endTime}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                {slot.durationMinutes}p
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer summary & actions */}
            <DialogFooter className="flex flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
              <div className="text-xs font-bold text-slate-700">
                Đã chọn:{' '}
                <strong className={cn(selectedIds.size > 0 ? 'text-rose-600' : 'text-slate-900')}>
                  {selectedIds.size}
                </strong>{' '}
                / {totalAvailableInScope} ca
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={() => setIsConfirming(true)}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Xóa {selectedIds.size} ca đã chọn
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
