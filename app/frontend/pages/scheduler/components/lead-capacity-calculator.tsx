import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Calculator,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  Layers,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type LeadCapacityCalculatorProps = {
  autoEmptySlots?: number
  autoEmptySource?: string
  autoActiveTeachers?: number
  autoRegisteredCapacitySlots?: number
  onViewSchedule?: () => void
  initialEmptySlots?: number
  className?: string
  isDialog?: boolean
}

export function LeadCapacityCalculator({
  autoEmptySlots = 46,
  autoEmptySource = 'Teaching schedule / Lịch đăng ký hệ thống',
  autoActiveTeachers = 5,
  autoRegisteredCapacitySlots = 150,
  onViewSchedule,
  className,
}: LeadCapacityCalculatorProps) {
  // ── Auto vs Manual Mode State ──────────────────────────────────────────────
  const [availableSlotsMode, setAvailableSlotsMode] = useState<'auto' | 'manual'>('auto')
  const [manualAvailableSlots, setManualAvailableSlots] = useState<number>(autoEmptySlots)
  // Đơn vị slot trống đầu vào (Tháng vs Tuần, data hệ thống mặc định là Tháng)
  const [emptySlotsUnit, setEmptySlotsUnit] = useState<'month' | 'week'>('month')

  // Số lượng giảng viên: Đang có + Sắp có (tuyển thêm)
  const [currentTeachers, setCurrentTeachers] = useState<number>(autoActiveTeachers)
  const [futureTeachers, setFutureTeachers] = useState<number>(2) // 2 GV sắp có như trong ảnh

  // Chế độ tính tổng capacity:
  // 'total_capacity': Toàn bộ capacity đội ngũ GV = (GV đang có + GV sắp có) × Capacity/GV (Default)
  // 'empty_and_new': Chỉ bù Slot trống hiện tại + Capacity GV sắp có
  const [calculationScope, setCalculationScope] = useState<'total_capacity' | 'empty_and_new'>('total_capacity')

  const [capacityInputMode, setCapacityInputMode] = useState<'manual_hours' | 'manual_slots' | 'current_reg'>('manual_hours')
  const [manualTeachingHours, setManualTeachingHours] = useState<number>(25) // Chuẩn: 25 tiếng/GV/tuần
  const [manualTeachingSlots, setManualTeachingSlots] = useState<number>(37.5)

  const [slotDuration, setSlotDuration] = useState<number>(40)
  const [conversionRate, setConversionRate] = useState<number>(30) // percentage 30 = 30%

  // Course duration range (Default: 8 - 13 sessions, avg: 10.5)
  const [minCourseSessions, setMinCourseSessions] = useState<number>(8)
  const [maxCourseSessions, setMaxCourseSessions] = useState<number>(13)

  const [customFrequency, setCustomFrequency] = useState<string>('')
  const [showFormula, setShowFormula] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [lastRefreshed, setLastRefreshed] = useState<string>(() => {
    const now = new Date()
    return `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  })

  // ── Calculation Logic ──────────────────────────────────────────────────────
  const calculations = useMemo(() => {
    // 1. Available slots currently (Slot trống hiện tại trên lịch)
    const activeEmptySlots = availableSlotsMode === 'auto'
      ? Math.max(0, autoEmptySlots)
      : Math.max(0, manualAvailableSlots)

    // Quy đổi slot trống theo tháng và theo tuần
    const monthlyEmptySlots = emptySlotsUnit === 'month'
      ? activeEmptySlots
      : Math.round(activeEmptySlots * 4 * 10) / 10

    const weeklyEmptySlots = emptySlotsUnit === 'week'
      ? activeEmptySlots
      : Math.round((activeEmptySlots / 4) * 10) / 10

    // 2. Slot duration & CR
    const validDuration = Math.max(1, slotDuration)
    const validCR = Math.min(100, Math.max(0.1, conversionRate)) / 100

    // 3. Teachers count (Đang có + Sắp có)
    const numCurrent = Math.max(0, currentTeachers)
    const numFuture = Math.max(0, futureTeachers)
    const totalTeachers = numCurrent + numFuture

    // 4. Capacity per teacher (ca/GV/tuần, ca/GV/tháng & giờ/GV/tuần)
    let slotsPerTeacher = 0
    let hoursPerTeacher = 0

    if (capacityInputMode === 'manual_hours') {
      hoursPerTeacher = Math.max(0, manualTeachingHours)
      slotsPerTeacher = (hoursPerTeacher * 60) / validDuration
    } else if (capacityInputMode === 'manual_slots') {
      slotsPerTeacher = Math.max(0, manualTeachingSlots)
      hoursPerTeacher = (slotsPerTeacher * validDuration) / 60
    } else {
      // current_reg: autoRegisteredCapacitySlots tổng chia cho số GV hiện tại
      slotsPerTeacher = numCurrent > 0 ? autoRegisteredCapacitySlots / numCurrent : 37.5
      hoursPerTeacher = (slotsPerTeacher * validDuration) / 60
    }

    const roundedSlotsPerTeacher = Math.round(slotsPerTeacher * 10) / 10
    const slotsPerTeacherMonth = Math.round(slotsPerTeacher * 4 * 10) / 10

    // Capacity breakdown theo tuần và theo tháng
    const currentTeachersCapacitySlots = Math.round(numCurrent * slotsPerTeacher * 10) / 10
    const currentTeachersCapacityMonthly = Math.round(numCurrent * slotsPerTeacherMonth * 10) / 10

    const futureTeachersCapacitySlots = Math.round(numFuture * slotsPerTeacher * 10) / 10
    const futureTeachersCapacityMonthly = Math.round(numFuture * slotsPerTeacherMonth * 10) / 10

    const totalTeachersCapacitySlots = Math.round(totalTeachers * slotsPerTeacher * 10) / 10
    const totalTeachersCapacityMonthly = Math.round(totalTeachers * slotsPerTeacherMonth * 10) / 10

    const totalTeachingHours = Math.round(totalTeachers * hoursPerTeacher * 10) / 10
    const totalTeachingHoursMonthly = Math.round(totalTeachingHours * 4 * 10) / 10

    // 5. Total Capacity to Fill (Cả theo Tuần và theo Tháng)
    // Mode 'total_capacity': 25 tiếng/GV/tuần × (tổng GV đang có + sắp có)
    // Mode 'empty_and_new': Slot trống hiện tại + Capacity GV sắp có
    const totalWeeklySlotsToFill = calculationScope === 'total_capacity'
      ? totalTeachersCapacitySlots
      : Math.round((weeklyEmptySlots + futureTeachersCapacitySlots) * 10) / 10

    const totalMonthlySlotsToFill = calculationScope === 'total_capacity'
      ? totalTeachersCapacityMonthly
      : Math.round((monthlyEmptySlots + futureTeachersCapacityMonthly) * 10) / 10

    // 6. Course Length statistics
    const validMinCourse = Math.max(1, Math.min(minCourseSessions, maxCourseSessions))
    const validMaxCourse = Math.max(validMinCourse, maxCourseSessions)
    const avgCourseLength = (validMinCourse + validMaxCourse) / 2

    // Helper to calculate initial fill & monthly replacement for a given sessions/week
    const calculateForFrequency = (freq: number) => {
      const validFreq = Math.max(0.1, freq)

      // QUY TẮC TIÊU HAO SLOT THEO DATA:
      // 1 HV học `validFreq` buổi/tuần:
      // - 1 tuần mất `validFreq` slot
      // - 1 THÁNG (4 tuần) mất `validFreq * 4` slots (1 buổi/tuần mất 4 slot/tháng; 2 buổi/tuần mất 8 slot/tháng)
      const weeklySlotsPerStudent = validFreq
      const monthlySlotsPerStudent = Math.round(validFreq * 4 * 10) / 10

      // Part A: Fill Capacity Ban Đầu
      // Số HV cần = Tổng slots tháng ÷ Slot tháng mỗi HV chiếm (hoặc Tổng slots tuần ÷ Slot tuần mỗi HV chiếm)
      const studentsNeeded = Math.round((totalMonthlySlotsToFill / monthlySlotsPerStudent) * 10) / 10
      const initialLeads = Math.ceil(studentsNeeded / validCR)

      // Tổng số slot tháng tiêu hao
      const totalMonthlySlotsConsumed = Math.round(studentsNeeded * monthlySlotsPerStudent * 10) / 10

      // Part B: Duy trì Full Capacity hàng tháng
      // Thời gian hoàn thành khóa = avgCourseLength / validFreq (tuần)
      const avgActiveWeeks = avgCourseLength / validFreq
      const avgActiveMonths = Math.round((avgCourseLength / monthlySlotsPerStudent) * 10) / 10
      const monthlyStudentsReplaced = Math.round((totalMonthlySlotsToFill / avgCourseLength) * 10) / 10
      const monthlyLeadsNeeded = Math.ceil(monthlyStudentsReplaced / validCR)

      // Range Forecast for this frequency
      const bestActiveWeeks = validMaxCourse / validFreq
      const bestActiveMonths = Math.round((validMaxCourse / monthlySlotsPerStudent) * 10) / 10
      const bestMonthlyStudents = Math.round((totalMonthlySlotsToFill / validMaxCourse) * 10) / 10
      const bestMonthlyLeads = Math.ceil(bestMonthlyStudents / validCR)

      const worstActiveWeeks = validMinCourse / validFreq
      const worstActiveMonths = Math.round((validMinCourse / monthlySlotsPerStudent) * 10) / 10
      const worstMonthlyStudents = Math.round((totalMonthlySlotsToFill / validMinCourse) * 10) / 10
      const worstMonthlyLeads = Math.ceil(worstMonthlyStudents / validCR)

      return {
        freq: validFreq,
        weeklySlotsPerStudent,
        monthlySlotsPerStudent,
        studentsNeeded,
        initialLeads,
        totalMonthlySlotsConsumed,
        avgActiveWeeks: Math.round(avgActiveWeeks * 10) / 10,
        avgActiveMonths,
        monthlyStudentsReplaced,
        monthlyLeadsNeeded,
        bestActiveWeeks: Math.round(bestActiveWeeks * 10) / 10,
        bestActiveMonths,
        bestMonthlyStudents,
        bestMonthlyLeads,
        worstActiveWeeks: Math.round(worstActiveWeeks * 10) / 10,
        worstActiveMonths,
        worstMonthlyStudents,
        worstMonthlyLeads,
      }
    }

    const sc1 = calculateForFrequency(1)
    const sc2 = calculateForFrequency(2)

    let scCustom = null
    const parsedCustom = parseFloat(customFrequency)
    if (!isNaN(parsedCustom) && parsedCustom > 0) {
      scCustom = calculateForFrequency(parsedCustom)
    }

    // Grand target monthly lead range
    const grandMonthlyLeadsAvg = sc1.monthlyLeadsNeeded
    const grandMonthlyLeadsBest = sc1.bestMonthlyLeads
    const grandMonthlyLeadsWorst = sc1.worstMonthlyLeads

    return {
      activeEmptySlots,
      monthlyEmptySlots,
      weeklyEmptySlots,
      emptySlotsUnit,
      numCurrent,
      numFuture,
      totalTeachers,
      hoursPerTeacher,
      slotsPerTeacher,
      roundedSlotsPerTeacher,
      slotsPerTeacherMonth,
      currentTeachersCapacitySlots,
      currentTeachersCapacityMonthly,
      futureTeachersCapacitySlots,
      futureTeachersCapacityMonthly,
      totalTeachersCapacitySlots,
      totalTeachersCapacityMonthly,
      totalTeachingHours,
      totalTeachingHoursMonthly,
      calculationScope,
      totalWeeklySlotsToFill,
      totalMonthlySlotsToFill,
      validDuration,
      validCR: Math.round(validCR * 100),
      validMinCourse,
      validMaxCourse,
      avgCourseLength,
      sc1,
      sc2,
      scCustom,
      grandMonthlyLeadsAvg,
      grandMonthlyLeadsBest,
      grandMonthlyLeadsWorst,
    }
  }, [
    availableSlotsMode,
    autoEmptySlots,
    manualAvailableSlots,
    emptySlotsUnit,
    currentTeachers,
    futureTeachers,
    calculationScope,
    capacityInputMode,
    autoRegisteredCapacitySlots,
    manualTeachingSlots,
    manualTeachingHours,
    slotDuration,
    conversionRate,
    minCourseSessions,
    maxCourseSessions,
    customFrequency,
  ])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleRefreshData = () => {
    const now = new Date()
    const timeStr = `${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
    setLastRefreshed(timeStr)
    setManualAvailableSlots(autoEmptySlots)
    setCurrentTeachers(autoActiveTeachers)
    toast.success(`↻ Đã đồng bộ dữ liệu mới nhất từ hệ thống (${timeStr})!`)
  }

  const handleResetToAuto = () => {
    setAvailableSlotsMode('auto')
    setManualAvailableSlots(autoEmptySlots)
    setCurrentTeachers(autoActiveTeachers)
    setFutureTeachers(2)
    setCalculationScope('total_capacity')
    setCapacityInputMode('manual_hours')
    setManualTeachingHours(25)
    setManualTeachingSlots(37.5)
    setSlotDuration(40)
    setConversionRate(30)
    setMinCourseSessions(8)
    setMaxCourseSessions(13)
    setCustomFrequency('')
    toast.success('Đã đặt lại toàn bộ thông số chuẩn theo hệ thống!')
  }

  const handleCopySummary = () => {
    const text = `📊 BÁO CÁO LEAD CAPACITY & FORECAST TRÀIELTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CAPACITY ĐẦU VÀO:
- Chế độ tính: ${calculations.calculationScope === 'total_capacity' ? 'Toàn bộ Capacity đội ngũ GV' : 'Slot trống hiện tại + GV mới'}
- Số GV: ${calculations.numCurrent} đang có + ${calculations.numFuture} sắp có = ${calculations.totalTeachers} GV
- Capacity mỗi GV: ${calculations.hoursPerTeacher} giờ/tuần (~${calculations.roundedSlotsPerTeacher} ca/tuần = ${calculations.slotsPerTeacherMonth} ca/tháng với ca ${calculations.validDuration}')
- Slot trống hiện tại: ${calculations.activeEmptySlots} slot (${calculations.emptySlotsUnit === 'month' ? 'Tháng' : 'Tuần'})
- Tổng slot cần fill: ${calculations.totalMonthlySlotsToFill} slot/tháng (~${calculations.totalWeeklySlotsToFill} slot/tuần)
- Tỷ lệ chốt sale (CR): ${calculations.validCR}%
- Độ dài khóa học: ${calculations.validMinCourse}–${calculations.validMaxCourse} buổi (TB: ${calculations.avgCourseLength} buổi)

2. NGUYÊN TẮC TIÊU HAO SLOT THEO DATA:
- 1 học viên học 1 buổi/tuần = tháng mất 4 slot (chứ không phải 1 slot)
- 1 học viên học 2 buổi/tuần = tháng mất 8 slot (chứ không phải 2 slot)

3. FILL CAPACITY BAN ĐẦU (INITIAL FILL):
- 1 buổi/tuần (4 slot/tháng): ${calculations.totalMonthlySlotsToFill} slot tháng ÷ 4 = ${calculations.sc1.studentsNeeded} HV cần  ->  ${calculations.sc1.initialLeads} leads
- 2 buổi/tuần (8 slot/tháng): ${calculations.totalMonthlySlotsToFill} slot tháng ÷ 8 = ${calculations.sc2.studentsNeeded} HV cần  ->  ${calculations.sc2.initialLeads} leads

4. DUY TRÌ FULL CAPACITY HÀNG THÁNG (MONTHLY REPLACEMENT):
- Học viên tốt nghiệp/thay thế: ~${calculations.sc1.monthlyStudentsReplaced} HV/tháng
- Target lead duy trì TB (${calculations.avgCourseLength} buổi): ${calculations.grandMonthlyLeadsAvg} leads/tháng
- Best Case (${calculations.validMaxCourse} buổi): ${calculations.grandMonthlyLeadsBest} leads/tháng
- Worst Case (${calculations.validMinCourse} buổi): ${calculations.grandMonthlyLeadsWorst} leads/tháng
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('📋 Đã sao chép báo cáo Lead Capacity vào bộ nhớ tạm!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('space-y-6 w-full font-sans text-slate-800 antialiased', className)}>
      {/* ── Top Header Banner ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md">
            <Calculator className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                Lead Capacity Calculator
              </h2>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold text-xs shadow-2xs">
                ⚡ Realtime Teaching Capacity & Replacement
              </Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Tự động tính số lượng <strong>Học viên</strong> và <strong>Lead mới cần có</strong> để Fill ban đầu & Duy trì Full Capacity hàng tháng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div className="text-[11px] font-semibold text-slate-500 mr-1 hidden md:block">
            Cập nhật: <span className="font-mono font-bold text-slate-700">{lastRefreshed}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            className="h-9 gap-1.5 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer"
            title="Lấy lại số liệu realtime từ hệ thống"
          >
            <RefreshCw className="size-3.5 text-emerald-700" />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetToAuto}
            className="h-9 gap-1.5 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer"
            title="Khôi phục các thông số về mặc định"
          >
            <RotateCcw className="size-3.5 text-slate-500" />
            <span>Reset</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCopySummary}
            className="h-9 gap-1.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-xs cursor-pointer"
          >
            {copied ? <Check className="size-3.5 text-white" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </Button>
        </div>
      </div>

      {/* ── SECTION 1: Input Parameters & Auto/Manual Toggles ───────────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs">
              1
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Thông Số Đầu Vào & Chế Độ Tính Toán (Auto / Manual Options)
            </h3>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Hệ thống tự động cập nhật kết quả realtime khi thay đổi thông số
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Slot trống hiện tại (Current Available Slots) */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <span>🎯</span> Slot Trống Hiện Tại
              </span>
              <div className="flex items-center gap-1">
                <div className="flex items-center bg-white rounded-lg p-0.5 border border-emerald-200 shadow-2xs mr-1">
                  <button
                    type="button"
                    onClick={() => setEmptySlotsUnit('month')}
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9px] font-black transition cursor-pointer',
                      emptySlotsUnit === 'month'
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmptySlotsUnit('week')}
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[9px] font-black transition cursor-pointer',
                      emptySlotsUnit === 'week'
                        ? 'bg-emerald-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    )}
                  >
                    Tuần
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setAvailableSlotsMode('auto')}
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[10px] font-extrabold transition cursor-pointer',
                    availableSlotsMode === 'auto'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  )}
                >
                  ⚡ Auto ({autoEmptySlots})
                </button>
                <button
                  type="button"
                  onClick={() => setAvailableSlotsMode('manual')}
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[10px] font-extrabold transition cursor-pointer',
                    availableSlotsMode === 'manual'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  )}
                >
                  Manual
                </button>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              {availableSlotsMode === 'auto' ? (
                <div className="h-10 flex items-center justify-between w-full px-3.5 rounded-xl bg-white border border-emerald-300 font-mono text-xl font-black text-emerald-800 shadow-inner">
                  <div className="flex items-baseline gap-1">
                    {calculations.activeEmptySlots} <span className="text-xs font-bold text-slate-400">{emptySlotsUnit === 'month' ? 'slots/tháng' : 'slots/tuần'}</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 font-sans">
                    {emptySlotsUnit === 'month' ? `~${calculations.weeklyEmptySlots} ca/tuần` : `~${calculations.monthlyEmptySlots} ca/tháng`}
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5 w-full">
                  <Input
                    type="number"
                    min="0"
                    value={manualAvailableSlots}
                    onChange={(e) => setManualAvailableSlots(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-10 w-full font-mono text-xl font-black text-slate-900 bg-white border-emerald-300 shadow-inner"
                  />
                  <span className="text-xs font-extrabold text-slate-500">{emptySlotsUnit === 'month' ? 'slot/tháng' : 'slot/tuần'}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-200/50">
              <span className="truncate" title={autoEmptySource}>
                {availableSlotsMode === 'auto' ? `Nguồn: ${autoEmptySource}` : `Quy đổi: ${calculations.monthlyEmptySlots} ca/tháng (~${calculations.weeklyEmptySlots} ca/tuần)`}
              </span>
              {onViewSchedule && (
                <button
                  type="button"
                  onClick={onViewSchedule}
                  className="font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5 shrink-0 cursor-pointer"
                >
                  <span>Xem Lịch</span>
                  <ExternalLink className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Giáo Viên (Đang Có + Sắp Có) */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>👨‍🏫</span> Số Giáo Viên
              </span>
              <Badge variant="outline" className="bg-white text-slate-700 border-slate-300 font-extrabold text-[10px]">
                Tổng: <strong className="text-emerald-800 ml-1 font-mono">{calculations.totalTeachers} GV</strong>
              </Badge>
            </div>

            {/* 2 sub-inputs: GV đang có & GV sắp có */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* GV Đang có */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">GV Đang Có</label>
                  <button
                    type="button"
                    onClick={() => setCurrentTeachers(autoActiveTeachers)}
                    className="text-[9px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    title="Lấy số GV active tự động từ hệ thống"
                  >
                    Auto ({autoActiveTeachers})
                  </button>
                </div>
                <div className="flex items-baseline gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={currentTeachers}
                    onChange={(e) => setCurrentTeachers(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9 w-full font-mono text-base font-black text-slate-900 bg-white shadow-inner"
                  />
                  <span className="text-[11px] font-bold text-slate-400">GV</span>
                </div>
              </div>

              {/* GV Sắp có (Tuyển thêm) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">GV Sắp Có</label>
                  <span className="text-[9px] font-semibold text-blue-600">Tuyển thêm</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={futureTeachers}
                    onChange={(e) => setFutureTeachers(Math.max(0, parseInt(e.target.value) || 0))}
                    className="h-9 w-full font-mono text-base font-black text-blue-700 bg-white shadow-inner border-blue-300"
                  />
                  <span className="text-[11px] font-bold text-slate-400">GV</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
              <span>{calculations.numCurrent} đang có + {calculations.numFuture} sắp có</span>
              <strong className="text-slate-900 font-bold">= {calculations.totalTeachers} GV</strong>
            </div>
          </div>

          {/* Card 3: Teaching Capacity (Giờ hoặc Ca trên mỗi GV) */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>⏱️</span> Teaching Capacity
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCapacityInputMode('manual_hours')}
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[10px] font-extrabold transition cursor-pointer',
                    capacityInputMode === 'manual_hours'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  )}
                >
                  Giờ/GV
                </button>
                <button
                  type="button"
                  onClick={() => setCapacityInputMode('manual_slots')}
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[10px] font-extrabold transition cursor-pointer',
                    capacityInputMode === 'manual_slots'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  )}
                >
                  Ca/Tuần
                </button>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              {capacityInputMode === 'manual_hours' ? (
                <div className="flex items-baseline gap-1.5 w-full">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={manualTeachingHours}
                    onChange={(e) => setManualTeachingHours(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-10 w-full font-mono text-xl font-black text-slate-900 bg-white shadow-inner"
                  />
                  <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">giờ/GV/tuần</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5 w-full">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={manualTeachingSlots}
                    onChange={(e) => setManualTeachingSlots(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-10 w-full font-mono text-xl font-black text-slate-900 bg-white shadow-inner"
                  />
                  <span className="text-xs font-extrabold text-slate-500 whitespace-nowrap">ca/GV/tuần</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-mono space-y-0.5">
              <div className="flex justify-between">
                <span>1 GV = <strong>{calculations.roundedSlotsPerTeacher} ca/tuần</strong> ({calculations.validDuration}'/ca)</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Tổng {calculations.totalTeachers} GV ({calculations.numCurrent}+{calculations.numFuture}) =</span>
                <span>{calculations.totalTeachersCapacitySlots} slots/tuần</span>
              </div>
            </div>
          </div>

          {/* Card 4: Thời lượng 1 ca (Slot Duration) */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>🕒</span> Thời Lượng 1 Ca
              </span>
              <div className="flex items-center gap-1">
                {[20, 40, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSlotDuration(mins)}
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-black transition cursor-pointer',
                      slotDuration === mins
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    )}
                  >
                    {mins}'
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <Input
                type="number"
                min="1"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Math.max(1, parseInt(e.target.value) || 40))}
                className="h-10 w-full font-mono text-xl font-black text-slate-900 bg-white shadow-inner"
              />
              <span className="text-xs font-extrabold text-slate-500">phút</span>
            </div>

            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
              Chuẩn trung tâm: <strong>40 phút / ca</strong>
            </p>
          </div>

          {/* Card 5: Tỷ lệ chốt sale (Conversion Rate) */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <span>📈</span> Tỷ Lệ Chốt Sale (CR)
              </span>
              <div className="flex items-center gap-1">
                {[20, 30, 40].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setConversionRate(rate)}
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-black transition cursor-pointer',
                      conversionRate === rate
                        ? 'bg-emerald-800 text-white'
                        : 'bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    )}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <Input
                type="number"
                min="1"
                max="100"
                value={conversionRate}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val)) setConversionRate(Math.min(100, Math.max(0.1, val)))
                }}
                className="h-10 w-full font-mono text-xl font-black text-emerald-800 bg-white border-emerald-300 shadow-inner"
              />
              <span className="text-xs font-extrabold text-emerald-800">%</span>
            </div>

            <p className="text-[11px] text-emerald-800 font-medium pt-1 border-t border-emerald-200/60">
              Tỷ lệ học thử/tư vấn chốt thành học viên chính thức
            </p>
          </div>

          {/* Card 6: Độ dài khóa học (Course Length Range: 8–13 sessions) */}
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span>📚</span> Độ Dài Khóa Học
              </span>
              <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md">
                TB: {calculations.avgCourseLength} buổi
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tối thiểu (Min)</span>
                <div className="flex items-baseline gap-1">
                  <Input
                    type="number"
                    min="1"
                    value={minCourseSessions}
                    onChange={(e) => setMinCourseSessions(Math.max(1, parseInt(e.target.value) || 8))}
                    className="h-10 font-mono text-lg font-black text-slate-900 bg-white shadow-inner"
                  />
                  <span className="text-xs font-bold text-slate-500">buổi</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tối đa (Max)</span>
                <div className="flex items-baseline gap-1">
                  <Input
                    type="number"
                    min="1"
                    value={maxCourseSessions}
                    onChange={(e) => setMaxCourseSessions(Math.max(1, parseInt(e.target.value) || 13))}
                    className="h-10 font-mono text-lg font-black text-slate-900 bg-white shadow-inner"
                  />
                  <span className="text-xs font-bold text-slate-500">buổi</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
              Khóa chuẩn: <strong>8 – 13 buổi</strong> (chiếm slot trong 4 – 13 tuần)
            </p>
          </div>
        </div>

        {/* ── Total Capacity Synthesis Callout ─────────────────────────────────── */}
        <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-950">
              <Sparkles className="size-4 text-emerald-700" />
              <span>Tổng Hợp Capacity Cần Fill (Theo Tháng & Theo Tuần)</span>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-emerald-200 self-start md:self-auto shadow-2xs">
              <button
                type="button"
                onClick={() => setCalculationScope('total_capacity')}
                className={cn(
                  'px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer',
                  calculationScope === 'total_capacity'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                🎯 Toàn Bộ Capacity ({calculations.totalTeachers} GV)
              </button>
              <button
                type="button"
                onClick={() => setCalculationScope('empty_and_new')}
                className={cn(
                  'px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer',
                  calculationScope === 'empty_and_new'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                ⚡ Slot Trống Hiện Tại + GV Mới
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-emerald-200/60">
            <div className="text-xs text-emerald-900 font-medium space-y-1">
              {calculationScope === 'total_capacity' ? (
                <>
                  <p>
                    = <strong>{calculations.totalTeachers} GV</strong> (gồm <strong>{calculations.numCurrent} đang có</strong> + <strong>{calculations.numFuture} sắp có</strong>) × <strong>{calculations.hoursPerTeacher} tiếng/GV/tuần</strong> (25h/tuần = {calculations.slotsPerTeacherMonth} ca/tháng)
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Quy đổi: {calculations.totalTeachers} GV × {calculations.slotsPerTeacherMonth} ca = <strong className="text-emerald-900 font-bold">{calculations.totalMonthlySlotsToFill} slots/tháng</strong> (~{calculations.totalWeeklySlotsToFill} ca/tuần • {calculations.totalTeachingHoursMonthly} giờ/tháng)
                  </p>
                </>
              ) : (
                <>
                  <p>
                    = Slot trống tháng ({calculations.monthlyEmptySlots} ca) + Capacity GV sắp có ({calculations.numFuture} GV × {calculations.slotsPerTeacherMonth} ca = {calculations.futureTeachersCapacityMonthly} ca)
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    Quy đổi: {calculations.monthlyEmptySlots} ca trống + {calculations.futureTeachersCapacityMonthly} ca mới = <strong className="text-emerald-900 font-bold">{calculations.totalMonthlySlotsToFill} slots/tháng</strong> (~{calculations.totalWeeklySlotsToFill} ca/tuần)
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col items-end bg-white px-5 py-3 rounded-2xl border border-emerald-300 shadow-xs shrink-0 self-start md:self-auto">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-800">
                  {calculations.totalMonthlySlotsToFill}
                </span>
                <span className="text-xs font-black text-slate-700">slot / tháng</span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                ~{calculations.totalWeeklySlotsToFill} slot / tuần
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: PART A - FILL CAPACITY BAN ĐẦU (FILL CAPACITY NOW) ─────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-black text-xs">
              A
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>🎯 PHẦN A: FILL CAPACITY BAN ĐẦU (Fill Capacity Now)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Số học viên và lead mới cần có để lấp đầy <strong>{calculations.totalMonthlySlotsToFill} slots/tháng</strong> (~{calculations.totalWeeklySlotsToFill} slots/tuần) với CR {calculations.validCR}%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Tùy chỉnh tần suất:</span>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="VD: 1.5"
              value={customFrequency}
              onChange={(e) => setCustomFrequency(e.target.value)}
              className="h-8 w-24 text-xs font-bold text-center bg-slate-50 border-slate-200 rounded-xl font-mono shadow-2xs"
            />
            <span className="text-xs font-bold text-slate-400">buổi/tuần</span>
          </div>
        </div>

        {/* Callout: Nguyên tắc data 1 HV học 1 buổi/tuần = mất 4 slot/tháng, 2 buổi/tuần = mất 8 slot/tháng */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-950 font-medium flex items-start gap-3 shadow-2xs">
          <span className="text-xl shrink-0">💡</span>
          <div className="space-y-1">
            <p className="font-black text-blue-950 text-sm">
              Nguyên tắc tính toán dựa theo Data thực tế:
            </p>
            <p>
              • Học viên học <strong>1 buổi / tuần</strong> → Tháng đó mất <strong>4 slots</strong> (chứ không phải chỉ mất 1 slot).
            </p>
            <p>
              • Học viên học <strong>2 buổi / tuần</strong> → Tháng đó mất <strong>8 slots</strong> (chứ không phải chỉ mất 2 slot).
            </p>
            <p className="text-[11px] text-blue-800 font-mono pt-0.5">
              Số HV cần = {calculations.totalMonthlySlotsToFill} slot tháng ÷ Số slot/tháng mỗi HV chiếm (4 hoặc 8).
            </p>
          </div>
        </div>

        {/* 3 Scenario Cards */}
        <div className={cn('grid grid-cols-1 gap-5', calculations.scCustom ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')}>
          {/* Scenario 1: 1 Buổi/tuần */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-blue-200 bg-blue-50/20 p-5 sm:p-6 shadow-sm hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">1 BUỔI / TUẦN</span>
                <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] font-black">
                  Mất 4 slot / tháng (1 ca/tuần)
                </Badge>
              </div>

              <div className="mt-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Initial Leads Cần (Làm tròn lên)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-blue-700">
                    {calculations.sc1.initialLeads.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-slate-500">leads</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-3.5 text-xs border border-blue-100 shadow-2xs">
                <span className="font-semibold text-slate-600">Học viên cần chốt:</span>
                <strong className="font-black text-slate-900 font-mono text-base">{calculations.sc1.studentsNeeded} HV</strong>
              </div>

              <div className="mt-2 text-[11px] text-blue-800 font-medium bg-blue-100/50 px-3 py-1.5 rounded-xl">
                📌 1 HV = <strong>4 slot/tháng</strong> → {calculations.sc1.studentsNeeded} HV chiếm đủ {calculations.sc1.totalMonthlySlotsConsumed} slot/tháng
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-200/70">
              Công thức: ⌈ ({calculations.totalMonthlySlotsToFill} ca ÷ 4) ÷ {calculations.validCR}% ⌉ = <strong>{calculations.sc1.initialLeads} leads</strong>
            </div>
          </div>

          {/* Scenario 2: 2 Buổi/tuần */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-purple-200 bg-purple-50/20 p-5 sm:p-6 shadow-sm hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">2 BUỔI / TUẦN</span>
                <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] font-black">
                  Mất 8 slot / tháng (2 ca/tuần)
                </Badge>
              </div>

              <div className="mt-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Initial Leads Cần (Làm tròn lên)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-purple-700">
                    {calculations.sc2.initialLeads.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-slate-500">leads</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-3.5 text-xs border border-purple-100 shadow-2xs">
                <span className="font-semibold text-slate-600">Học viên cần chốt:</span>
                <strong className="font-black text-slate-900 font-mono text-base">{calculations.sc2.studentsNeeded} HV</strong>
              </div>

              <div className="mt-2 text-[11px] text-purple-800 font-medium bg-purple-100/50 px-3 py-1.5 rounded-xl">
                📌 1 HV = <strong>8 slot/tháng</strong> → {calculations.sc2.studentsNeeded} HV chiếm đủ {calculations.sc2.totalMonthlySlotsConsumed} slot/tháng
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-200/70">
              Công thức: ⌈ ({calculations.totalMonthlySlotsToFill} ca ÷ 8) ÷ {calculations.validCR}% ⌉ = <strong>{calculations.sc2.initialLeads} leads</strong>
            </div>
          </div>

          {/* Scenario 3: Custom Buổi/tuần (nếu có) */}
          {calculations.scCustom && (
            <div className="flex flex-col justify-between gap-4 rounded-3xl border border-amber-300 bg-amber-50/20 p-5 sm:p-6 shadow-sm hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">{calculations.scCustom.freq} BUỔI / TUẦN</span>
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-black">
                    Mất {calculations.scCustom.monthlySlotsPerStudent} slot / tháng
                  </Badge>
                </div>

                <div className="mt-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Initial Leads Cần (Làm tròn lên)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono text-amber-800">
                      {calculations.scCustom.initialLeads.toLocaleString()}
                    </span>
                    <span className="text-xs font-black text-slate-500">leads</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-2xl bg-white p-3.5 text-xs border border-amber-100 shadow-2xs">
                  <span className="font-semibold text-slate-600">Học viên cần chốt:</span>
                  <strong className="font-black text-slate-900 font-mono text-base">{calculations.scCustom.studentsNeeded} HV</strong>
                </div>

                <div className="mt-2 text-[11px] text-amber-900 font-medium bg-amber-100/50 px-3 py-1.5 rounded-xl">
                  📌 1 HV = <strong>{calculations.scCustom.monthlySlotsPerStudent} slot/tháng</strong> → {calculations.scCustom.studentsNeeded} HV chiếm {calculations.scCustom.totalMonthlySlotsConsumed} slot/tháng
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-200/70">
                Công thức: ⌈ ({calculations.totalMonthlySlotsToFill} ca ÷ {calculations.scCustom.monthlySlotsPerStudent}) ÷ {calculations.validCR}% ⌉ = <strong>{calculations.scCustom.initialLeads} leads</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: PART B - MAINTAIN FULL CAPACITY HÀNG THÁNG ───────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs">
              B
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>🔄 PHẦN B: DUY TRÌ FULL CAPACITY HÀNG THÁNG (Maintain Full Capacity)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sau khi full capacity, mỗi tháng có <strong>~{calculations.sc1.monthlyStudentsReplaced} học viên hoàn thành khóa ({calculations.avgCourseLength} buổi)</strong> giải phóng slot và cần lead mới thay thế.
              </p>
            </div>
          </div>
        </div>

        {/* Occupancy & Metric Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
              1. Thời Gian Chiếm Slot Trung Bình
            </span>
            <div className="text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>• 1 buổi/tuần:</span>
                <strong className="font-mono text-slate-900 font-bold">{calculations.sc1.avgActiveWeeks} tuần</strong>
              </div>
              <div className="flex justify-between">
                <span>• 2 buổi/tuần:</span>
                <strong className="font-mono text-slate-900 font-bold">{calculations.sc2.avgActiveWeeks} tuần</strong>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
              = {calculations.avgCourseLength} buổi ÷ số buổi/tuần
            </p>
          </div>

          <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
              2. Học Viên Hoàn Thành Khóa / Tháng
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-emerald-800">
                ~{calculations.sc1.monthlyStudentsReplaced}
              </span>
              <span className="text-xs font-bold text-slate-500">học viên / tháng</span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 font-mono">
              = {calculations.totalMonthlySlotsToFill} slot tháng ÷ {calculations.avgCourseLength} buổi
            </p>
          </div>

          <div className="bg-emerald-50/80 p-4.5 rounded-2xl border border-emerald-200 space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-950 block">
              3. Số Lead Mới Cần Duy Trì / Tháng
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono text-emerald-800">
                ~{calculations.grandMonthlyLeadsAvg}
              </span>
              <span className="text-xs font-extrabold text-emerald-950">leads / tháng</span>
            </div>
            <p className="text-[10px] text-emerald-800/80 pt-1 border-t border-emerald-200/60 font-mono">
              = ⌈ {calculations.sc1.monthlyStudentsReplaced} HV ÷ {calculations.validCR}% ⌉
            </p>
          </div>
        </div>

        {/* Grand Target Callout */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex size-7 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                  ★
                </span>
                <h4 className="text-base font-black uppercase tracking-wider text-white">
                  Chỉ Tiêu Lead Duy Trì Hàng Tháng (Recommended Monthly Lead Target)
                </h4>
                <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/40 text-[10px] font-extrabold">
                  KPI Vận Hành Chuẩn
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium max-w-xl leading-relaxed">
                Để duy trì 100% capacity giáo viên ({calculations.totalWeeklySlotsToFill} slots/tuần), phòng Marketing & Sales cần duy trì mục tiêu mang về đều đặn mỗi tháng:
              </p>
            </div>

            <div className="bg-emerald-500 text-slate-950 px-6 py-3.5 rounded-2xl shadow-md shrink-0 flex items-center gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-950 block">
                  Target Lead Mới / Tháng
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black font-mono">
                    ~{calculations.grandMonthlyLeadsAvg.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-emerald-950">leads / tháng</span>
                </div>
              </div>
              <div className="size-10 rounded-xl bg-slate-950/10 flex items-center justify-center font-bold text-xl">
                🚀
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: PART C - FORECAST THEO ĐỘ DÀI KHÓA HỌC ────────────────── */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-lg bg-purple-100 text-purple-800 font-black text-xs">
              C
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                📊 DỰ BÁO RANGE THEO ĐỘ DÀI KHÓA HỌC (Best Case | Average | Worst Case)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                So sánh số lead duy trì cần mỗi tháng khi học viên học gói ngắn nhất ({calculations.validMinCourse} buổi) vs dài nhất ({calculations.validMaxCourse} buổi).
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Best Case: 13 buổi */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/30 p-5 shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950">🟢 BEST CASE</span>
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-extrabold">
                  {calculations.validMaxCourse} buổi / khóa
                </Badge>
              </div>

              <div className="mt-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Cần Thay Thế / Tháng</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black font-mono text-emerald-800">
                    {calculations.grandMonthlyLeadsBest}
                  </span>
                  <span className="text-xs font-bold text-slate-500">leads/tháng</span>
                </div>
              </div>

              <div className="mt-3 text-xs space-y-1.5 bg-white p-3 rounded-xl border border-emerald-100">
                <div className="flex justify-between">
                  <span className="text-slate-600">HV hoàn thành/tháng:</span>
                  <strong className="font-mono text-slate-900 font-bold">~{calculations.sc1.bestMonthlyStudents} HV</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Thời gian giữ slot:</span>
                  <strong className="font-mono text-slate-900 font-bold">{calculations.sc1.bestActiveWeeks} tuần</strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-emerald-900/80 italic">
              * Khóa dài, học viên học lâu → ít học viên tốt nghiệp mỗi tháng → cần ít lead thay thế nhất.
            </p>
          </div>

          {/* Average: 10.5 buổi */}
          <div className="relative flex flex-col justify-between gap-4 rounded-3xl border border-blue-300 ring-2 ring-blue-400/30 bg-blue-50/30 p-5 shadow-sm">
            <div className="absolute -top-3 right-5 rounded-full bg-blue-700 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
              ★ Target Chuẩn
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-950">🔵 AVERAGE (CHUẨN)</span>
                <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] font-extrabold">
                  {calculations.avgCourseLength} buổi / khóa
                </Badge>
              </div>

              <div className="mt-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Cần Thay Thế / Tháng</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black font-mono text-blue-800">
                    {calculations.grandMonthlyLeadsAvg}
                  </span>
                  <span className="text-xs font-bold text-slate-500">leads/tháng</span>
                </div>
              </div>

              <div className="mt-3 text-xs space-y-1.5 bg-white p-3 rounded-xl border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-slate-600">HV hoàn thành/tháng:</span>
                  <strong className="font-mono text-slate-900 font-bold">~{calculations.sc1.monthlyStudentsReplaced} HV</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Thời gian giữ slot:</span>
                  <strong className="font-mono text-slate-900 font-bold">{calculations.sc1.avgActiveWeeks} tuần</strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-blue-950/80 italic">
              * Dự báo vận hành chuẩn với độ dài khóa học trung bình toàn trung tâm.
            </p>
          </div>

          {/* Worst Case: 8 buổi */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-amber-200 bg-amber-50/30 p-5 shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-950">🔴 WORST CASE</span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-extrabold">
                  {calculations.validMinCourse} buổi / khóa
                </Badge>
              </div>

              <div className="mt-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lead Cần Thay Thế / Tháng</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black font-mono text-amber-800">
                    {calculations.grandMonthlyLeadsWorst}
                  </span>
                  <span className="text-xs font-bold text-slate-500">leads/tháng</span>
                </div>
              </div>

              <div className="mt-3 text-xs space-y-1.5 bg-white p-3 rounded-xl border border-amber-100">
                <div className="flex justify-between">
                  <span className="text-slate-600">HV hoàn thành/tháng:</span>
                  <strong className="font-mono text-slate-900 font-bold">~{calculations.sc1.worstMonthlyStudents} HV</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Thời gian giữ slot:</span>
                  <strong className="font-mono text-slate-900 font-bold">{calculations.sc1.worstActiveWeeks} tuần</strong>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-amber-950/80 italic">
              * Khóa ngắn, học viên hoàn thành nhanh → giải phóng slot liên tục → cần nhiều lead nhất để lấp đầy.
            </p>
          </div>
        </div>
      </div>

      {/* ── Formula Explanation (Expandable) ─────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
        <button
          type="button"
          onClick={() => setShowFormula(!showFormula)}
          className="flex w-full items-center justify-between text-left font-extrabold text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="size-4 text-emerald-700" />
            <span>Logic Thuật Toán & Công Thức Tính Toán Chi Tiết (Core Logic & Formulas)</span>
          </div>
          {showFormula ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {showFormula && (
          <div className="mt-4 space-y-3 border-t border-slate-200/80 pt-3 text-slate-600 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <strong className="text-slate-900 block font-sans">A. Fill Capacity Ban Đầu (Initial Fill):</strong>
                {calculations.calculationScope === 'total_capacity' ? (
                  <>
                    <p className="text-blue-700 font-bold">1. Tổng Slot Cần Fill = (GV Đang Có + GV Sắp Có) × Capacity/GV</p>
                    <p className="text-slate-500">= ({calculations.numCurrent} + {calculations.numFuture} GV) × {calculations.roundedSlotsPerTeacher} ca = <strong className="text-slate-900">{calculations.totalWeeklySlotsToFill} ca/tuần</strong> ({calculations.totalTeachingHours}h/tuần)</p>
                  </>
                ) : (
                  <>
                    <p className="text-blue-700 font-bold">1. Tổng Slot Cần Fill = Slot Trống Hiện Tại + Capacity GV Sắp Có</p>
                    <p className="text-slate-500">= {calculations.activeEmptySlots} ca trống + {calculations.futureTeachersCapacitySlots} ca mới = <strong className="text-slate-900">{calculations.totalWeeklySlotsToFill} ca/tuần</strong></p>
                  </>
                )}
                <p className="text-purple-700 font-bold mt-2">2. Số HV Cần Chốt = Tổng Slot Cần Fill ÷ Số Buổi/Tuần</p>
                <p className="text-slate-500">Ví dụ (1 buổi): {calculations.totalWeeklySlotsToFill} ÷ 1 = <strong className="text-slate-900">{calculations.sc1.studentsNeeded} HV</strong></p>
                <p className="text-amber-800 font-bold mt-2">3. Initial Leads = ⌈ Số HV Cần Chốt ÷ Conversion Rate ⌉</p>
                <p className="text-slate-500">= ⌈ {calculations.sc1.studentsNeeded} ÷ {calculations.validCR}% ⌉ = <strong className="text-slate-900">{calculations.sc1.initialLeads} leads</strong></p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <strong className="text-slate-900 block font-sans">B. Duy Trì Capacity Hàng Tháng (Maintain Full Capacity):</strong>
                <p className="text-emerald-800 font-bold">1. Độ Dài Khóa TB = ({calculations.validMinCourse} + {calculations.validMaxCourse}) ÷ 2 = {calculations.avgCourseLength} buổi</p>
                <p className="text-slate-500">Thời gian chiếm slot TB = {calculations.avgCourseLength} ÷ freq = {calculations.sc1.avgActiveWeeks} tuần</p>
                <p className="text-emerald-800 font-bold mt-2">2. HV Hoàn Thành Khóa/Tháng = (Tổng Slot × 4.33) ÷ Độ Dài Khóa TB</p>
                <p className="text-slate-500">= ({calculations.totalWeeklySlotsToFill} × 4.33) ÷ {calculations.avgCourseLength} = <strong className="text-slate-900">~{calculations.sc1.monthlyStudentsReplaced} HV/tháng</strong></p>
                <p className="text-amber-800 font-bold mt-2">3. Monthly Leads Needed = ⌈ HV Thay Thế/Tháng ÷ CR ⌉</p>
                <p className="text-slate-500">= ⌈ {calculations.sc1.monthlyStudentsReplaced} ÷ {calculations.validCR}% ⌉ = <strong className="text-slate-900">~{calculations.grandMonthlyLeadsAvg} leads/tháng</strong></p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Nguyên tắc cốt lõi: 1 học viên đã chốt sẽ chiếm slot cố định liên tục trong 8–13 tuần (toàn bộ khóa học), chỉ giải phóng slot khi đã hoàn thành khóa.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Lead Capacity Calculator Dialog Wrapper ─────────────────────────────────
export function LeadCapacityCalculatorDialog({
  open,
  onOpenChange,
  autoEmptySlots,
  initialEmptySlots,
  autoEmptySource,
  onViewSchedule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  autoEmptySlots?: number
  initialEmptySlots?: number
  autoEmptySource?: string
  onViewSchedule?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 bg-slate-100 text-slate-800 border border-slate-200">
        <DialogHeader className="sr-only">
          <DialogTitle>Lead Capacity Calculator</DialogTitle>
          <DialogDescription>
            Tự động tính số lượng học viên và lead mới cần có dựa trên capacity giáo viên và tỷ lệ chốt sale
          </DialogDescription>
        </DialogHeader>

        <LeadCapacityCalculator
          autoEmptySlots={autoEmptySlots ?? initialEmptySlots}
          autoEmptySource={autoEmptySource}
          onViewSchedule={() => {
            onOpenChange(false)
            if (onViewSchedule) onViewSchedule()
          }}
          isDialog
        />
      </DialogContent>
    </Dialog>
  )
}