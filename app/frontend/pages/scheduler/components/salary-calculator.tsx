import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  BadgePercent,
  Banknote,
  Calculator,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  DollarSign,
  Edit,
  FileText,
  Gift,
  HelpCircle,
  Info,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { monthOptions } from '../calendar'
import { TeacherStudentsDropdown } from './teacher-students-dropdown'
import { TeacherPayslipDialog, type TeacherPayslipData } from './teacher-payslip-dialog'
import { CompletedSessionsReconciliationDialog, getSessionCa } from './completed-sessions-reconciliation-dialog'
import type { AdminTeacherStat, LessonSession, PersonRole, SalaryMilestoneInfo, SalaryMilestoneKey, SchedulerProps } from '../types'

// ── Rate Table Data (Khớp 100% Bảng Trong Ảnh 1) ──────────────────────────────

export const SALARY_MILESTONES: SalaryMilestoneInfo[] = [
  {
    key: 'base',
    name: 'Mức gốc',
    monthlySlots: 40,
    weeklySlots: 10,
    expectedMonthly85: 34,
    expectedWeekly85: 8.5,
    standardRate: 120_000,
    expertRate: 132_000,
    standardIncome: 4_080_000,
    expertIncome: 4_488_000,
  },
  {
    key: 'active',
    name: 'Tích cực',
    monthlySlots: 70,
    weeklySlots: 17.5,
    expectedMonthly85: 59.5,
    expectedWeekly85: 14.875,
    standardRate: 133_000,
    expertRate: 145_000,
    standardIncome: 7_913_500,
    expertIncome: 8_627_500,
  },
  {
    key: 'professional',
    name: 'Chuyên nghiệp',
    monthlySlots: 110,
    weeklySlots: 27.5,
    expectedMonthly85: 93.5,
    expectedWeekly85: 23.375,
    standardRate: 145_000,
    expertRate: 158_000,
    standardIncome: 13_557_500,
    expertIncome: 14_773_000,
  },
  {
    key: 'dedicated',
    name: 'Cống hiến',
    monthlySlots: 145,
    weeklySlots: 36.25,
    expectedMonthly85: 123.25,
    expectedWeekly85: 30.8125,
    standardRate: 155_000,
    expertRate: 170_000,
    standardIncome: 19_103_750,
    expertIncome: 20_952_500,
  },
]

export const TEACHER_RANKS_STORAGE_KEY = 'traielts_teacher_ranks_v1'

export function getTeacherRankFromStorage(teacherId: number): 'standard' | 'expert' {
  try {
    const raw = window.localStorage.getItem(TEACHER_RANKS_STORAGE_KEY)
    if (raw) {
      const map = JSON.parse(raw) as Record<number, 'standard' | 'expert'>
      if (map[teacherId]) return map[teacherId]
    }
  } catch {
    // ignore
  }
  return 'standard'
}

