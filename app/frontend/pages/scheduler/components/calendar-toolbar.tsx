import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  WEEKS,
  getCurrentMonthKey,
  getCurrentWeekName,
  getFormattedWeekLabel,
  getWeekRangeForWeek,
  monthOptions,
} from '../calendar'
import type { Person, PersonRole } from '../types'

type Props = {
  role: PersonRole
  monthKey: string
  weekName: string
  weekRange?: string
  weeks: string[]
  teacherId: number | 'all' | string
  teachers: Person[]
  onChange: (values: Partial<{ monthKey: string; weekName: string; teacherId: number | 'all' | string }>) => void
  onBookNew?: () => void
  onEditTeacherSchedule?: () => void
  hideWeekControls?: boolean
}

export function CalendarToolbar({
  role,
  monthKey,
  weekName,
  weeks,
  teacherId,
  teachers,
  onChange,
  onBookNew,
  onEditTeacherSchedule,
  hideWeekControls = false,
}: Props) {
  const weekList = weeks && weeks.length > 0 ? weeks : (WEEKS as readonly string[])

  const handleGoToToday = () => {
    const today = new Date()
    const targetMonth = getCurrentMonthKey(today)
    const targetWeek = getCurrentWeekName(today)
    const targetIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const isAlreadyAtToday = monthKey === targetMonth && (role === 'admin' || weekName === targetWeek)

    if (!isAlreadyAtToday) {
      onChange({ monthKey: targetMonth, weekName: targetWeek })
    }

    // Smooth scroll to today's header / column in the schedule grid
    setTimeout(() => {
      const todayEl =
        document.querySelector('[data-today="true"]') ||
        document.getElementById(`day-header-${targetIso}`)
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
        todayEl.classList.add('ring-4', 'ring-emerald-400', 'transition-all')
        setTimeout(() => {
          todayEl.classList.remove('ring-4', 'ring-emerald-400')
        }, 1600)
      }
    }, isAlreadyAtToday ? 50 : 350)

    toast.success(
      role === 'admin'
        ? `🎯 Đã chuyển về tháng hiện tại: Tháng ${today.getMonth() + 1}/${today.getFullYear()}`
        : `🎯 Đã chuyển đến ngày hôm nay: ${today.toLocaleDateString('vi-VN')} • ${targetWeek}`
    )
  }


  const handlePrevMonth = () => {
    const [yearStr, monthStr] = monthKey.split('-')
    let year = parseInt(yearStr || '2026', 10)
    let month = parseInt(monthStr || '1', 10) - 1
    if (month < 1) {
      month = 12
      year -= 1
    }
    const nextMonthKey = `${year}-${String(month).padStart(2, '0')}`
    onChange({ monthKey: nextMonthKey })
  }

  const handleNextMonth = () => {
    const [yearStr, monthStr] = monthKey.split('-')
    let year = parseInt(yearStr || '2026', 10)
    let month = parseInt(monthStr || '1', 10) + 1
    if (month > 12) {
      month = 1
      year += 1
    }
    const nextMonthKey = `${year}-${String(month).padStart(2, '0')}`
    onChange({ monthKey: nextMonthKey })
  }

  const handlePrevWeek = () => {
    const currentIndex = weekList.indexOf(weekName)
    if (currentIndex > 0) {
      onChange({ weekName: weekList[currentIndex - 1] })
    } else {
      // Go to previous month's last week
      const [yearStr, monthStr] = monthKey.split('-')
      let year = parseInt(yearStr || '2026', 10)
      let month = parseInt(monthStr || '1', 10) - 1
      if (month < 1) {
        month = 12
        year -= 1
      }
      const prevMonthKey = `${year}-${String(month).padStart(2, '0')}`
      const lastWeek = weekList[weekList.length - 1] || 'Tuần 4'
      onChange({ monthKey: prevMonthKey, weekName: lastWeek })
    }
  }

  const handleNextWeek = () => {
    const currentIndex = weekList.indexOf(weekName)
    if (currentIndex >= 0 && currentIndex < weekList.length - 1) {
      onChange({ weekName: weekList[currentIndex + 1] })
    } else {
      // Go to next month's first week
      const [yearStr, monthStr] = monthKey.split('-')
      let year = parseInt(yearStr || '2026', 10)
      let month = parseInt(monthStr || '1', 10) + 1
      if (month > 12) {
        month = 1
        year += 1
      }
      const nextMonthKey = `${year}-${String(month).padStart(2, '0')}`
      const firstWeek = weekList[0] || 'Tuần 1'
      onChange({ monthKey: nextMonthKey, weekName: firstWeek })
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm min-h-[64px]">
      {/* Left side: Date navigation & Quick Jump */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Month Selector with Prev/Next buttons */}
        <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 h-9 text-xs font-bold text-slate-500 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={handlePrevMonth}
            title="Tháng trước"
            aria-label="Tháng trước"
            className="h-full px-2 hover:bg-slate-200/80 hover:text-slate-900 text-slate-400 transition-colors flex items-center justify-center cursor-pointer active:scale-90"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          <div className="flex items-center gap-1.5 px-2 border-x border-slate-200/60">
            <CalendarDays data-icon className="size-3.5 text-emerald-700 shrink-0" />
            <span className="font-semibold text-slate-500 shrink-0">Tháng:</span>
            <Select value={monthKey} onValueChange={(value) => onChange({ monthKey: value })}>
              <SelectTrigger
                hideChevron
                aria-label="Chọn tháng"
                className="h-7 w-auto min-w-[85px] border-none bg-transparent px-1 py-0 text-xs font-black text-slate-900 shadow-none focus-visible:ring-0 cursor-pointer"
              >
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-xl text-xs max-h-64 z-50 bg-white shadow-md border border-slate-200">
                <SelectGroup>
                  {monthOptions(parseInt(monthKey.split('-')[0] || '2026', 10)).map((month) => (
                    <SelectItem key={month.key} value={month.key} className="text-xs font-bold py-1.5 cursor-pointer">
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            title="Tháng sau"
            aria-label="Tháng sau"
            className="h-full px-2 hover:bg-slate-200/80 hover:text-slate-900 text-slate-400 transition-colors flex items-center justify-center cursor-pointer active:scale-90"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {!hideWeekControls && role !== 'admin' ? (
          <>
            {/* Week Selector formatted as: Tuần X (dd/mm - dd/mm) with Prev/Next buttons */}
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 h-9 text-xs font-bold text-slate-500 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handlePrevWeek}
                title="Tuần trước"
                aria-label="Tuần trước"
                className="h-full px-2 hover:bg-slate-200/80 hover:text-slate-900 text-slate-400 transition-colors flex items-center justify-center cursor-pointer active:scale-90"
              >
                <ChevronLeft className="size-3.5" />
              </button>

              <div className="flex items-center gap-1.5 px-2 border-x border-slate-200/60">
                <span className="font-semibold text-slate-500 shrink-0">Tuần:</span>
                <Select value={weekName} onValueChange={(value) => onChange({ weekName: value })}>
                  <SelectTrigger
                    hideChevron
                    aria-label="Chọn tuần"
                    className="h-7 w-auto min-w-[195px] sm:min-w-[215px] border-none bg-transparent px-1 py-0 text-xs font-black text-slate-900 shadow-none focus-visible:ring-0 cursor-pointer"
                  >
                    <SelectValue placeholder="Chọn tuần">
                      {getFormattedWeekLabel(monthKey, weekName)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper" className="rounded-xl text-xs max-h-64 z-50 bg-white shadow-md border border-slate-200">
                    <SelectGroup>
                      {weekList.map((week) => (
                        <SelectItem key={week} value={week} className="text-xs font-bold py-1.5 cursor-pointer">
                          {getFormattedWeekLabel(monthKey, week)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <button
                type="button"
                onClick={handleNextWeek}
                title="Tuần sau"
                aria-label="Tuần sau"
                className="h-full px-2 hover:bg-slate-200/80 hover:text-slate-900 text-slate-400 transition-colors flex items-center justify-center cursor-pointer active:scale-90"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {/* Quick jump buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGoToToday}
                className="h-9 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold text-slate-700 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
              >
                🎯 Hôm nay
              </Button>
            </div>
          </>
        ) : hideWeekControls ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 h-9 text-xs font-bold text-emerald-800 shadow-2xs">
              <span className="inline-block size-2 rounded-full bg-emerald-600" />
              <span>Track theo tháng</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGoToToday}
              className="h-9 rounded-2xl border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold text-slate-700 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              🎯 Tháng hiện tại
            </Button>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 h-9 text-xs font-bold text-slate-600 shadow-2xs">
              <span className="inline-block size-2 rounded-full bg-slate-900" />
              <span>Phạm vi: Toàn bộ các tuần trong tháng</span>
            </div>
          </div>
        )}
      </div>

      {/* Right side: Actions / Teacher filter */}
      <div className="flex flex-wrap items-center gap-3">
        {role === 'sales' && (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 h-9 text-xs font-bold text-slate-600 shadow-2xs">
            <UserRound data-icon className="size-4 text-emerald-700 shrink-0" />
            <span className="font-semibold text-slate-500 shrink-0">Xem lịch GV:</span>
            <Select
              value={String(teacherId)}
              onValueChange={(value) => onChange({ teacherId: value === 'all' ? 'all' : Number(value) })}
            >
              <SelectTrigger
                aria-label="Chọn giáo viên"
                className="h-7 min-w-[150px] max-w-[240px] border-none bg-transparent p-0 text-xs font-black text-emerald-700 shadow-none focus-visible:ring-0 cursor-pointer"
              >
                <SelectValue placeholder="Chọn giáo viên" />
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-xl text-xs max-h-64 z-50 bg-white shadow-md border border-slate-200">
                <SelectGroup>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)} className="text-xs font-bold py-1.5 cursor-pointer">
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        {role === 'sales' && onEditTeacherSchedule && (
          <Button
            type="button"
            variant="outline"
            onClick={onEditTeacherSchedule}
            className="h-9 rounded-2xl border-rose-300 bg-rose-50/80 hover:bg-rose-100 hover:text-rose-900 text-xs font-bold text-rose-800 px-3.5 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
            title="Sửa đổi lịch đăng ký của giáo viên này (Xóa các ca rảnh đã đăng ký - Quyền Sales không giới hạn)"
          >
            <Trash2 className="size-3.5 text-rose-600" />
            <span>Sửa Lịch GV</span>
          </Button>
        )}

        {role === 'sales' && onBookNew && (
          <Button
            type="button"
            onClick={onBookNew}
            className="h-9 rounded-2xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-md hover:bg-emerald-800 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <CalendarPlus className="size-3.5" />
            <span>Xếp Lịch Học Mới</span>
          </Button>
        )}


        {role === 'admin' ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 h-9 text-xs font-bold text-slate-700 shadow-2xs">
            <span>📊 Báo cáo hiệu suất & Phân bổ giáo viên</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
