import { Fragment, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookCheck,
  BookOpen,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  GraduationCap,
  HelpCircle,
  Info,
  Layers,
  Search,
  Sparkles,
  TriangleAlert,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AdminTeacherStat } from '../types'
import { DonutChart, StudentPieChart, TeacherGroupedBar } from './analytics-charts'
import { LeadCapacityCalculatorDialog } from './lead-capacity-calculator'

type Props = {
  stats: AdminTeacherStat[]
  monthKey: string
  onSelectStudent?: (student: AdminTeacherStat['studentTracking'][number]) => void
  onOpenCalculator?: () => void
}

type DrilldownMode =
  | 'total_ca'
  | 'total_booked'
  | 'all_students'
  | 'almost_end'
  | 'teacher_detail'
  | 'center_slice'

type DrilldownState = {
  isOpen: boolean
  mode: DrilldownMode
  title: string
  subtitle: string
  teacherName?: string
  teacherId?: number
  sliceLabel?: string
}

export function AdminDashboard({ stats, monthKey, onSelectStudent, onOpenCalculator }: Props) {
  const [expandedTeacherId, setExpandedTeacherId] = useState<number | null>(null)
  const [drilldown, setDrilldown] = useState<DrilldownState | null>(null)
  const [drilldownSearch, setDrilldownSearch] = useState('')
  const [drilldownTeacherFilter, setDrilldownTeacherFilter] = useState<string>('all')
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(false)

  const ranked = useMemo(
    () => [...stats].sort((a, b) => b.monthSummary.totalCa - a.monthSummary.totalCa),
    [stats]
  )
  const totalCaAll = stats.reduce((s, t) => s + t.monthSummary.totalCa, 0)
  const totalBooked = stats.reduce((s, t) => s + t.monthSummary.bookedCa, 0)
  const totalStudents = stats.reduce((s, t) => s + t.studentCount, 0)
  const totalEnd = stats.reduce((s, t) => s + t.almostEndCount, 0)
  const totalDone = stats.reduce((s, t) => s + t.monthSummary.completedCa, 0)
  const maxCa = Math.max(...stats.map((s) => s.monthSummary.totalCa), 1)
  const totalEmptySlots = Math.max(0, totalCaAll - totalBooked)

  const displayMonth = (() => {
    const [year, mon] = monthKey.split('-')
    return `Tháng ${mon}/${year}`
  })()

  // Flatten all students across all teachers
  const allStudents = useMemo(() => {
    const list: Array<
      AdminTeacherStat['studentTracking'][number] & {
        teacherName: string
        teacherId: number
      }
    > = []
    stats.forEach((stat) => {
      stat.studentTracking.forEach((student) => {
        list.push({
          ...student,
          teacherName: stat.teacherName,
          teacherId: stat.teacherId,
        })
      })
    })
    return list
  }, [stats])

  const openTeacherDrilldown = (teacherName: string) => {
    const found = stats.find((s) => s.teacherName === teacherName)
    setDrilldownSearch('')
    setDrilldownTeacherFilter('all')
    setDrilldown({
      isOpen: true,
      mode: 'teacher_detail',
      title: `👨‍🏫 Chi Tiết Giảng Viên: ${teacherName}`,
      subtitle: `Dữ liệu ca dạy & danh sách học viên trong ${displayMonth}`,
      teacherName,
      teacherId: found?.teacherId,
    })
  }

  const openSliceDrilldown = (sliceLabel: string) => {
    setDrilldownSearch('')
    setDrilldownTeacherFilter('all')
    setDrilldown({
      isOpen: true,
      mode: 'center_slice',
      title: `🥧 Thống Kê Ca Toàn Trung Tâm: "${sliceLabel}"`,
      subtitle: `Chi tiết phân bổ các ca thuộc nhóm "${sliceLabel}" (${displayMonth})`,
      sliceLabel,
    })
  }

  // Filtered students for drilldown modal
  const filteredModalStudents = useMemo(() => {
    if (!drilldown) return []
    let list = [...allStudents]

    if (drilldown.mode === 'almost_end') {
      list = list.filter((s) => s.almostEnd)
    } else if (drilldown.mode === 'teacher_detail' && drilldown.teacherName) {
      list = list.filter((s) => s.teacherName === drilldown.teacherName)
    } else if (drilldown.mode === 'center_slice') {
      if (drilldown.sliceLabel?.includes('hoàn thành')) {
        list = list.filter((s) => s.completed > 0)
      } else if (drilldown.sliceLabel?.includes('chưa xong')) {
        list = list.filter((s) => s.remaining > 0)
      }
    }

    if (drilldownTeacherFilter !== 'all') {
      list = list.filter((s) => s.teacherName === drilldownTeacherFilter)
    }

    const q = drilldownSearch.trim().toLowerCase()
    if (q) {
      list = list.filter((s) => {
        return (
          s.studentName?.toLowerCase().includes(q) ||
          s.studentCode?.toLowerCase().includes(q) ||
          s.course?.toLowerCase().includes(q) ||
          s.teacherName?.toLowerCase().includes(q) ||
          s.aim?.toLowerCase().includes(q) ||
          s.studentNote?.toLowerCase().includes(q)
        )
      })
    }

    return list
  }, [allStudents, drilldown, drilldownSearch, drilldownTeacherFilter])

  const selectedTeacherStat = useMemo(() => {
    if (!drilldown?.teacherName) return null
    return stats.find((s) => s.teacherName === drilldown.teacherName)
  }, [stats, drilldown])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xs">
            <Crown className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Tổng Quan & Hiệu Suất Trung Tâm
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {displayMonth} • {stats.length} Giảng Viên hoạt động
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            onClick={() => {
              if (onOpenCalculator) onOpenCalculator()
              else setCalculatorOpen(true)
            }}
            className="h-9 gap-1.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Calculator className="size-3.5" />
            <span>🧮 Lead Capacity Calculator</span>
          </Button>
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>Interactive Dashboard</span>
          </div>
        </div>
      </div>

      {/* ── KPI Overview Cards (Clickable) ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OverviewCard
          label="Tổng Ca Mở"
          value={totalCaAll}
          unit="ca"
          tone="emerald"
          icon="🎯"
          sub="Tính ở tab Đăng Ký Lịch"
          onClick={() => {
            setDrilldownSearch('')
            setDrilldownTeacherFilter('all')
            setDrilldown({
              isOpen: true,
              mode: 'total_ca',
              title: '🎯 Tổng Hợp Ca Mở Toàn Trung Tâm (Đăng Ký Lịch)',
              subtitle: `Chi tiết phân bổ ${totalCaAll} ca mở (tính từ tab Đăng Ký Lịch) giữa ${stats.length} giảng viên trong ${displayMonth}`,
            })
          }}
        />
        <OverviewCard
          label="Tổng Ca Book"
          value={totalBooked}
          unit="ca"
          tone="blue"
          icon="📚"
          sub="Tính ở Lịch Sales (Học viên xếp lịch)"
          onClick={() => {
            setDrilldownSearch('')
            setDrilldownTeacherFilter('all')
            setDrilldown({
              isOpen: true,
              mode: 'total_booked',
              title: '📚 Tổng Hợp Ca Book Toàn Trung Tâm (Lịch Sales)',
              subtitle: `Chi tiết ${totalBooked} ca học đã book từ Lịch Sales (${displayMonth})`,
            })
          }}
        />
        <OverviewCard
          label="Học Viên Active"
          value={totalStudents}
          unit="HV"
          tone="purple"
          icon="👥"
          sub="Tổng số học viên đang theo học"
          onClick={() => {
            setDrilldownSearch('')
            setDrilldownTeacherFilter('all')
            setDrilldown({
              isOpen: true,
              mode: 'all_students',
              title: `👥 Danh Sách Toàn Bộ Học Viên Active (${totalStudents} HV)`,
              subtitle: `Tổng hợp tất cả học viên đang theo học tại trung tâm (${displayMonth})`,
            })
          }}
        />
        <OverviewCard
          label="Sắp Kết Thúc"
          value={totalEnd}
          unit="HV"
          tone="rose"
          icon="⚠️"
          sub="Còn ≤ 2 buổi — cần liên hệ gia hạn"
          onClick={() => {
            setDrilldownSearch('')
            setDrilldownTeacherFilter('all')
            setDrilldown({
              isOpen: true,
              mode: 'almost_end',
              title: `⚠️ Học Viên Sắp Kết Thúc Khóa (${totalEnd} HV)`,
              subtitle: 'Còn ≤ 2 buổi học — Cần Sales/CS liên hệ tư vấn gia hạn hoặc lên khóa tiếp theo',
            })
          }}
        />
      </div>

      {/* ── Charts Row 1: Grouped Bar + Student Pie ───────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Grouped bar chart */}
        <div className="col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              📊 Ca Mở / Ca Book / Ca Done — Từng GV ({displayMonth})
            </h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
              👆 Click cột GV để xem chi tiết
            </span>
          </div>
          <TeacherGroupedBar
            data={ranked.map((s) => ({
              name: s.teacherName,
              totalCa: s.monthSummary.totalCa,
              bookedCa: s.monthSummary.bookedCa,
              completedCa: s.monthSummary.completedCa,
              kpiPct: s.monthSummary.kpiPercentage,
            }))}
            onTeacherClick={openTeacherDrilldown}
          />
        </div>

        {/* Student distribution pie */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              👥 Phân Bổ HV Theo GV
            </h3>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
              👆 Click phần bánh
            </span>
          </div>
          <div className="flex justify-center">
            <StudentPieChart
              data={ranked.map((s) => ({ name: s.teacherName, count: s.studentCount }))}
              onTeacherClick={openTeacherDrilldown}
            />
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Center-wide donut + per-GV fill rate bars ──────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Center-wide donut */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center gap-3">
          <h3 className="self-start text-xs font-extrabold uppercase tracking-wider text-slate-700">
            🥧 Tổng Ca Toàn Trung Tâm
          </h3>
          <DonutChart
            size={150}
            slices={[
              { label: 'Đã hoàn thành', value: totalDone, color: '#8b5cf6' },
              {
                label: 'Đã book (chưa xong)',
                value: Math.max(0, totalBooked - totalDone),
                color: '#3b82f6',
              },
              {
                label: 'Rảnh (chưa book)',
                value: Math.max(0, totalCaAll - totalBooked),
                color: '#d1fae5',
              },
            ].filter((s) => s.value > 0)}
            onSliceClick={openSliceDrilldown}
          />
          <div className="w-full grid grid-cols-2 gap-2 text-center text-[10px]">
            <div className="rounded-2xl bg-slate-50 py-2">
              <p className="font-bold uppercase text-slate-400">Fill Rate</p>
              <p className="text-base font-black text-blue-600">
                {totalCaAll > 0 ? Math.round((totalBooked / totalCaAll) * 100) : 0}%
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 py-2">
              <p className="font-bold uppercase text-slate-400">Done Rate</p>
              <p className="text-base font-black text-purple-600">
                {totalBooked > 0 ? Math.round((totalDone / totalBooked) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Per-GV fill rate bar chart */}
        <div className="col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              📈 Fill Rate & Done Rate Từng GV
            </h3>
            <span className="text-[11px] font-bold text-slate-500">
              Click hàng GV để xem chi tiết
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {ranked.map((s) => {
              const fillRate = s.monthSummary.bookRatioPercentage
              const doneRate =
                s.monthSummary.bookedCa > 0
                  ? Math.round((s.monthSummary.completedCa / s.monthSummary.bookedCa) * 100)
                  : 0
              return (
                <div
                  key={s.teacherId}
                  onClick={() => openTeacherDrilldown(s.teacherName)}
                  className="flex flex-col gap-1 p-2 rounded-2xl transition hover:bg-slate-50 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-800 group-hover:text-emerald-700 transition font-extrabold">
                      {s.teacherName} ({s.studentCount} HV)
                    </span>
                    <span className="flex gap-3 text-[10px]">
                      <span className="text-blue-600 font-black">Fill {fillRate}%</span>
                      <span className="text-purple-600 font-black">Done {doneRate}%</span>
                    </span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-blue-400 opacity-50"
                      style={{ width: `${fillRate}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-purple-600"
                      style={{ width: `${doneRate}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-blue-400 opacity-50" />
              Fill Rate (Tỷ lệ lấp đầy ca)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-purple-600" />
              Done Rate (Tỷ lệ hoàn thành ca)
            </span>
          </div>
        </div>
      </div>

      {/* ── Metric Guide / Chú Thích Fill Rate & Done Rate ────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="size-4 text-emerald-700 shrink-0" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            💡 Chú Thích Chỉ Số Hiệu Suất (Metrics Guide)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Fill Rate Card */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 flex flex-col gap-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-3 rounded-full bg-blue-600 shrink-0" />
                <strong className="text-sm font-extrabold text-blue-900">
                  Fill Rate (Tỷ lệ lấp đầy ca)
                </strong>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white text-blue-700 border-blue-300">
                Ca Book (Sales) / Ca Mở (Đăng Ký)
              </Badge>
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed space-y-1">
              <p>
                <strong>• Công thức:</strong>{' '}
                <code className="rounded-md bg-white border border-blue-200 px-1.5 py-0.5 font-bold text-blue-800 font-mono">
                  (Tổng Ca Book ở Lịch Sales ÷ Tổng Ca Mở ở Tab Đăng Ký Lịch) × 100%
                </code>
              </p>
              <p>
                <strong>• Nguồn dữ liệu:</strong>{' '}
                <span><strong>Số ca mở</strong> tính từ tab <em>Đăng Ký Lịch</em> của GV. <strong>Số ca book</strong> tính từ <em>Lịch Sales</em> (buổi học xếp với học viên).</span>
              </p>
              <p>
                <strong>• Ý nghĩa:</strong> Đo lường mức độ khai thác lịch rảnh của Giảng viên. Fill Rate càng cao chứng tỏ ca rảnh được học viên/Sales book hiệu quả, ít bị bỏ phí ca trống.
              </p>
            </div>
          </div>

          {/* Done Rate Card */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 flex flex-col gap-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-3 rounded-full bg-purple-600 shrink-0" />
                <strong className="text-sm font-extrabold text-purple-900">
                  Done Rate (Tỷ lệ hoàn thành ca)
                </strong>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white text-purple-700 border-purple-300">
                Ca Dạy Xong / Ca Book (Sales)
              </Badge>
            </div>
            <div className="text-[11px] text-slate-600 leading-relaxed space-y-1">
              <p>
                <strong>• Công thức:</strong>{' '}
                <code className="rounded-md bg-white border border-purple-200 px-1.5 py-0.5 font-bold text-purple-800 font-mono">
                  (Tổng Ca Đã Dạy Xong ÷ Tổng Ca Book ở Lịch Sales) × 100%
                </code>
              </p>
              <p>
                <strong>• Nguồn dữ liệu:</strong>{' '}
                <span><strong>Số ca hoàn thành</strong> là số ca đã học xong (CS/GV điểm danh hoàn thành). <strong>Số ca book</strong> tính từ <em>Lịch Sales</em>.</span>
              </p>
              <p>
                <strong>• Ý nghĩa:</strong> Đo lường tiến độ hoàn thành các buổi học thực tế của Giảng viên so với kế hoạch đã book (giúp quản trị tiến độ giảng dạy và điểm danh trong tháng).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Teacher Ranking Table with Expandable Rows ────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
            🏆 Bảng Xếp Hạng Giảng Viên — {displayMonth}
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            {ranked.length} Giảng Viên
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Giảng Viên</th>
                <th className="px-4 py-3 text-right" title="Số ca mở tính ở tab Đăng Ký Lịch">
                  Ca Mở (Đăng Ký)
                </th>
                <th className="px-4 py-3 text-right" title="Số ca book tính ở Lịch Sales">
                  Ca Book (Sales)
                </th>
                <th className="px-4 py-3 text-right" title="Số ca đã hoàn thành (điểm danh CS/GV)">
                  Ca Dạy Xong
                </th>
                <th className="px-4 py-3 text-right">Học Viên</th>
                <th className="px-4 py-3 text-right">Sắp End</th>
                <th className="px-4 py-3 text-right">KPI %</th>
                <th className="px-4 py-3 text-right" title="Fill Rate = (Ca Book Sales ÷ Ca Mở Đăng Ký) × 100%">
                  Fill Rate
                </th>
                <th className="px-4 py-3 text-right" title="Done Rate = (Ca Dạy Xong ÷ Ca Book Sales) × 100%">
                  Done Rate
                </th>
                <th className="px-4 py-3 text-center">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranked.map((stat, i) => {
                const expanded = expandedTeacherId === stat.teacherId
                const doneRate =
                  stat.monthSummary.bookedCa > 0
                    ? Math.round(
                        (stat.monthSummary.completedCa / stat.monthSummary.bookedCa) * 100
                      )
                    : 0

                return (
                  <Fragment key={stat.teacherId}>
                    <tr className="hover:bg-slate-50/80 transition cursor-pointer">
                      <td className="px-4 py-3 text-slate-400 font-bold text-xs">{i + 1}</td>
                      <td
                        className="px-4 py-3 font-extrabold text-slate-900 hover:text-emerald-700"
                        onClick={() => openTeacherDrilldown(stat.teacherName)}
                      >
                        {stat.teacherName}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {stat.monthSummary.totalCa}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                        {stat.monthSummary.bookedCa}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-purple-700">
                        {stat.monthSummary.completedCa}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{stat.studentCount}</td>
                      <td className="px-4 py-3 text-right font-mono text-rose-700 font-bold">
                        {stat.almostEndCount > 0 ? stat.almostEndCount : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {stat.monthSummary.kpiPercentage}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600 font-bold">
                        {stat.monthSummary.bookRatioPercentage}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-purple-600 font-bold">
                        {doneRate}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedTeacherId(expanded ? null : stat.teacherId)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                          >
                            {expanded ? (
                              <>
                                <ChevronUp className="size-3.5" /> Thu gọn
                              </>
                            ) : (
                              <>
                                <ChevronDown className="size-3.5" /> Xem HV
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expanded && (
                      <tr>
                        <td colSpan={11} className="bg-slate-50/80 px-6 py-4">
                          <StudentList
                            students={stat.studentTracking}
                            teacherName={stat.teacherName}
                            onSelectStudent={onSelectStudent}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100 text-xs font-extrabold text-slate-700">
                <td colSpan={2} className="px-4 py-3 uppercase tracking-wide">
                  Tổng cộng
                </td>
                <td className="px-4 py-3 text-right font-mono">{totalCaAll}</td>
                <td className="px-4 py-3 text-right font-mono text-blue-700">{totalBooked}</td>
                <td className="px-4 py-3 text-right font-mono text-purple-700">{totalDone}</td>
                <td className="px-4 py-3 text-right font-mono">{totalStudents}</td>
                <td className="px-4 py-3 text-right font-mono text-rose-700">
                  {totalEnd > 0 ? totalEnd : '—'}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Interactive Drilldown Modal ────────────────────────────────────── */}
      {drilldown?.isOpen && (
        <Dialog open={drilldown.isOpen} onOpenChange={(open) => !open && setDrilldown(null)}>
          <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border-slate-200">
            <DialogHeader className="flex flex-col gap-1 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-black text-slate-900">
                  {drilldown.title}
                </DialogTitle>
              </div>
              <p className="text-xs font-medium text-slate-500">{drilldown.subtitle}</p>
            </DialogHeader>

            {/* Teacher Detail Summary Banner (if in teacher_detail mode) */}
            {drilldown.mode === 'teacher_detail' && selectedTeacherStat && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 rounded-2xl bg-slate-50 border border-slate-200 p-3.5 text-center">
                <div className="rounded-xl bg-white p-2 shadow-2xs">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Ca Mở</span>
                  <strong className="text-base font-black text-emerald-800">
                    {selectedTeacherStat.monthSummary.totalCa} ca
                  </strong>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-2xs">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Đã Book</span>
                  <strong className="text-base font-black text-blue-700">
                    {selectedTeacherStat.monthSummary.bookedCa} ca
                  </strong>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-2xs">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Dạy Xong</span>
                  <strong className="text-base font-black text-purple-700">
                    {selectedTeacherStat.monthSummary.completedCa} ca
                  </strong>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-2xs">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Fill Rate</span>
                  <strong className="text-base font-black text-indigo-700">
                    {selectedTeacherStat.monthSummary.bookRatioPercentage}%
                  </strong>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-2xs col-span-2 sm:col-span-1">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">KPI</span>
                  <strong
                    className={cn(
                      'text-base font-black',
                      selectedTeacherStat.monthSummary.kpiPercentage >= 90
                        ? 'text-emerald-700'
                        : 'text-amber-600'
                    )}
                  >
                    {selectedTeacherStat.monthSummary.kpiPercentage}%
                  </strong>
                </div>
              </div>
            )}

            {/* Total Ca / Total Booked Breakdown by Teacher */}
            {(drilldown.mode === 'total_ca' || drilldown.mode === 'total_booked') && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ranked.map((stat, idx) => (
                  <div
                    key={stat.teacherId}
                    onClick={() => openTeacherDrilldown(stat.teacherName)}
                    className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 hover:border-emerald-400 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition truncate">
                          {stat.teacherName}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold font-mono shrink-0">
                        {stat.studentCount} HV
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-2 text-center text-[10px]">
                      <div>
                        <span className="text-slate-400 font-semibold block">Ca Mở</span>
                        <strong className="text-xs font-black text-emerald-800">
                          {stat.monthSummary.totalCa}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Đã Book</span>
                        <strong className="text-xs font-black text-blue-700">
                          {stat.monthSummary.bookedCa}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Fill Rate</span>
                        <strong className="text-xs font-black text-purple-700">
                          {stat.monthSummary.bookRatioPercentage}%
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] font-bold text-emerald-700 flex items-center justify-end gap-1 mt-1 group-hover:underline">
                      <span>Xem danh sách học viên</span>
                      <ArrowRight className="size-3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Controls Bar: Search & Teacher Filter */}
            {drilldown.mode !== 'total_ca' && drilldown.mode !== 'total_booked' && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Tìm theo tên HV, mã HV, khóa học, giáo viên, aim..."
                    value={drilldownSearch}
                    onChange={(e) => setDrilldownSearch(e.target.value)}
                    className="h-9 pl-9 pr-8 rounded-2xl text-xs bg-white border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                  />
                  {drilldownSearch && (
                    <button
                      type="button"
                      onClick={() => setDrilldownSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {/* Teacher Filter Pills if viewing all students */}
                {drilldown.mode === 'all_students' && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDrilldownTeacherFilter('all')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl transition-all shadow-2xs',
                        drilldownTeacherFilter === 'all'
                          ? 'bg-slate-900 text-white font-black'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}
                    >
                      Tất cả GV ({allStudents.length})
                    </button>
                    {stats.map((st) => (
                      <button
                        key={st.teacherId}
                        type="button"
                        onClick={() => setDrilldownTeacherFilter(st.teacherName)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl transition-all shadow-2xs',
                          drilldownTeacherFilter === st.teacherName
                            ? 'bg-emerald-700 text-white font-black'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                      >
                        {st.teacherName} ({st.studentCount})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Students Grid in Modal */}
            {drilldown.mode !== 'total_ca' && drilldown.mode !== 'total_booked' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                  <span>
                    Danh sách hiển thị: <strong>{filteredModalStudents.length}</strong> học viên
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Bấm vào thẻ để xem chi tiết lộ trình buổi học
                  </span>
                </div>

                {filteredModalStudents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-bold text-slate-400">
                    Không tìm thấy học viên nào phù hợp với bộ lọc.
                  </div>
                ) : (
                  <div className="grid gap-3.5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 max-h-[55vh] overflow-y-auto pr-1">
                    {filteredModalStudents.map((s) => (
                      <div
                        key={`${s.teacherId}-${s.studentCode}-${s.course}`}
                        onClick={() => {
                          setDrilldown(null)
                          onSelectStudent?.(s)
                        }}
                        className={cn(
                          'flex flex-col gap-2.5 rounded-2xl border p-4 text-xs cursor-pointer hover:shadow-md transition-all group overflow-hidden relative',
                          s.almostEnd
                            ? 'border-rose-300 bg-rose-50/40 hover:border-rose-500'
                            : 'border-slate-200 bg-white hover:border-emerald-500'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700 transition truncate flex items-center gap-1.5">
                              <span className="truncate">{s.studentName}</span>
                              {s.almostEnd && (
                                <span className="text-xs text-rose-600 shrink-0" title="Sắp hết khóa">
                                  ⚠️
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {s.studentCode}
                            </span>
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0 max-w-[130px] truncate"
                          >
                            👨‍🏫 {s.teacherName}
                          </Badge>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-2.5 text-[11px] font-semibold text-slate-700 flex flex-col gap-1">
                          <div className="font-extrabold text-slate-900 truncate">{s.course}</div>
                          {s.aim && (
                            <div className="text-[10px] text-emerald-800 font-bold truncate">
                              🎯 Aim: {s.aim}
                            </div>
                          )}
                          {s.studentNote && (
                            <div className="text-[10px] text-slate-500 italic truncate" title={s.studentNote}>
                              💬 {s.studentNote}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-500">Tiến độ:</span>
                            <span
                              className={cn(
                                'font-mono text-[11px]',
                                s.almostEnd ? 'text-rose-700 font-extrabold' : 'text-slate-800 font-extrabold'
                              )}
                            >
                              Đã học {s.completed}/{s.total} buổi {s.remaining > 0 ? `(Còn ${s.remaining})` : '(Đã xong)'}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                s.almostEnd
                                  ? 'bg-rose-500'
                                  : s.pct >= 80
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-600'
                              )}
                              style={{ width: `${Math.min(s.pct, 100)}%` }}
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-full rounded-xl text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900 transition flex items-center justify-center gap-1.5 mt-1 overflow-hidden"
                        >
                          <BookOpen className="size-3.5 shrink-0" />
                          <span className="truncate">Xem Lộ Trình & Điểm Danh</span>
                          <ArrowRight className="size-3 shrink-0" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <LeadCapacityCalculatorDialog
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        initialEmptySlots={totalEmptySlots || 46}
      />
    </div>
  )
}

function OverviewCard({
  label,
  value,
  unit,
  tone,
  icon,
  sub,
  onClick,
}: {
  label: string
  value: number
  unit: string
  tone: string
  icon: string
  sub: string
  onClick?: () => void
}) {
  const text =
    tone === 'blue'
      ? 'text-blue-700'
      : tone === 'purple'
        ? 'text-purple-700'
        : tone === 'rose'
          ? 'text-rose-700'
          : 'text-emerald-800'
  const border =
    tone === 'blue'
      ? 'border-blue-200 bg-blue-50/40 hover:border-blue-400'
      : tone === 'purple'
        ? 'border-purple-200 bg-purple-50/40 hover:border-purple-400'
        : tone === 'rose'
          ? 'border-rose-200 bg-rose-50/40 hover:border-rose-400'
          : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-3xl border p-5 shadow-sm transition-all relative overflow-hidden group',
        border,
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.99]' : ''
      )}
    >
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-extrabold uppercase tracking-wider ${text}`}>
          {label}
        </span>
        <span className="text-xl transition-transform group-hover:scale-110">{icon}</span>
      </div>
      <div className={`text-4xl font-black ${text}`}>
        {value}
        <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>
      </div>
      <p className="text-[11px] font-medium text-slate-500">{sub}</p>

      {onClick && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-slate-700 transition">
          <span>Bấm xem chi tiết</span>
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
        </div>
      )}
    </div>
  )
}

function StudentList({
  students,
  teacherName,
  onSelectStudent,
}: {
  students: AdminTeacherStat['studentTracking']
  teacherName?: string
  onSelectStudent?: (student: AdminTeacherStat['studentTracking'][number]) => void
}) {
  if (students.length === 0)
    return <p className="text-xs text-slate-400">Chưa có học viên nào.</p>
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
          {students.length} Học Viên của {teacherName ?? 'Giảng viên'} (Bấm thẻ để xem & điểm danh tất
          cả buổi)
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <div
            key={s.studentCode}
            onClick={() => onSelectStudent?.(s)}
            className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 text-xs cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all ${
              s.almostEnd ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-slate-900 hover:text-emerald-700">
                {s.studentName}
                {s.almostEnd && <span className="ml-1 text-rose-600">⚠️</span>}
              </span>
              <span className="shrink-0 rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                {s.studentCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">{s.course}</p>
            {s.aim && (
              <p className="text-[10px] text-emerald-800 font-semibold">🎯 Aim: {s.aim}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${s.almostEnd ? 'bg-rose-500' : 'bg-emerald-600'}`}
                  style={{ width: `${Math.min(s.pct, 100)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] font-bold text-slate-600">
                {s.completed}/{s.total}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