export function saveTeacherRankToStorage(teacherId: number, rank: 'standard' | 'expert') {
  try {
    const raw = window.localStorage.getItem(TEACHER_RANKS_STORAGE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<number, 'standard' | 'expert'>) : {}
    map[teacherId] = rank
    window.localStorage.setItem(TEACHER_RANKS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

export const TEACHER_COMPLETED_CA_STORAGE_KEY = 'traielts_teacher_completed_ca_v1'

export function getCompletedCaOverridesFromStorage(monthKey: string): Record<number, number> {
  try {
    const raw = window.localStorage.getItem(TEACHER_COMPLETED_CA_STORAGE_KEY)
    if (raw) {
      const allMonths = JSON.parse(raw) as Record<string, Record<number, number>>
      if (allMonths[monthKey]) return allMonths[monthKey]
    }
  } catch {
    // ignore
  }
  return {}
}

export function saveCompletedCaOverrideToStorage(
  monthKey: string,
  teacherId: number,
  value: number | null
) {
  try {
    const raw = window.localStorage.getItem(TEACHER_COMPLETED_CA_STORAGE_KEY)
    const allMonths = raw ? (JSON.parse(raw) as Record<string, Record<number, number>>) : {}
    if (!allMonths[monthKey]) {
      allMonths[monthKey] = {}
    }
    if (value === null || isNaN(value)) {
      delete allMonths[monthKey][teacherId]
    } else {
      allMonths[monthKey][teacherId] = value
    }
    window.localStorage.setItem(TEACHER_COMPLETED_CA_STORAGE_KEY, JSON.stringify(allMonths))
  } catch {
    // ignore
  }
}

export const TEACHER_OPEN_SLOTS_STORAGE_KEY = 'traielts_teacher_open_slots_v1'

export function getOpenSlotsOverridesFromStorage(monthKey: string): Record<number, number> {
  try {
    const raw = window.localStorage.getItem(TEACHER_OPEN_SLOTS_STORAGE_KEY)
    if (raw) {
      const allMonths = JSON.parse(raw) as Record<string, Record<number, number>>
      if (allMonths[monthKey]) return allMonths[monthKey]
    }
  } catch {
    // ignore
  }
  return {}
}

export function saveOpenSlotsOverrideToStorage(
  monthKey: string,
  teacherId: number,
  value: number | null
) {
  try {
    const raw = window.localStorage.getItem(TEACHER_OPEN_SLOTS_STORAGE_KEY)
    const allMonths = raw ? (JSON.parse(raw) as Record<string, Record<number, number>>) : {}
    if (!allMonths[monthKey]) {
      allMonths[monthKey] = {}
    }
    if (value === null || isNaN(value)) {
      delete allMonths[monthKey][teacherId]
    } else {
      allMonths[monthKey][teacherId] = value
    }
    window.localStorage.setItem(TEACHER_OPEN_SLOTS_STORAGE_KEY, JSON.stringify(allMonths))
  } catch {
    // ignore
  }
}

export const DEMO_SESSION_RATE = 100_000
export const AIM_BONUS_DEFAULT_RATE = 300_000

export type TeacherSalaryExtras = {
  demoCa?: number
  aimBonusAmount?: number
  aimBonusCount?: number
  aimBonusNote?: string
  upsaleAmount?: number
  upsaleNote?: string
  customAdjustment?: number
  customNote?: string
}

export const TEACHER_SALARY_EXTRAS_STORAGE_KEY = 'traielts_teacher_salary_extras_v1'

export function getSalaryExtrasFromStorage(monthKey: string): Record<number, TeacherSalaryExtras> {
  try {
    const raw = window.localStorage.getItem(TEACHER_SALARY_EXTRAS_STORAGE_KEY)
    if (raw) {
      const allMonths = JSON.parse(raw) as Record<string, Record<number, TeacherSalaryExtras>>
      if (allMonths[monthKey]) return allMonths[monthKey]
    }
  } catch {
    // ignore
  }
  return {}
}

export function saveSalaryExtrasToStorage(
  monthKey: string,
  teacherId: number,
  data: Partial<TeacherSalaryExtras>
) {
  try {
    const raw = window.localStorage.getItem(TEACHER_SALARY_EXTRAS_STORAGE_KEY)
    const allMonths = raw ? (JSON.parse(raw) as Record<string, Record<number, TeacherSalaryExtras>>) : {}
    if (!allMonths[monthKey]) {
      allMonths[monthKey] = {}
    }
    const current = allMonths[monthKey][teacherId] || {}
    allMonths[monthKey][teacherId] = { ...current, ...data }
    window.localStorage.setItem(TEACHER_SALARY_EXTRAS_STORAGE_KEY, JSON.stringify(allMonths))
  } catch {
    // ignore
  }
}

export function resetSalaryExtrasInStorage(monthKey: string, teacherId: number) {
  try {
    const raw = window.localStorage.getItem(TEACHER_SALARY_EXTRAS_STORAGE_KEY)
    const allMonths = raw ? (JSON.parse(raw) as Record<string, Record<number, TeacherSalaryExtras>>) : {}
    if (allMonths[monthKey]) {
      delete allMonths[monthKey][teacherId]
      window.localStorage.setItem(TEACHER_SALARY_EXTRAS_STORAGE_KEY, JSON.stringify(allMonths))
    }
  } catch {
    // ignore
  }
}

export function formatVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

type TeacherSalaryBonusPopoverProps = {
  teacherId: number
  teacherName: string
  monthKey: string
  displayMonth: string
  extras: TeacherSalaryExtras
  onUpdate: (updated: Partial<TeacherSalaryExtras>) => void
  onReset: () => void
  triggerVariant?: 'button' | 'badge' | 'compact'
  readOnly?: boolean
}

export function TeacherSalaryBonusPopover({
  teacherId: _teacherId,
  teacherName,
  monthKey: _monthKey,
  displayMonth,
  extras,
  onUpdate,
  onReset: _onReset,
  triggerVariant = 'button',
  readOnly = false,
}: TeacherSalaryBonusPopoverProps) {
  const [open, setOpen] = useState(false)
  const [aimAmountInput, setAimAmountInput] = useState<string>('')
  const [aimNoteInput, setAimNoteInput] = useState<string>('')
  const [upsaleAmountInput, setUpsaleAmountInput] = useState<string>('')
  const [upsaleNoteInput, setUpsaleNoteInput] = useState<string>('')

  useEffect(() => {
    if (open) {
      const effectiveAim =
        extras.aimBonusAmount !== undefined
          ? extras.aimBonusAmount
          : (extras.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE
      setAimAmountInput(effectiveAim > 0 ? String(effectiveAim) : '0')
      setAimNoteInput(extras.aimBonusNote || '')
      setUpsaleAmountInput(extras.upsaleAmount !== undefined ? String(extras.upsaleAmount) : '0')
      setUpsaleNoteInput(extras.upsaleNote || '')
    }
  }, [open, extras])

  const parsedAimAmount = Math.max(0, parseFloat(aimAmountInput) || 0)
  const parsedUpsaleAmount = Math.max(0, parseFloat(upsaleAmountInput) || 0)
  const totalBonus = parsedAimAmount + parsedUpsaleAmount

  const handleSave = () => {
    onUpdate({
      aimBonusAmount: parsedAimAmount,
      aimBonusNote: aimNoteInput.trim(),
      upsaleAmount: parsedUpsaleAmount,
      upsaleNote: upsaleNoteInput.trim(),
    })
    toast.success(`Đã cập nhật tiền thưởng cho GV ${teacherName}`)
    setOpen(false)
  }

  const handleClear = () => {
    onUpdate({
      aimBonusAmount: 0,
      aimBonusCount: 0,
      aimBonusNote: '',
      upsaleAmount: 0,
      upsaleNote: '',
    })
    setAimAmountInput('0')
    setAimNoteInput('')
    setUpsaleAmountInput('0')
    setUpsaleNoteInput('')
    toast.info(`Đã xoá tiền thưởng của GV ${teacherName}`)
    setOpen(false)
  }

  const currentTotal =
    (extras.aimBonusAmount ?? ((extras.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE)) +
    (extras.upsaleAmount || 0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerVariant === 'compact' ? (
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold transition shadow-2xs cursor-pointer',
              currentTotal > 0
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            )}
            title="Bấm để nhập Thưởng HV Aim Cao, Upsale/Referral"
          >
            <Gift className="size-3 text-amber-600" />
            <span>{currentTotal > 0 ? formatVND(currentTotal) : '+ Thưởng/Upsale'}</span>
          </button>
        ) : triggerVariant === 'badge' ? (
          <Badge
            variant="outline"
            className={cn(
              'cursor-pointer text-xs font-bold gap-1 px-2.5 py-1 transition hover:opacity-90',
              currentTotal > 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            )}
          >
            <Gift className="size-3 text-emerald-600" />
            <span>{currentTotal > 0 ? `Thưởng: ${formatVND(currentTotal)}` : '+ Thêm thưởng / Upsale'}</span>
          </Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              'h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer transition shadow-2xs',
              currentTotal > 0
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            )}
          >
            <Gift className="size-3.5 text-amber-600" />
            <span>{currentTotal > 0 ? `Thưởng: ${formatVND(currentTotal)}` : 'Điền Thưởng & Upsale'}</span>
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50 text-xs"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
          <div>
            <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
              <Gift className="size-4 text-amber-600" />
              <span>Thưởng Aim & Upsale — {teacherName}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Kỳ tính lương: <strong className="text-emerald-700">{displayMonth}</strong>
            </p>
          </div>
        </div>

        {readOnly ? (
          <div className="space-y-3 p-1">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Thưởng Aim:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatVND(extras.aimBonusAmount ?? ((extras.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE))}
                </span>
              </div>
              {extras.aimBonusNote && (
                <div className="text-[11px] text-slate-500 italic pl-2 border-l-2 border-emerald-300">
                  📝 {extras.aimBonusNote}
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200">
                <span className="font-semibold text-slate-600">Upsale / Referral:</span>
                <span className="font-mono font-bold text-amber-800">{formatVND(extras.upsaleAmount || 0)}</span>
              </div>
              {extras.upsaleNote && (
                <div className="text-[11px] text-slate-500 italic pl-2 border-l-2 border-amber-300">
                  📝 {extras.upsaleNote}
                </div>
              )}
              {extras.customAdjustment !== undefined && extras.customAdjustment !== 0 && (
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200">
                  <span className="font-semibold text-slate-600">Điều chỉnh khác:</span>
                  <span className={cn('font-mono font-bold', extras.customAdjustment < 0 ? 'text-rose-700' : 'text-blue-800')}>
                    {extras.customAdjustment > 0 ? `+${formatVND(extras.customAdjustment)}` : formatVND(extras.customAdjustment)}
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-xl bg-slate-900 p-2.5 text-white flex items-center justify-between text-xs">
              <span className="text-slate-300">Tổng phụ cấp & thưởng:</span>
              <strong className="text-amber-300 font-black font-mono">+{formatVND(currentTotal)}</strong>
            </div>
            <p className="text-[10px] text-slate-400 italic text-center">
              (Thưởng & phụ cấp do Admin và Sales cập nhật)
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* 1. Thưởng HV Aim Cao */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <Target className="size-3.5 text-emerald-600" />
                    <span>Thưởng HV Aim Cao (Speaking/Writing):</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Chuẩn: 300K/HV
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="50000"
                      value={aimAmountInput}
                      onChange={(e) => setAimAmountInput(e.target.value)}
                      className="h-8 bg-white border-emerald-300 font-black font-mono rounded-lg pr-7 text-xs"
                      placeholder="300000"
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">đ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAimAmountInput(String(parsedAimAmount + 300_000))}
                      className="h-8 px-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-[10px] border border-emerald-300 cursor-pointer"
                      title="Thêm 1 HV đạt aim (300k)"
                    >
                      +1 HV (300k)
                    </button>
                  </div>
                </div>
                <Input
                  type="text"
                  value={aimNoteInput}
                  onChange={(e) => setAimNoteInput(e.target.value)}
                  className="h-7 bg-white border-emerald-200 text-xs rounded-lg placeholder:text-slate-400"
                  placeholder="Ghi chú HV đạt aim (HV nào, band điểm...)"
                />
              </div>

              {/* 2. Upsale / Referral */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-extrabold text-amber-950 flex items-center gap-1.5">
                    <Coins className="size-3.5 text-amber-600" />
                    <span>Thưởng Upsale / Referral (Sales tự điền):</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    Tự nhập số tiền
                  </span>
                </div>
                <div className="mb-2">
                  <div className="relative mb-1.5">
                    <Input
                      type="number"
                      min="0"
                      step="50000"
                      value={upsaleAmountInput}
                      onChange={(e) => setUpsaleAmountInput(e.target.value)}
                      className="h-8 bg-white border-amber-300 font-black font-mono rounded-lg pr-7 text-xs"
                      placeholder="Nhập số tiền thưởng..."
                    />
                    <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">đ</span>
                  </div>
                  <Input
                    type="text"
                    value={upsaleNoteInput}
                    onChange={(e) => setUpsaleNoteInput(e.target.value)}
                    className="h-7 bg-white border-amber-200 text-xs rounded-lg placeholder:text-slate-400"
                    placeholder="Ghi chú (HV tái ký, khóa nào, % hoa hồng...)"
                  />
                </div>
              </div>

              {/* Summary box */}
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300">Tổng tiền thưởng:</span>
                  <strong className="text-amber-300 font-black text-sm font-mono">
                    +{formatVND(totalBonus)}
                  </strong>
                </div>
                <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 pt-1 border-t border-slate-800">
                  <span>Aim: {formatVND(parsedAimAmount)}</span>
                  <span>Upsale: {formatVND(parsedUpsaleAmount)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClear}
                className="h-8 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 cursor-pointer"
              >
                <RotateCcw className="size-3 mr-1" />
                Xóa về 0
              </Button>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
                >
                  <Check className="size-3.5 mr-1" />
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function evaluateMilestone(totalOpenSlots: number): {
  currentMilestone: SalaryMilestoneInfo
  isBelowBase: boolean
  nextMilestone: SalaryMilestoneInfo | null
  slotsToNext: number
  progressPct: number
} {
  if (totalOpenSlots >= 145) {
    return {
      currentMilestone: SALARY_MILESTONES[3],
      isBelowBase: false,
      nextMilestone: null,
      slotsToNext: 0,
      progressPct: 100,
    }
  }
  if (totalOpenSlots >= 110) {
    const next = SALARY_MILESTONES[3]
    const needed = next.monthlySlots - totalOpenSlots
    const progress = Math.round(((totalOpenSlots - 110) / (145 - 110)) * 100)
    return {
      currentMilestone: SALARY_MILESTONES[2],
      isBelowBase: false,
      nextMilestone: next,
      slotsToNext: needed,
      progressPct: Math.min(100, Math.max(0, progress)),
    }
  }
  if (totalOpenSlots >= 70) {
    const next = SALARY_MILESTONES[2]
    const needed = next.monthlySlots - totalOpenSlots
    const progress = Math.round(((totalOpenSlots - 70) / (110 - 70)) * 100)
    return {
      currentMilestone: SALARY_MILESTONES[1],
      isBelowBase: false,
      nextMilestone: next,
      slotsToNext: needed,
      progressPct: Math.min(100, Math.max(0, progress)),
    }
  }
  if (totalOpenSlots >= 40) {
    const next = SALARY_MILESTONES[1]
    const needed = next.monthlySlots - totalOpenSlots
    const progress = Math.round(((totalOpenSlots - 40) / (70 - 40)) * 100)
    return {
      currentMilestone: SALARY_MILESTONES[0],
      isBelowBase: false,
      nextMilestone: next,
      slotsToNext: needed,
      progressPct: Math.min(100, Math.max(0, progress)),
    }
  }

  // < 40 slots: applies base rate, progress towards 40
  const next = SALARY_MILESTONES[0]
  const needed = next.monthlySlots - totalOpenSlots
  const progress = Math.round((totalOpenSlots / 40) * 100)
  return {
    currentMilestone: SALARY_MILESTONES[0],
    isBelowBase: true,
    nextMilestone: next,
    slotsToNext: needed,
    progressPct: Math.min(100, Math.max(0, progress)),
  }
}

// ── Props ────────────────────────────────────────────────────────────────────

type SalaryCalculatorProps = {
  teacherId?: number
  teacherName?: string
  monthKey: string
  monthSummary: SchedulerProps['monthSummary']
  adminStats?: AdminTeacherStat[]
  mode?: 'teacher' | 'admin'
  role?: PersonRole
  studentTracking?: SchedulerProps['studentTracking']
  monthLessonSessions?: LessonSession[]
  onSwitchToTeacher?: (teacherId: number) => void
  onMonthChange?: (monthKey: string) => void
  onSelectStudentCode?: (studentCode: string) => void
  redirectParams?: Record<string, unknown>
}

export function SalaryCalculator({
  teacherId,
  teacherName,
  monthKey,
  monthSummary,
  adminStats = [],
  mode = 'teacher',
  role = 'teacher',
  studentTracking = [],
  monthLessonSessions = [],
  onSwitchToTeacher,
  onMonthChange,
  onSelectStudentCode,
  redirectParams,
}: SalaryCalculatorProps) {
  const currentTeacherId = teacherId ?? 1
  const canEditOverrides = role === 'admin' || role === 'sales'
  const [reconciliationDialogOpen, setReconciliationDialogOpen] = useState<boolean>(false)
  const [reconciliationTeacher, setReconciliationTeacher] = useState<{ id: number; name: string } | null>(null)

  const currentReconciliationTeacherId = reconciliationTeacher?.id ?? currentTeacherId
  const currentReconciliationTeacherName = reconciliationTeacher?.name ?? teacherName ?? 'Gia Sư'

  const currentTeacherMonthSessions = useMemo(() => {
    if (adminStats && adminStats.length > 0) {
      const found = adminStats.find((s) => s.teacherId === currentReconciliationTeacherId)
      if (found && (found as any).monthLessons && (found as any).monthLessons.length > 0) {
        return (found as any).monthLessons
      }
    }

    if (monthLessonSessions && monthLessonSessions.length > 0) {
      const filtered = monthLessonSessions.filter((s) => s.teacherId === currentReconciliationTeacherId)
      if (filtered.length > 0) return filtered
    }

    const list: any[] = []
    studentTracking.forEach((st) => {
      if (st.sessions) {
        st.sessions.forEach((sess) => {
          if (sess.scheduledOn && sess.scheduledOn.startsWith(monthKey) && (!sess.teacherId || sess.teacherId === currentReconciliationTeacherId)) {
            list.push({
              ...sess,
              studentName: st.studentName,
              studentCode: st.studentCode,
              courseName: st.course,
            })
          }
        })
      }
    })
    return list
  }, [adminStats, monthLessonSessions, studentTracking, currentReconciliationTeacherId, monthKey])

  // Compute GV completed ca from session data using same algorithm as reconciliation dialog
  // This ensures the badge number matches exactly what the dialog shows
  const gvCompletedCaFromSessions = useMemo(() => {
    // Gather sessions for the current teacher from all available sources
    let sessions: any[] = []

    if (adminStats && adminStats.length > 0) {
      const found = adminStats.find((s) => s.teacherId === currentTeacherId)
      if (found && (found as any).monthLessons && (found as any).monthLessons.length > 0) {
        sessions = (found as any).monthLessons
      }
    }

    if (sessions.length === 0 && monthLessonSessions && monthLessonSessions.length > 0) {
      sessions = monthLessonSessions.filter((s) => s.teacherId === currentTeacherId)
    }

    if (sessions.length === 0) {
      studentTracking.forEach((st) => {
        if (st.sessions) {
          st.sessions.forEach((sess) => {
            if (sess.scheduledOn && sess.scheduledOn.startsWith(monthKey) && (!sess.teacherId || sess.teacherId === currentTeacherId)) {
              sessions.push({ ...sess, courseName: st.course })
            }
          })
        }
      })
    }

    let sum = 0
    sessions.forEach((s: any) => {
      const lessonStatus = s.lessonStatus || s.lesson_status || ''
      if (lessonStatus === 'completed') {
        const dur = s.durationMinutes ?? s.duration_minutes ?? 40
        const dayLabel = s.dayLabel ?? s.day_label ?? ''
        const courseName = s.courseName ?? s.course_name ?? ''
        sum += getSessionCa(dur, dayLabel, courseName)
      }
    })
    return Math.round(sum * 10) / 10
  }, [adminStats, monthLessonSessions, studentTracking, currentTeacherId, monthKey])

  const [selectedRank, setSelectedRank] = useState<'standard' | 'expert'>(() =>
    getTeacherRankFromStorage(currentTeacherId)
  )
  const [adminTeacherRanks, setAdminTeacherRanks] = useState<Record<number, 'standard' | 'expert'>>(() => {
    const initial: Record<number, 'standard' | 'expert'> = {}
    adminStats.forEach((t) => {
      initial[t.teacherId] = getTeacherRankFromStorage(t.teacherId)
    })
    return initial
  })

  // Admin overrides for completed sessions (Số ca dạy thực tế)
  const [completedOverrides, setCompletedOverrides] = useState<Record<number, number>>(() =>
    getCompletedCaOverridesFromStorage(monthKey)
  )
  // Admin overrides for open slots (Số ca mở / đăng ký)
  const [openSlotsOverrides, setOpenSlotsOverrides] = useState<Record<number, number>>(() =>
    getOpenSlotsOverridesFromStorage(monthKey)
  )
  // Salary Extras (Demo sessions 100k, Aim bonus, Upsale/Referral + Notes)
  const [salaryExtras, setSalaryExtras] = useState<Record<number, TeacherSalaryExtras>>(() =>
    getSalaryExtrasFromStorage(monthKey)
  )
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [rowEditingId, setRowEditingId] = useState<number | null>(null)
  const [openEditingId, setOpenEditingId] = useState<number | null>(null)
  const [demoEditingId, setDemoEditingId] = useState<number | null>(null)

  useEffect(() => {
    setCompletedOverrides(getCompletedCaOverridesFromStorage(monthKey))
    setOpenSlotsOverrides(getOpenSlotsOverridesFromStorage(monthKey))
    setSalaryExtras(getSalaryExtrasFromStorage(monthKey))
    setRowEditingId(null)
    setOpenEditingId(null)
    setDemoEditingId(null)
  }, [monthKey])

  const handleUpdateCompletedCa = (tId: number, valStr: string) => {
    const parsed = parseFloat(valStr)
    if (valStr.trim() === '' || isNaN(parsed)) {
      setCompletedOverrides((prev) => {
        const next = { ...prev }
        delete next[tId]
        return next
      })
      saveCompletedCaOverrideToStorage(monthKey, tId, null)
    } else {
      setCompletedOverrides((prev) => ({ ...prev, [tId]: parsed }))
      saveCompletedCaOverrideToStorage(monthKey, tId, parsed)
    }
  }

  const handleResetCompletedCa = (tId: number) => {
    setCompletedOverrides((prev) => {
      const next = { ...prev }
      delete next[tId]
      return next
    })
    saveCompletedCaOverrideToStorage(monthKey, tId, null)
  }

  const handleUpdateOpenSlots = (tId: number, valStr: string) => {
    const parsed = parseFloat(valStr)
    if (valStr.trim() === '' || isNaN(parsed)) {
      setOpenSlotsOverrides((prev) => {
        const next = { ...prev }
        delete next[tId]
        return next
      })
      saveOpenSlotsOverrideToStorage(monthKey, tId, null)
    } else {
      setOpenSlotsOverrides((prev) => ({ ...prev, [tId]: parsed }))
      saveOpenSlotsOverrideToStorage(monthKey, tId, parsed)
    }
  }

  const handleResetOpenSlots = (tId: number) => {
    setOpenSlotsOverrides((prev) => {
      const next = { ...prev }
      delete next[tId]
      return next
    })
    saveOpenSlotsOverrideToStorage(monthKey, tId, null)
  }

  const handleUpdateExtras = (tId: number, data: Partial<TeacherSalaryExtras>) => {
    setSalaryExtras((prev) => {
      const next = { ...prev }
      next[tId] = { ...(next[tId] || {}), ...data }
      return next
    })
    saveSalaryExtrasToStorage(monthKey, tId, data)
  }

  const handleResetExtras = (tId: number) => {
    setSalaryExtras((prev) => {
      const next = { ...prev }
      delete next[tId]
      return next
    })
    resetSalaryExtrasInStorage(monthKey, tId)
  }

  const handleUpdateDemoCa = (tId: number, valStr: string) => {
    const parsed = Math.max(0, parseFloat(valStr) || 0)
    handleUpdateExtras(tId, { demoCa: parsed })
  }

  const handleSavePayslip = (tId: number, data: TeacherPayslipData) => {
    if (data.completedCa !== undefined && !isNaN(data.completedCa)) {
      setCompletedOverrides((prev) => ({ ...prev, [tId]: data.completedCa }))
      saveCompletedCaOverrideToStorage(monthKey, tId, data.completedCa)
    }
    const extrasPayload: Partial<TeacherSalaryExtras> = {
      demoCa: data.demoCa,
      aimBonusAmount: data.aimBonusAmount,
      aimBonusNote: data.aimBonusNote,
      upsaleAmount: data.upsaleAmount,
      upsaleNote: data.upsaleNote,
      customAdjustment: data.customAdjustment,
      customNote: data.customNote,
    }
    handleUpdateExtras(tId, extrasPayload)
  }

  // Simulating custom inputs
  const [simWeeklySlots, setSimWeeklySlots] = useState<number>(20)
  const [simRank, setSimRank] = useState<'standard' | 'expert'>('standard')
  const [aimBonusCount, setAimBonusCount] = useState<number>(0)

  const handleRankChange = (rank: 'standard' | 'expert') => {
    setSelectedRank(rank)
    saveTeacherRankToStorage(currentTeacherId, rank)
  }

  const handleAdminRankChange = (tId: number, rank: 'standard' | 'expert') => {
    setAdminTeacherRanks((prev) => ({ ...prev, [tId]: rank }))
    saveTeacherRankToStorage(tId, rank)
  }

  // Monthly open slots (Số ca mở sẵn sàng nhận HV trong tháng = totalCa, có thể override bởi Admin)
  const totalOpenSlots =
    openSlotsOverrides[currentTeacherId] !== undefined
      ? openSlotsOverrides[currentTeacherId]
      : monthSummary.totalCa
  const completedSlots =
    completedOverrides[currentTeacherId] !== undefined
      ? completedOverrides[currentTeacherId]
      : monthSummary.completedCa
  const bookedSlots = monthSummary.bookedCa

  const milestoneEval = useMemo(() => evaluateMilestone(totalOpenSlots), [totalOpenSlots])
  const currentRate = selectedRank === 'expert' ? milestoneEval.currentMilestone.expertRate : milestoneEval.currentMilestone.standardRate

  // Extras for current teacher (Demo 100k, Aim bonus, Upsale/Referral)
  const currentTeacherExtras = salaryExtras[currentTeacherId] || {}
  const currentDemoCa = currentTeacherExtras.demoCa ?? 0
  const currentDemoEarnings = currentDemoCa * DEMO_SESSION_RATE
  const currentAimBonus =
    currentTeacherExtras.aimBonusAmount !== undefined
      ? currentTeacherExtras.aimBonusAmount
      : (currentTeacherExtras.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE
  const currentUpsale = currentTeacherExtras.upsaleAmount ?? 0
  const currentCustom = currentTeacherExtras.customAdjustment || 0
  const currentTotalExtras = currentDemoEarnings + currentAimBonus + currentUpsale + currentCustom

  // Lương theo số ca thực dạy + Demo (100k) + Aim + Upsale/Referral
  const actualTeachingEarnings = completedSlots * currentRate
  const bookedTeachingEarnings = bookedSlots * currentRate
  const totalPayout = actualTeachingEarnings + currentTotalExtras

  // Simulation calculations
  const simMonthlySlots = Math.round(simWeeklySlots * 4)
  const simMilestoneEval = useMemo(() => evaluateMilestone(simMonthlySlots), [simMonthlySlots])
  const simRate = simRank === 'expert' ? simMilestoneEval.currentMilestone.expertRate : simMilestoneEval.currentMilestone.standardRate
  const sim85SlotsMonthly = Math.round(simMonthlySlots * 0.85)
  const sim85IncomeMonthly = sim85SlotsMonthly * simRate
  const sim85IncomeWeekly = Math.round(sim85IncomeMonthly / 4)

  // Format month for display
  const displayMonth = useMemo(() => {
    const [y, m] = monthKey.split('-')
    return `Tháng ${m}/${y}`
  }, [monthKey])

  // Month selector options
  const baseYear = useMemo(() => {
    const parsed = parseInt(monthKey.split('-')[0] || '2026', 10)
    return isNaN(parsed) ? 2026 : parsed
  }, [monthKey])

  const months = useMemo(() => [
    ...monthOptions(baseYear - 1),
    ...monthOptions(baseYear),
    ...monthOptions(baseYear + 1),
  ], [baseYear])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Highlight Banner / Policy Notice ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-black tracking-wide text-emerald-300 backdrop-blur-md border border-emerald-500/30">
                <Sparkles className="size-3.5" /> BẢNG RATE THỐNG NHẤT 2025–2026
              </span>
              <span className="text-xs font-semibold text-emerald-200/80">
                (Speaking = Writing • 40 phút/buổi)
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Hệ Thống Tính Lương & Milestone Giáo Viên
            </h1>
            <p className="max-w-2xl text-xs font-medium text-emerald-100/90 leading-relaxed">
              💡 <strong>Quy tắc tính rate:</strong> Milestone tính theo{' '}
              <span className="underline decoration-emerald-400 decoration-2 font-bold text-amber-300">
                số ca GV mở sẵn sàng nhận HV trong tháng
              </span>{' '}
              (không phải ca thực tế dạy). Tiền lương thực nhận = Số ca thực tế đã dạy × Rate của mốc đạt được.
            </p>
          </div>

          {/* Teacher rank selection toggle */}
          {mode === 'teacher' && (
            <div className="flex shrink-0 flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                <Award className="size-4 text-amber-300" />
                <span>Hạng Gia Sư của bạn:</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-black/20 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => handleRankChange('standard')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer',
                    selectedRank === 'standard'
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'text-emerald-200 hover:text-white'
                  )}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleRankChange('expert')}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1',
                    selectedRank === 'expert'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-amber-200 hover:text-white'
                  )}
                >
                  <span>⭐ Expert</span>
                </button>
              </div>
              <span className="text-[10px] text-emerald-200/70">
                {selectedRank === 'expert'
                  ? 'Đạt Pass demo ≥80%, Drop ≤15%, Aim ≥35%'
                  : 'Đạt Pass demo ≥60%, Drop ≤25%'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Month Selection Bar ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-5 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
            <CalendarDays className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Kỳ tính lương:</span>
              <span className="text-sm font-black text-emerald-800">{displayMonth}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Số ca mở, xếp hạng, mốc milestone và tiền lương được tính cho tháng này
            </div>
          </div>
        </div>

        {onMonthChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Chọn tháng khác:</span>
            <Select value={monthKey} onValueChange={onMonthChange}>
              <SelectTrigger
                aria-label="Chọn tháng tính lương"
                className="h-9 min-w-[150px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-black text-slate-800 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
              >
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent position="popper" className="rounded-xl text-xs max-h-64 z-50 bg-white shadow-md border border-slate-200">
                <SelectGroup>
                  {months.map((m) => (
                    <SelectItem key={m.key} value={m.key} className="text-xs font-bold py-1.5 cursor-pointer">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── KPI & Realtime Salary Cards for current teacher ────────────────────── */}
      {mode === 'teacher' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {/* Card 1: Milestone achieved */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mốc Lịch (Milestone)
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-xl px-2.5 py-1 text-xs font-black',
                  milestoneEval.currentMilestone.key === 'dedicated'
                    ? 'border-purple-300 bg-purple-50 text-purple-700'
                    : milestoneEval.currentMilestone.key === 'professional'
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : milestoneEval.currentMilestone.key === 'active'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-300 bg-slate-50 text-slate-700'
                )}
              >
                {milestoneEval.isBelowBase ? 'Dưới Mức Gốc' : milestoneEval.currentMilestone.name}
              </Badge>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900">{totalOpenSlots}</span>
                <span className="text-sm font-bold text-slate-500">ca mở (tab Đăng Ký Lịch)</span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {milestoneEval.nextMilestone ? (
                  <span>
                    Cần thêm{' '}
                    <strong className="text-emerald-700 font-extrabold">{milestoneEval.slotsToNext} ca</strong> để
                    lên mốc <strong>{milestoneEval.nextMilestone.name}</strong> ({milestoneEval.nextMilestone.monthlySlots} ca/tháng)
                  </span>
                ) : (
                  <span className="text-purple-600 font-bold">🎉 Đã đạt mốc cao nhất: Cống hiến!</span>
                )}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-2">
                <span title="Số ca book tính từ Lịch Sales">
                  📚 Book (Lịch Sales): <strong className="text-blue-700">{bookedSlots} ca</strong>
                </span>
                <span title="Fill Rate = (Ca Book Sales ÷ Ca Mở Đăng Ký) × 100%">
                  📈 Fill Rate: <strong className="text-indigo-700">{totalOpenSlots > 0 ? Math.round((bookedSlots / totalOpenSlots) * 100) : 0}%</strong>
                </span>
              </div>
            </div>

            {/* Progress bar to next milestone */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>Tiến độ mốc</span>
                <span>{milestoneEval.progressPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${milestoneEval.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Current Unit Rate */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Đơn Giá / Buổi Học
              </span>
              <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                Hạng {selectedRank === 'expert' ? 'Expert' : 'Standard'}
              </span>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-700">{formatVND(currentRate)}</span>
                <span className="text-xs font-bold text-slate-400">/ 40p</span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Áp dụng cho mọi buổi dạy (Speaking & Writing) trong tháng này.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-2 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
              <span>Mốc kế tiếp ({milestoneEval.nextMilestone?.name || 'Max'}):</span>
              <strong className="text-emerald-800">
                {milestoneEval.nextMilestone
                  ? formatVND(selectedRank === 'expert' ? milestoneEval.nextMilestone.expertRate : milestoneEval.nextMilestone.standardRate)
                  : 'Đạt tối đa'}
              </strong>
            </div>
          </div>

          {/* Card 3: Actual Teaching Salary */}
          <div className="flex flex-col justify-between rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Lương Ca Dạy Chính
              </span>
              <button
                type="button"
                onClick={() => {
                  setReconciliationTeacher({ id: currentTeacherId, name: teacherName || 'Gia Sư' })
                  setReconciliationDialogOpen(true)
                }}
                className="group flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[10px] font-black text-white transition-all cursor-pointer shadow-xs active:scale-95"
                title="Bấm để xem danh sách các ca dạy & đối soát khớp lệnh với CS"
              >
                <span>{gvCompletedCaFromSessions > 0 ? gvCompletedCaFromSessions : completedSlots} ca hoàn thành</span>
                <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-emerald-800">
                  {formatVND(actualTeachingEarnings)}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">
                {completedSlots} ca × {formatVND(currentRate)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-2 text-[11px] font-medium text-slate-600 border border-slate-100 flex items-center justify-between">
              <span title="Done Rate = (Ca Hoàn Thành ÷ Ca Book ở Lịch Sales) × 100%">
                🎯 Done Rate: <strong className="text-purple-700 font-bold">{bookedSlots > 0 ? Math.round((completedSlots / bookedSlots) * 100) : 0}%</strong>
              </span>
              <span className="text-slate-500">
                Chờ dạy: <strong className="text-blue-700 font-bold">{Math.max(0, Math.round((bookedSlots - completedSlots) * 10) / 10)} ca</strong>
              </span>
            </div>
          </div>

          {/* Card 4: Demo 100k + Aim Bonus + Upsale / Referral */}
          <div className="flex flex-col justify-between rounded-3xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Demo & Khoản Thưởng
              </span>
              <TeacherSalaryBonusPopover
                teacherId={currentTeacherId}
                teacherName={teacherName || 'Gia Sư'}
                monthKey={monthKey}
                displayMonth={displayMonth}
                extras={currentTeacherExtras}
                onUpdate={(data) => handleUpdateExtras(currentTeacherId, data)}
                onReset={() => handleResetExtras(currentTeacherId)}
                triggerVariant="compact"
                readOnly={!canEditOverrides}
              />
            </div>

            <div className="my-2 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-semibold" title="Ca dạy học thử, tính thù lao ca dạy">
                  Ca Demo (100k):
                </span>
                <div className="flex items-center gap-1.5">
                  <strong className="font-mono text-blue-800 font-bold">
                    {currentDemoCa} ca = {formatVND(currentDemoEarnings)}
                  </strong>
                  {canEditOverrides && (
                    <button
                      type="button"
                      onClick={() => {
                        const input = window.prompt(`Nhập số ca Demo của GV ${teacherName || 'Gia Sư'}:`, String(currentDemoCa))
                        if (input !== null) {
                          const parsed = Math.max(0, parseInt(input, 10) || 0)
                          handleUpdateDemoCa(currentTeacherId, String(parsed))
                        }
                      }}
                      title="Chỉnh sửa số ca Demo"
                      className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer transition"
                    >
                      <Edit className="size-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-600">Thưởng Aim:</span>
                <strong className="font-mono text-emerald-800 font-bold">
                  {formatVND(currentAimBonus)}
                </strong>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-slate-600">Upsale/Referral:</span>
                <strong className="font-mono text-amber-800 font-bold">
                  {formatVND(currentUpsale)}
                </strong>
              </div>
              {currentCustom !== 0 && (
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-600">Điều chỉnh khác:</span>
                  <strong className={cn('font-mono font-bold', currentCustom < 0 ? 'text-rose-700' : 'text-blue-800')}>
                    {currentCustom > 0 ? `+${formatVND(currentCustom)}` : formatVND(currentCustom)}
                  </strong>
                </div>
              )}
              {currentTeacherExtras.upsaleNote && (
                <div
                  className="text-[10px] text-amber-900 font-medium truncate pt-1 border-t border-amber-200/70 italic"
                  title={currentTeacherExtras.upsaleNote}
                >
                  📝 {currentTeacherExtras.upsaleNote}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white p-2 text-[11px] font-bold text-amber-900 border border-amber-200 flex items-center justify-between">
              <span>Tổng phụ cấp & thưởng:</span>
              <span className="text-xs font-mono font-black text-amber-800">
                +{formatVND(currentTotalExtras)}
              </span>
            </div>
          </div>

          {/* Card 5: Total Payout (Lương Thực Nhận) */}
          <div className="flex flex-col justify-between rounded-3xl border border-emerald-300 bg-gradient-to-br from-emerald-800 to-teal-900 p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
                TỔNG LƯƠNG THỰC LĨNH
              </span>
              <span className="rounded-full bg-emerald-500/30 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-black text-emerald-100">
                Thực tế {displayMonth}
              </span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-amber-300 font-mono">
                  {formatVND(totalPayout)}
                </span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-emerald-100/90 leading-relaxed">
                Ca chính ({formatVND(actualTeachingEarnings)})
                {currentDemoEarnings > 0 && ` + Demo (${formatVND(currentDemoEarnings)})`}
                {currentAimBonus + currentUpsale > 0 && ` + Thưởng (${formatVND(currentAimBonus + currentUpsale)})`}
                {currentCustom !== 0 && ` + Đ/chỉnh (${formatVND(currentCustom)})`}
              </p>
            </div>

            <div className="pt-2">
              <TeacherPayslipDialog
                teacherId={currentTeacherId}
                teacherName={teacherName || 'Gia Sư'}
                monthKey={monthKey}
                displayMonth={displayMonth}
                rank={selectedRank}
                milestoneName={milestoneEval.currentMilestone.name}
                rate={currentRate}
                completedCa={completedSlots}
                bookedCa={bookedSlots}
                openCa={totalOpenSlots}
                extras={currentTeacherExtras}
                canEdit={canEditOverrides}
                onSave={canEditOverrides ? ((data) => handleSavePayslip(currentTeacherId, data)) : undefined}
                trigger={
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 text-xs font-black transition cursor-pointer backdrop-blur-xs border border-white/20 shadow-xs"
                    title="Mở phiếu lương (Payslip) chính thức để in hoặc lưu trữ"
                  >
                    <span>🧾</span>
                    <span>Xem Phiếu Lương (Payslip)</span>
                  </button>
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ── BẢNG RATE & THU NHẬP CHUẨN (Khớp 100% Bảng Trong Ảnh 1) ───────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm">
                1
              </span>
              <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                BẢNG RATE THỐNG NHẤT & THU NHẬP GV DỰ KIẾN
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Chính sách thu nhập theo tuần và tháng với giả định 85% số buổi mở lịch được học viên book và diễn ra thành công.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Speaking = Writing (40 phút/buổi)
            </span>
          </div>
        </div>

        {/* ── Rate Table 1: Bảng Rate Thống Nhất ── */}
        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold">
                <th className="p-3 uppercase tracking-wider">Milestone</th>
                <th className="p-3 uppercase tracking-wider text-center">Buổi mở lịch / Tháng</th>
                <th className="p-3 uppercase tracking-wider text-center">Buổi mở lịch / Tuần</th>
                <th className="p-3 uppercase tracking-wider text-center bg-slate-800">
                  Standard Rate
                </th>
                <th className="p-3 uppercase tracking-wider text-center bg-emerald-800">
                  Expert Rate ⭐
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {SALARY_MILESTONES.map((m) => {
                const isCurrent = milestoneEval.currentMilestone.key === m.key && !milestoneEval.isBelowBase
                return (
                  <tr
                    key={m.key}
                    className={cn(
                      'transition-colors',
                      isCurrent
                        ? 'bg-emerald-50/80 font-bold'
                        : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                        )}
                        <span className={cn('font-black text-sm', isCurrent ? 'text-emerald-900' : 'text-slate-900')}>
                          {m.name}
                        </span>
                        {isCurrent && (
                          <span className="rounded-md bg-emerald-200 px-1.5 py-0.5 text-[10px] font-black text-emerald-900">
                            Mốc của bạn
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">
                      ≥ {m.monthlySlots} ca
                    </td>
                    <td className="p-3 text-center text-slate-600">
                      {m.weeklySlots} ca
                    </td>
                    <td className="p-3 text-center font-extrabold text-blue-800 bg-blue-50/30">
                      {formatVND(m.standardRate)}
                    </td>
                    <td className="p-3 text-center font-extrabold text-emerald-900 bg-emerald-50/50">
                      {formatVND(m.expertRate)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Table 2: Bảng Thu Nhập GV Dự Kiến (Khớp 100% Ảnh 1) ── */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
          <div className="bg-slate-800 px-4 py-2.5 text-white flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider">
              THU NHẬP GV DỰ KIẾN (Giả sử 85% buổi mở lịch được diễn ra, 40 phút/buổi)
            </span>
            <span className="text-[11px] text-slate-300 font-normal">
              Đơn vị: VNĐ / tháng
            </span>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                <th className="p-3">Milestone</th>
                <th className="p-3 text-center">Buổi mở lịch / Tháng</th>
                <th className="p-3 text-center">Buổi mở lịch / Tuần</th>
                <th className="p-3 text-center text-emerald-800">85% số buổi / Tháng</th>
                <th className="p-3 text-center text-emerald-800">85% số buổi / Tuần</th>
                <th className="p-3 text-right bg-blue-50/60 font-black text-blue-900">Standard (Dự kiến)</th>
                <th className="p-3 text-right bg-emerald-50/60 font-black text-emerald-950">Expert (Dự kiến) ⭐</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {SALARY_MILESTONES.map((m) => {
                const isCurrent = milestoneEval.currentMilestone.key === m.key && !milestoneEval.isBelowBase
                return (
                  <tr
                    key={m.key}
                    className={cn(
                      'transition-colors',
                      isCurrent ? 'bg-emerald-50/90 font-bold' : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="p-3 font-extrabold text-slate-900">
                      {m.name}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700">{m.monthlySlots}</td>
                    <td className="p-3 text-center text-slate-600">{m.weeklySlots}</td>
                    <td className="p-3 text-center font-bold text-emerald-800">{m.expectedMonthly85}</td>
                    <td className="p-3 text-center text-emerald-700">{m.expectedWeekly85}</td>
                    <td className="p-3 text-right font-black text-blue-800 bg-blue-50/40 text-sm">
                      {formatVND(m.standardIncome)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-900 bg-emerald-50/60 text-sm">
                      {formatVND(m.expertIncome)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CÔNG CỤ MÔ PHỎNG THU NHẬP TƯƠNG TÁC (Salary Simulator) ─────────────── */}
      <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/50 p-6 shadow-sm">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-sm shadow-xs">
              <Calculator className="size-4" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Công Cụ Mô Phỏng & Ước Tính Thu Nhập Theo Số Ca Đăng Ký
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kéo thanh trượt hoặc nhập số ca rảnh bạn dự kiến mở mỗi tuần để thấy ngay Milestone và Thu nhập tương ứng.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-600">Giả lập hạng:</span>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSimRank('standard')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all cursor-pointer',
                  simRank === 'standard' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                )}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setSimRank('expert')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-extrabold transition-all cursor-pointer',
                  simRank === 'expert' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600'
                )}
              >
                Expert ⭐
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
          {/* Controls */}
          <div className="space-y-4 lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">
                  Số ca mở rảnh mỗi tuần (Tuần trung bình):
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    step={1}
                    value={simWeeklySlots}
                    onChange={(e) => setSimWeeklySlots(Math.max(1, Number(e.target.value)))}
                    className="h-8 w-16 text-center font-black text-emerald-800 rounded-xl"
                  />
                  <span className="text-xs font-bold text-slate-500">ca / tuần</span>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={45}
                step={1}
                value={simWeeklySlots}
                onChange={(e) => setSimWeeklySlots(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>10 ca (Mức gốc)</span>
                <span>17.5 ca (Tích cực)</span>
                <span>27.5 ca (Chuyên nghiệp)</span>
                <span>36.25 ca (Cống hiến)</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">
                Ước tính tổng ca mở cả tháng (~4 tuần):
              </span>
              <strong className="font-black text-slate-900 text-sm">{simMonthlySlots} ca / tháng</strong>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-amber-50/70 p-3 border border-amber-200/80 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <Award className="size-4 text-amber-600" />
                <span>Số HV dự kiến đạt Aim thưởng (300k/HV):</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAimBonusCount(Math.max(0, aimBonusCount - 1))}
                  className="size-6 rounded-lg bg-white border border-amber-300 font-bold text-slate-700 hover:bg-amber-100"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold font-mono text-amber-900">
                  {aimBonusCount}
                </span>
                <button
                  type="button"
                  onClick={() => setAimBonusCount(aimBonusCount + 1)}
                  className="size-6 rounded-lg bg-white border border-amber-300 font-bold text-slate-700 hover:bg-amber-100"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className="lg:col-span-6 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-800 to-teal-900 p-5 text-white shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-700/50 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  Milestone Dự Kiến Đạt
                </span>
                <div className="text-xl font-black text-amber-300 flex items-center gap-2 mt-0.5">
                  <span>{simMilestoneEval.isBelowBase ? 'Dưới Mức Gốc' : simMilestoneEval.currentMilestone.name}</span>
                  <span className="text-xs font-normal text-white bg-white/20 px-2 py-0.5 rounded-full">
                    Rate: {formatVND(simRate)}/ca
                  </span>
                </div>
              </div>
              <Badge className="bg-emerald-500 text-white font-black text-xs px-2.5 py-1">
                Hạng {simRank === 'expert' ? 'Expert ⭐' : 'Standard'}
              </Badge>
            </div>

            <div className="my-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                <span className="block text-[11px] font-medium text-emerald-200">
                  Thu nhập Tuần (85% ca)
                </span>
                <strong className="text-lg font-black text-white">
                  {formatVND(sim85IncomeWeekly)}
                </strong>
                <span className="block text-[10px] text-emerald-300 font-mono">
                  ~{Math.round(simWeeklySlots * 0.85)} ca học/tuần
                </span>
              </div>

              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                <span className="block text-[11px] font-medium text-emerald-200">
                  Thu nhập Tháng (85% ca)
                </span>
                <strong className="text-xl font-black text-amber-300">
                  {formatVND(sim85IncomeMonthly)}
                </strong>
                <span className="block text-[10px] text-emerald-300 font-mono">
                  ~{sim85SlotsMonthly} ca học/tháng
                </span>
              </div>
            </div>

            {aimBonusCount > 0 && (
              <div className="mb-3 flex items-center justify-between rounded-xl bg-amber-400/20 px-3 py-1.5 text-xs text-amber-200 border border-amber-300/30">
                <span>Thưởng {aimBonusCount} học viên đạt aim:</span>
                <strong className="text-white">+{formatVND(aimBonusCount * 300_000)}</strong>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-medium text-emerald-200 pt-2 border-t border-emerald-700/50">
              <span>Nếu được book 100% số ca:</span>
              <strong className="text-white font-extrabold text-sm">
                {formatVND(simMonthlySlots * simRate + aimBonusCount * 300_000)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── BẢNG LƯƠNG TOÀN BỘ GIẢNG VIÊN (Dành cho Quản Lý / Admin) ─────────────── */}
      {mode === 'admin' && adminStats.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-sm">
                  2
                </span>
                <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                  BẢNG TỔNG HỢP LƯƠNG GIẢNG VIÊN TRUNG TÂM — {displayMonth}
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Tự động tổng hợp số ca mở, xác định mốc Milestone, đơn giá áp dụng và tiền lương thực tế của từng GV.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {onMonthChange && (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 h-8 text-xs font-bold text-slate-600 shadow-2xs">
                  <CalendarDays className="size-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-500 shrink-0">Tháng:</span>
                  <Select value={monthKey} onValueChange={onMonthChange}>
                    <SelectTrigger
                      aria-label="Chọn tháng bảng tổng hợp"
                      className="h-7 min-w-[110px] border-none bg-transparent p-0 text-xs font-black text-slate-900 shadow-none focus-visible:ring-0 cursor-pointer"
                    >
                      <SelectValue placeholder="Chọn tháng" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl text-xs max-h-64 z-50 bg-white shadow-md border border-slate-200">
                      <SelectGroup>
                        {months.map((m) => (
                          <SelectItem key={m.key} value={m.key} className="text-xs font-bold py-1.5 cursor-pointer">
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <span className="text-xs font-bold text-slate-600">
                Tổng số GV: <strong>{adminStats.length}</strong>
              </span>
              <Button
                type="button"
                size="sm"
                variant={isEditMode ? 'default' : 'outline'}
                onClick={() => {
                  setIsEditMode(!isEditMode)
                  setRowEditingId(null)
                  setOpenEditingId(null)
                }}
                className={cn(
                  'h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer transition shadow-2xs',
                  isEditMode
                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                )}
              >
                {isEditMode ? (
                  <>
                    <Check className="size-3.5" />
                    Hoàn tất điều chỉnh
                  </>
                ) : (
                  <>
                    <Edit className="size-3.5" />
                    Điền / Điều chỉnh ca (Mở & Hoàn thành)
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold text-[11px]">
                  <th className="py-2.5 px-3">Giảng Viên</th>
                  <th className="py-2.5 px-2 text-center">Hạng GV</th>
                  <th className="py-2.5 px-2 text-center" title="Số ca mở tính ở tab Đăng Ký Lịch (để tính mốc Milestone)">
                    Ca Mở (Đăng Ký)
                  </th>
                  <th className="py-2.5 px-2 text-center">Mốc Đạt</th>
                  <th className="py-2.5 px-2 text-center">Rate Áp Dụng</th>
                  <th className="py-2.5 px-2 text-center" title="Số ca hoàn thành (có thể điều chỉnh) / Số ca book ở Lịch Sales">
                    Hoàn Thành / Book
                  </th>
                  <th className="py-2.5 px-3 text-right text-slate-200" title="Lương ca chính = Số ca dạy thực tế × Rate áp dụng">
                    <div>Lương Ca Chính</div>
                    <div className="text-[9px] font-normal text-slate-400">Ca thực tế × Rate</div>
                  </th>
                  <th className="py-2.5 px-2 text-center text-blue-300" title="Ca Demo tính cố định 100.000đ/ca">
                    <div>Ca Demo (100k)</div>
                    <div className="text-[9px] font-normal text-blue-400">100.000đ/ca</div>
                  </th>
                  <th className="py-2.5 px-2 text-center text-amber-300" title="Thưởng học viên đạt Aim + Thưởng Upsale/Referral (kèm ghi chú)">
                    <div>Thưởng & Upsale</div>
                    <div className="text-[9px] font-normal text-amber-400">Aim + Upsale</div>
                  </th>
                  <th className="py-2.5 px-3 text-right text-emerald-300" title="Tổng Lương Thực Nhận = Lương ca chính + Tiền demo (100k) + Thưởng Aim + Upsale/Referral">
                    <div>Tổng Lương Thực Nhận</div>
                    <div className="text-[9px] font-normal text-emerald-400">Chính + Demo + Thưởng</div>
                  </th>
                  <th className="py-2.5 px-2 text-center text-sky-300" title="Mở phiếu lương chuẩn hóa (Payslip) để xem, chỉnh sửa số liệu và in/xuất PDF">
                    <div>Phiếu Lương</div>
                    <div className="text-[9px] font-normal text-sky-400">Payslip</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {adminStats.map((stat) => {
                  const teacherRank = adminTeacherRanks[stat.teacherId] || 'standard'
                  const isOverriddenOpen = openSlotsOverrides[stat.teacherId] !== undefined
                  const effectiveTotalOpenSlots = isOverriddenOpen
                    ? openSlotsOverrides[stat.teacherId]
                    : stat.monthSummary.totalCa

                  const mEval = evaluateMilestone(effectiveTotalOpenSlots)
                  const rate = teacherRank === 'expert' ? mEval.currentMilestone.expertRate : mEval.currentMilestone.standardRate
                  const isOverridden = completedOverrides[stat.teacherId] !== undefined
                  const effectiveCompletedCa = isOverridden
                    ? completedOverrides[stat.teacherId]
                    : stat.monthSummary.completedCa
                  const actualSalary = effectiveCompletedCa * rate

                  // Extras: Demo 100k, Aim bonus, Upsale/Referral, Custom + Notes
                  const extra = salaryExtras[stat.teacherId] || {}
                  const demoCa = extra.demoCa ?? 0
                  const demoEarnings = demoCa * DEMO_SESSION_RATE
                  const aimBonus =
                    extra.aimBonusAmount !== undefined
                      ? extra.aimBonusAmount
                      : (extra.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE
                  const upsaleAmount = extra.upsaleAmount ?? 0
                  const customAdjustment = extra.customAdjustment || 0
                  const totalBonus = aimBonus + upsaleAmount
                  const totalPayout = actualSalary + demoEarnings + totalBonus + customAdjustment

                  const isEditingThisRow = isEditMode || rowEditingId === stat.teacherId
                  const isEditingOpenThisRow = isEditMode || openEditingId === stat.teacherId
                  const isEditingDemoThisRow = isEditMode || demoEditingId === stat.teacherId
                  const effectiveBookRatio = effectiveTotalOpenSlots > 0
                    ? Math.round((stat.monthSummary.bookedCa / effectiveTotalOpenSlots) * 100)
                    : 0

                  return (
                    <tr key={stat.teacherId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3">
                        <div className="font-extrabold text-slate-900 text-sm leading-tight">{stat.teacherName}</div>
                        <div className="mt-0.5">
                          <TeacherStudentsDropdown
                            stat={stat}
                            monthKey={monthKey}
                            displayMonth={displayMonth}
                            redirectParams={redirectParams}
                            onSelectStudentCode={onSelectStudentCode}
                          />
                        </div>
                      </td>

                      <td className="py-2 px-2 text-center">
                        <select
                          value={teacherRank}
                          onChange={(e) =>
                            handleAdminRankChange(stat.teacherId, e.target.value as 'standard' | 'expert')
                          }
                          className={cn(
                            'rounded-md px-1.5 py-0.5 text-xs font-bold border cursor-pointer',
                            teacherRank === 'expert'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-50 text-slate-700 border-slate-300'
                          )}
                        >
                          <option value="standard">Standard</option>
                          <option value="expert">Expert ⭐</option>
                        </select>
                      </td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">
                        {isEditingOpenThisRow ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={
                                isOverriddenOpen
                                  ? openSlotsOverrides[stat.teacherId]
                                  : stat.monthSummary.totalCa
                              }
                              onChange={(e) =>
                                handleUpdateOpenSlots(stat.teacherId, e.target.value)
                              }
                              className="h-7 w-16 text-center font-mono font-black text-xs bg-white border-blue-400 focus:ring-blue-500 rounded-lg px-1 shadow-2xs"
                              placeholder="Ca mở"
                              autoFocus={openEditingId === stat.teacherId}
                            />
                            {openEditingId === stat.teacherId && !isEditMode && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setOpenEditingId(null)}
                                className="h-6 px-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                                title="Xong"
                              >
                                <Check className="size-3" />
                              </Button>
                            )}
                            {isOverriddenOpen && (
                              <button
                                type="button"
                                onClick={() => handleResetOpenSlots(stat.teacherId)}
                                title="Khôi phục số ca mở hệ thống tự tính"
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                              >
                                <RotateCcw className="size-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="group flex items-center justify-center gap-1">
                            <span
                              className={cn(
                                'font-black font-mono text-xs',
                                isOverriddenOpen ? 'text-blue-700 font-extrabold' : 'text-slate-900'
                              )}
                            >
                              {effectiveTotalOpenSlots} ca
                            </span>
                            <button
                              type="button"
                              onClick={() => setOpenEditingId(stat.teacherId)}
                              title="Bấm để sửa số ca mở của GV này"
                              className="opacity-40 group-hover:opacity-100 hover:text-blue-700 p-0.5 rounded transition cursor-pointer"
                            >
                              <Edit className="size-3 text-slate-400 group-hover:text-blue-600" />
                            </button>
                          </div>
                        )}
                        <div
                          className="text-[10px] text-blue-700 font-semibold"
                          title="Fill Rate = (Ca Book Sales ÷ Ca Mở Đăng Ký) × 100%"
                        >
                          Fill {effectiveBookRatio}%
                        </div>
                      </td>

                      <td className="py-2 px-2 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5',
                            mEval.currentMilestone.key === 'dedicated'
                              ? 'border-purple-300 bg-purple-50 text-purple-700'
                              : mEval.currentMilestone.key === 'professional'
                              ? 'border-blue-300 bg-blue-50 text-blue-700'
                              : mEval.currentMilestone.key === 'active'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-slate-300 bg-slate-50 text-slate-700'
                          )}
                        >
                          {mEval.isBelowBase ? 'Dưới gốc' : mEval.currentMilestone.name}
                        </Badge>
                      </td>

                      <td className="py-2 px-2 text-center font-bold text-emerald-800 font-mono text-xs">
                        {formatVND(rate)}
                      </td>

                      <td className="py-2 px-2 text-center">
                        {isEditingThisRow ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              value={isOverridden ? completedOverrides[stat.teacherId] : stat.monthSummary.completedCa}
                              onChange={(e) => handleUpdateCompletedCa(stat.teacherId, e.target.value)}
                              className="h-7 w-16 text-center font-mono font-black text-xs bg-white border-amber-400 focus:ring-amber-500 rounded-lg px-1 shadow-2xs"
                              placeholder="Số ca"
                              autoFocus={rowEditingId === stat.teacherId}
                            />
                            <span className="text-slate-400 text-xs font-normal">/ {stat.monthSummary.bookedCa}</span>
                            {rowEditingId === stat.teacherId && !isEditMode && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setRowEditingId(null)}
                                className="h-6 px-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                                title="Xong"
                              >
                                <Check className="size-3" />
                              </Button>
                            )}
                            {isOverridden && (
                              <button
                                type="button"
                                onClick={() => handleResetCompletedCa(stat.teacherId)}
                                title="Khôi phục số ca hệ thống tự tính"
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                              >
                                <RotateCcw className="size-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="group flex items-center justify-center gap-1">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setReconciliationTeacher({ id: stat.teacherId, name: stat.teacherName })
                                  setReconciliationDialogOpen(true)
                                }}
                                className={cn(
                                  'font-black font-mono text-xs underline decoration-dotted underline-offset-2 hover:text-emerald-700 cursor-pointer transition',
                                  isOverridden ? 'text-amber-700 font-extrabold' : 'text-slate-900'
                                )}
                                title="Bấm để xem chi tiết các ca & khớp lệnh tính lương của GV này"
                              >
                                {effectiveCompletedCa}
                              </button>
                              <span className="text-slate-400 font-normal text-xs"> / {stat.monthSummary.bookedCa}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRowEditingId(stat.teacherId)}
                              title="Bấm để sửa số ca hoàn thành của GV này"
                              className="opacity-40 group-hover:opacity-100 hover:text-amber-700 p-0.5 rounded transition cursor-pointer"
                            >
                              <Edit className="size-3 text-slate-500 group-hover:text-amber-600" />
                            </button>
                          </div>
                        )}
                        <div
                          className="text-[10px] text-purple-700 font-semibold"
                          title="Done Rate = (Ca Hoàn Thành ÷ Ca Book Sales) × 100%"
                        >
                          Done{' '}
                          {stat.monthSummary.bookedCa > 0
                            ? Math.round((effectiveCompletedCa / stat.monthSummary.bookedCa) * 100)
                            : 0}
                          %
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right font-bold text-slate-800 font-mono text-xs">
                        {formatVND(actualSalary)}
                      </td>

                      <td className="py-2 px-2 text-center">
                        {isEditingDemoThisRow ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={extra.demoCa !== undefined ? extra.demoCa : 0}
                              onChange={(e) => handleUpdateDemoCa(stat.teacherId, e.target.value)}
                              className="h-7 w-14 text-center font-mono font-black text-xs bg-white border-blue-400 focus:ring-blue-500 rounded-lg px-1 shadow-2xs"
                              placeholder="0"
                              autoFocus={demoEditingId === stat.teacherId}
                            />
                            <span className="text-[11px] font-bold text-slate-500">ca</span>
                            {demoEditingId === stat.teacherId && !isEditMode && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setDemoEditingId(null)}
                                className="h-6 px-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50"
                                title="Xong"
                              >
                                <Check className="size-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="group flex flex-col items-center justify-center">
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  'font-mono text-xs',
                                  demoCa > 0 ? 'font-black text-blue-700' : 'text-slate-500'
                                )}
                              >
                                {demoCa} ca
                              </span>
                              <button
                                type="button"
                                onClick={() => setDemoEditingId(stat.teacherId)}
                                title="Bấm để sửa số ca demo của GV này"
                                className="opacity-40 group-hover:opacity-100 hover:text-blue-700 p-0.5 rounded cursor-pointer"
                              >
                                <Edit className="size-3 text-slate-400 group-hover:text-blue-600" />
                              </button>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 font-medium">
                              {formatVND(demoEarnings)}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <TeacherSalaryBonusPopover
                            teacherId={stat.teacherId}
                            teacherName={stat.teacherName}
                            monthKey={monthKey}
                            displayMonth={displayMonth}
                            extras={extra}
                            onUpdate={(data) => handleUpdateExtras(stat.teacherId, data)}
                            onReset={() => handleResetExtras(stat.teacherId)}
                            triggerVariant="compact"
                          />
                          {(extra.upsaleNote || extra.aimBonusNote) && (
                            <div
                              className="text-[10px] text-amber-900 font-medium max-w-[130px] truncate cursor-help border-b border-dotted border-amber-300 italic"
                              title={`Ghi chú:\n${extra.upsaleNote ? `• Upsale: ${extra.upsaleNote}\n` : ''}${extra.aimBonusNote ? `• Aim: ${extra.aimBonusNote}` : ''}`}
                            >
                              📝 {extra.upsaleNote || extra.aimBonusNote}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="font-black text-emerald-800 font-mono text-xs">
                          {formatVND(totalPayout)}
                        </div>
                        <div className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5">
                          Dạy {formatVND(actualSalary)}
                          {demoEarnings > 0 && ` + Demo ${formatVND(demoEarnings)}`}
                          {totalBonus > 0 && ` + Thưởng ${formatVND(totalBonus)}`}
                          {customAdjustment !== 0 && ` + Đ/c ${formatVND(customAdjustment)}`}
                        </div>
                      </td>

                      <td className="py-2 px-2 text-center">
                        <TeacherPayslipDialog
                          teacherId={stat.teacherId}
                          teacherName={stat.teacherName}
                          monthKey={monthKey}
                          displayMonth={displayMonth}
                          rank={teacherRank}
                          milestoneName={mEval.currentMilestone.name}
                          rate={rate}
                          completedCa={effectiveCompletedCa}
                          bookedCa={stat.monthSummary.bookedCa}
                          openCa={effectiveTotalOpenSlots}
                          extras={extra}
                          canEdit={canEditOverrides}
                          onSave={(data) => handleSavePayslip(stat.teacherId, data)}
                          trigger={
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[11px] font-black gap-1 rounded-lg bg-sky-50 text-blue-900 border-sky-300 hover:bg-[#0f4c81] hover:text-white hover:border-[#0f4c81] shadow-2xs transition-all cursor-pointer"
                              title={`Mở phiếu lương (Payslip) cho GV ${stat.teacherName}`}
                            >
                              <span>🧾</span>
                              <span>Payslip</span>
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                  <td className="py-2.5 px-3" colSpan={2}>
                    TỔNG CỘNG TRUNG TÂM
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono">
                    {adminStats.reduce((s, t) => {
                      const effOpen =
                        openSlotsOverrides[t.teacherId] !== undefined
                          ? openSlotsOverrides[t.teacherId]
                          : t.monthSummary.totalCa
                      return s + effOpen
                    }, 0)}{' '}
                    ca mở
                  </td>
                  <td className="py-2.5 px-2" />
                  <td className="py-2.5 px-2" />
                  <td className="py-2.5 px-2 text-center font-mono">
                    {adminStats.reduce((s, stat) => {
                      const eff =
                        completedOverrides[stat.teacherId] !== undefined
                          ? completedOverrides[stat.teacherId]
                          : stat.monthSummary.completedCa
                      return s + eff
                    }, 0)}{' '}
                    ca hoàn thành
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-800 font-mono text-xs font-black">
                    {formatVND(
                      adminStats.reduce((sum, stat) => {
                        const rank = adminTeacherRanks[stat.teacherId] || 'standard'
                        const effOpen =
                          openSlotsOverrides[stat.teacherId] !== undefined
                            ? openSlotsOverrides[stat.teacherId]
                            : stat.monthSummary.totalCa
                        const mEval = evaluateMilestone(effOpen)
                        const rate =
                          rank === 'expert'
                            ? mEval.currentMilestone.expertRate
                            : mEval.currentMilestone.standardRate
                        const eff =
                          completedOverrides[stat.teacherId] !== undefined
                            ? completedOverrides[stat.teacherId]
                            : stat.monthSummary.completedCa
                        return sum + eff * rate
                      }, 0)
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center text-blue-800 font-mono text-xs font-black">
                    <div>
                      {adminStats.reduce((sum, stat) => {
                        const ext = salaryExtras[stat.teacherId] || {}
                        return sum + (ext.demoCa || 0)
                      }, 0)}{' '}
                      ca demo
                    </div>
                    <div className="text-[10px] text-blue-700 font-normal">
                      {formatVND(
                        adminStats.reduce((sum, stat) => {
                          const ext = salaryExtras[stat.teacherId] || {}
                          return sum + (ext.demoCa || 0) * DEMO_SESSION_RATE
                        }, 0)
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center text-amber-800 font-mono text-xs font-black">
                    {formatVND(
                      adminStats.reduce((sum, stat) => {
                        const ext = salaryExtras[stat.teacherId] || {}
                        const aim =
                          ext.aimBonusAmount !== undefined
                            ? ext.aimBonusAmount
                            : (ext.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE
                        const ups = ext.upsaleAmount || 0
                        return sum + aim + ups
                      }, 0)
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-800 font-mono text-sm font-black">
                    {formatVND(
                      adminStats.reduce((sum, stat) => {
                        const rank = adminTeacherRanks[stat.teacherId] || 'standard'
                        const effOpen =
                          openSlotsOverrides[stat.teacherId] !== undefined
                            ? openSlotsOverrides[stat.teacherId]
                            : stat.monthSummary.totalCa
                        const mEval = evaluateMilestone(effOpen)
                        const rate =
                          rank === 'expert'
                            ? mEval.currentMilestone.expertRate
                            : mEval.currentMilestone.standardRate
                        const eff =
                          completedOverrides[stat.teacherId] !== undefined
                            ? completedOverrides[stat.teacherId]
                            : stat.monthSummary.completedCa
                        const teachSal = eff * rate
                        const ext = salaryExtras[stat.teacherId] || {}
                        const demoSal = (ext.demoCa || 0) * DEMO_SESSION_RATE
                        const aim =
                          ext.aimBonusAmount !== undefined
                            ? ext.aimBonusAmount
                            : (ext.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE
                        const ups = ext.upsaleAmount || 0
                        const custom = ext.customAdjustment || 0
                        return sum + teachSal + demoSal + aim + ups + custom
                      }, 0)
                    )}
                  </td>
                  <td className="py-2.5 px-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Dialog Đối Soát Ca Dạy & Khớp Lệnh Lương GV - CS ── */}
      <CompletedSessionsReconciliationDialog
        open={reconciliationDialogOpen}
        onOpenChange={setReconciliationDialogOpen}
        teacherId={currentReconciliationTeacherId}
        teacherName={currentReconciliationTeacherName}
        monthKey={monthKey}
        displayMonth={displayMonth}
        sessions={currentTeacherMonthSessions}
        role={role || (mode === 'admin' ? 'admin' : 'teacher')}
        redirectParams={redirectParams as any}
      />
    </div>
  )
}
