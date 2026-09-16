import { useState } from 'react'
import type { SchedulerProps } from '../types'
import { DonutChart, StudentProgressBars } from './analytics-charts'

// ── Snapshot type stored in localStorage ────────────────────────────────────
type MonthSnapshot = {
  monthKey: string
  totalCa: number
  bookedCa: number
  completedCa: number
  availableCa: number
  kpiPercentage: number
  bookRatioPercentage: number
  monthlyCommitment: number
  weeklyKpis: Array<{ week: string; count: number; target: number; pct: number }>
}

const SNAPSHOT_KEY = 'kpi_month_snapshots_v1'

function readSnapshots(): MonthSnapshot[] {
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MonthSnapshot[]) : []
  } catch {
    return []
  }
}

function writeSnapshots(list: MonthSnapshot[]) {
  window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list.slice(-6))) // keep last 6
}

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  monthSummary: SchedulerProps['monthSummary']
  monthKey: string
  weeklyKpis: SchedulerProps['weeklyKpis']
  editableWeeklyTargets?: boolean
  onWeeklyTargetChange?: (week: string, target: number) => void
  studentTracking?: SchedulerProps['studentTracking']
}

// ── Main component ────────────────────────────────────────────────────────────

export function KpiPanels({
  monthSummary,
  monthKey,
  weeklyKpis,
  editableWeeklyTargets = false,
  onWeeklyTargetChange,
  studentTracking = [],
}: Props) {
  // Compare mode (Month vs Month only)
  const [compareMode, setCompareMode] = useState<'none' | 'month'>('none')
  const [snapshots, setSnapshots] = useState<MonthSnapshot[]>(() => readSnapshots())
  const [compareMonthKey, setCompareMonthKey] = useState<string | null>(null)
  const [savedBadge, setSavedBadge] = useState(false)

  const completionRate =
    monthSummary.bookedCa > 0
      ? Math.round((monthSummary.completedCa / monthSummary.bookedCa) * 100)
      : 0

  const totalWeeklyCa =
    weeklyKpis.length > 0
      ? weeklyKpis.reduce((acc, w) => acc + (w.count || 0), 0)
      : monthSummary.totalCa
  const totalWeeklyAvailableCa =
    weeklyKpis.length > 0
      ? weeklyKpis.reduce((acc, w) => acc + ((w as { availableCa?: number }).availableCa ?? w.count ?? 0), 0)
      : monthSummary.availableCa
  const displayKpiPercentage =
    monthSummary.monthlyCommitment > 0
      ? Math.round((totalWeeklyCa / monthSummary.monthlyCommitment) * 100)
      : monthSummary.kpiPercentage

  const statusSlices = [
    { label: 'Đã hoàn thành', value: monthSummary.completedCa, color: '#8b5cf6' },
    {
      label: 'Đã book (chưa dạy)',
      value: Math.max(0, monthSummary.bookedCa - monthSummary.completedCa),
      color: '#3b82f6',
    },
    {
      label: 'Ca rảnh trống',
      value: Math.max(0, totalWeeklyCa - monthSummary.bookedCa),
      color: '#d1fae5',
    },
  ].filter((s) => s.value > 0)

  // ── Student status metrics ────────────────────────────────────────────────
  const totalStudentsTaken = studentTracking.length
  const doneStudents = studentTracking.filter(
    (s) => s.isEnded || (s.total > 0 && s.remaining === 0) || (s.total > 0 && s.completed >= s.total)
  ).length
  const reservedStudents = studentTracking.filter(
    (s) => s.isReserved || s.status === 'reserved'
  ).length
  const upcomingStudents = studentTracking.filter(
    (s) => !s.isReserved && !s.isEnded && s.completed === 0 && s.total > 0
  ).length

  // Only include students currently studying (active, not ended, remaining > 0)
  const activeStudents = studentTracking.filter(
    (s) => s.isActive !== false && !s.isEnded && s.remaining > 0
  )

  const almostEndCount = activeStudents.filter((s) => s.almostEnd).length
  const activeCount = activeStudents.length

  // ── Save current month snapshot ──────────────────────────────────────────
  const saveSnapshot = () => {
    const snap: MonthSnapshot = {
      monthKey,
      totalCa: totalWeeklyCa,
      bookedCa: monthSummary.bookedCa,
      completedCa: monthSummary.completedCa,
      availableCa: totalWeeklyAvailableCa,
      kpiPercentage: displayKpiPercentage,
      bookRatioPercentage: monthSummary.bookRatioPercentage,
      monthlyCommitment: monthSummary.monthlyCommitment,
      weeklyKpis,
    }
    const next = [...snapshots.filter((s) => s.monthKey !== monthKey), snap]
    setSnapshots(next)
    writeSnapshots(next)
    setSavedBadge(true)
    setTimeout(() => setSavedBadge(false), 2000)
  }

  const deleteSnapshot = (key: string) => {
    const next = snapshots.filter((s) => s.monthKey !== key)
    setSnapshots(next)
    writeSnapshots(next)
    if (compareMonthKey === key) setCompareMonthKey(null)
  }

  // ── Compared month snapshot ──────────────────────────────────────────────
  const cmpSnap = snapshots.find((s) => s.monthKey === compareMonthKey)

  const monthlyCards = [
    {
      label: '🎯 Tổng Ca Mở / KPI',
      value: `${totalWeeklyCa} / ${monthSummary.monthlyCommitment}`,
      meta: `${displayKpiPercentage}%`,
      pct: displayKpiPercentage,
      tone: 'emerald',
      description: 'Tổng ca mở đăng ký sẵn sàng nhận học viên (tính ở tab Đăng Ký Lịch).',
      cmp: cmpSnap ? `${cmpSnap.totalCa} / ${cmpSnap.monthlyCommitment}` : null,
      cmpPct: cmpSnap?.kpiPercentage ?? null,
    },
    {
      label: '📚 Ca Được Book (Lịch Sales)',
      value: `${monthSummary.bookedCa}`,
      meta: `${monthSummary.bookRatioPercentage}% Fill Rate`,
      pct: monthSummary.bookRatioPercentage,
      tone: 'blue',
      description: 'Số ca thực tế được phòng Sales xếp lịch học (tính ở Lịch Sales).',
      cmp: cmpSnap ? `${cmpSnap.bookedCa}` : null,
      cmpPct: cmpSnap?.bookRatioPercentage ?? null,
    },
    {
      label: '✅ Ca Đã Hoàn Thành',
      value: `${monthSummary.completedCa}`,
      meta: `${completionRate}% Done Rate`,
      pct: completionRate,
      tone: 'purple',
      description: 'Số buổi học đã dạy xong (điểm danh CS/GV).',
      cmp: cmpSnap ? `${cmpSnap.completedCa}` : null,
      cmpPct: cmpSnap
        ? cmpSnap.bookedCa > 0
          ? Math.round((cmpSnap.completedCa / cmpSnap.bookedCa) * 100)
          : 0
        : null,
    },
    {
      label: '🟢 Ca Rảnh',
      value: `${totalWeeklyAvailableCa}`,
      meta: 'Available',
      pct: 100,
      tone: 'emerald',
      description: 'Số ca rảnh chưa có học viên đăng ký.',
      cmp: cmpSnap ? `${cmpSnap.availableCa}` : null,
      cmpPct: null,
    },
  ]

  return (
    <section aria-label="KPI giáo viên" className="flex flex-col gap-5">

      {/* ── Toolbar: compare mode buttons ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            So Sánh:
          </span>
          <button
            type="button"
            onClick={() => setCompareMode(compareMode === 'month' ? 'none' : 'month')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              compareMode === 'month'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            📅 Tháng vs Tháng
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveSnapshot}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
          >
            {savedBadge ? '✅ Đã lưu!' : '💾 Lưu tháng này'}
          </button>
          <span className="text-[10px] text-slate-400">{snapshots.length} snapshot đã lưu</span>
        </div>
      </div>

      {/* ── Month comparison panel ─────────────────────────────────── */}
      {compareMode === 'month' && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
              📅 So Sánh Tháng — Chọn tháng muốn so sánh với {monthKey}
            </h3>
            {snapshots.length === 0 && (
              <span className="text-[11px] text-blue-500">
                Chưa có snapshot. Bấm "Lưu tháng này" khi đang ở tháng muốn so sánh.
              </span>
            )}
          </div>

          {/* Snapshot list */}
          <div className="mb-4 flex flex-wrap gap-2">
            {snapshots.map((s) => (
              <div key={s.monthKey} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCompareMonthKey(s.monthKey === compareMonthKey ? null : s.monthKey)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    compareMonthKey === s.monthKey
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {s.monthKey}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSnapshot(s.monthKey)}
                  className="flex size-5 items-center justify-center rounded-full bg-slate-200 text-[9px] text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Side-by-side KPI comparison */}
          {cmpSnap && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-xs">
                <thead>
                  <tr className="border-b border-blue-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 text-left">Chỉ số</th>
                    <th className="py-2 text-right text-emerald-700">{monthKey} (hiện tại)</th>
                    <th className="py-2 text-right text-blue-600">{cmpSnap.monthKey} (so sánh)</th>
                    <th className="py-2 text-right text-slate-400">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {[
                    { label: 'Tổng Ca Mở', a: monthSummary.totalCa, b: cmpSnap.totalCa },
                    { label: 'Ca Book', a: monthSummary.bookedCa, b: cmpSnap.bookedCa },
                    { label: 'Ca Completed', a: monthSummary.completedCa, b: cmpSnap.completedCa },
                    { label: 'KPI %', a: monthSummary.kpiPercentage, b: cmpSnap.kpiPercentage, unit: '%' },
                    { label: 'Fill Rate', a: monthSummary.bookRatioPercentage, b: cmpSnap.bookRatioPercentage, unit: '%' },
                  ].map((row) => {
                    const diff = row.a - row.b
                    const unit = row.unit ?? ' ca'
                    return (
                      <tr key={row.label} className="hover:bg-blue-50/50">
                        <td className="py-2 font-semibold text-slate-700">{row.label}</td>
                        <td className="py-2 text-right font-black text-emerald-700">
                          {row.a}{unit}
                        </td>
                        <td className="py-2 text-right font-black text-blue-600">
                          {row.b}{unit}
                        </td>
                        <td className={`py-2 text-right font-extrabold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}{unit}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Cards: Ca Dạy ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {monthlyCards.map((card) => (
          <Kpi
            key={card.label}
            label={card.label}
            value={card.value}
            meta={card.meta}
            pct={card.pct}
            tone={card.tone}
            description={card.description}
            compareValue={card.cmp}
            comparePct={card.cmpPct}
          />
        ))}
      </div>

      {/* ── Chỉ Số Học Viên Phụ Trách ─────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <span>👥</span> Thống Kê Học Viên Phụ Trách
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StudentMetricCard
            label="👥 HV Đã Take"
            value={totalStudentsTaken}
            meta="Tổng nhận"
            tone="emerald"
            description="Tổng số học viên được bàn giao & phụ trách."
          />
          <StudentMetricCard
            label="🎓 HV Đã Done Khóa"
            value={doneStudents}
            meta={`${totalStudentsTaken > 0 ? Math.round((doneStudents / totalStudentsTaken) * 100) : 0}% done`}
            tone="purple"
            description="Học viên đã học hoàn thành 100% khóa học."
          />
          <StudentMetricCard
            label="⏸️ HV Bảo Lưu"
            value={reservedStudents}
            meta="Tạm dừng"
            tone="amber"
            description="Học viên đang trong trạng thái bảo lưu."
          />
          <StudentMetricCard
            label="🚀 HV Sắp Khai Giảng"
            value={upcomingStudents}
            meta="Sắp bắt đầu"
            tone="blue"
            description="Học viên mới sắp học buổi đầu tiên."
          />
        </div>
      </div>

      {/* ── Phân Bổ Ca Tháng (Tháng {monthKey}) ──────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>🥧</span> Phân Bổ Ca Tháng {monthKey}
          </h3>
          <p className="text-xs text-slate-500 font-medium max-w-md">
            Biểu đồ phân bổ cơ cấu tổng ca mở rảnh sẵn sàng, ca đã được phòng Sales xếp lịch học và ca đã hoàn thành giảng dạy trong tháng {monthKey}.
          </p>
        </div>

        <div className="flex items-center gap-6 flex-wrap justify-center">
          <DonutChart slices={statusSlices} size={135} />
          <div className="grid grid-cols-2 gap-3 min-w-[260px]">
            <div
              className="rounded-2xl bg-blue-50/70 p-3.5 text-center border border-blue-100 shadow-2xs"
              title="Fill Rate = (Ca Book ở Lịch Sales ÷ Ca Mở ở Tab Đăng Ký Lịch) × 100%"
            >
              <p className="text-[10px] font-bold uppercase text-blue-700">Fill Rate (Sales / Mở)</p>
              <p className="text-xl font-black text-blue-800">{monthSummary.bookRatioPercentage}%</p>
            </div>
            <div
              className="rounded-2xl bg-purple-50/70 p-3.5 text-center border border-purple-100 shadow-2xs"
              title="Done Rate = (Ca Hoàn Thành ÷ Ca Book ở Lịch Sales) × 100%"
            >
              <p className="text-[10px] font-bold uppercase text-purple-700">Done Rate (Dạy Xong / Book)</p>
              <p className="text-xl font-black text-purple-800">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly KPI tiles ──────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wider text-slate-950">
          📅 Chi Tiết Ca Mở Theo Từng Tuần (Tháng {monthKey})
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {weeklyKpis.map((week) => (
            <WeeklyKpi
              key={week.week}
              week={week.week}
              count={week.count}
              target={week.target}
              pct={week.pct}
              editable={editableWeeklyTargets}
              onTargetChange={onWeeklyTargetChange}
            />
          ))}
        </div>
      </div>

      {/* ── Student progress bars (Only currently studying students) ─────────────────── */}
      {activeStudents.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              👥 Tiến Độ Học Viên Đang Học ({activeCount} HV)
            </h3>
            {almostEndCount > 0 && (
              <span className="rounded-xl bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">
                ⚠ {almostEndCount} HV sắp kết thúc
              </span>
            )}
          </div>
          <StudentProgressBars
            students={activeStudents.map((s) => ({
              name: s.studentName,
              code: s.studentCode,
              completed: s.completed,
              total: s.total,
              almostEnd: s.almostEnd,
            }))}
          />
        </div>
      )}
    </section>
  )
}

// ── Student Metric Card ──────────────────────────────────────────────────────

function StudentMetricCard({
  label,
  value,
  meta,
  tone,
  description,
}: {
  label: string
  value: number | string
  meta: string
  tone: 'emerald' | 'purple' | 'amber' | 'blue'
  description: string
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-xs font-bold uppercase tracking-wider ${toneText(tone)}`}>
          {label}
        </span>
        <span className={`shrink-0 rounded-xl border px-2.5 py-1 font-mono text-xs font-bold ${toneBadge(tone)}`}>
          {meta}
        </span>
      </div>
      <div className="text-3xl font-black text-slate-900">
        {value} <span className="text-sm font-semibold text-slate-400">học viên</span>
      </div>
      <p className="text-[11px] font-medium text-slate-500">{description}</p>
    </div>
  )
}

// ── KPI Card with optional compare value ─────────────────────────────────────

function Kpi({
  label, value, meta, pct, tone, description, compareValue, comparePct,
}: {
  label: string; value: string; meta: string; pct: number; tone: string; description: string
  compareValue?: string | null; comparePct?: number | null
}) {
  const diff = compareValue != null ? Number(value.split(' / ')[0]) - Number(compareValue.split(' / ')[0]) : null
  return (
    <div className="flex min-w-0 flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-xs font-bold uppercase tracking-wider ${toneText(tone)}`}>{label}</span>
        <span className={`shrink-0 rounded-xl border px-2.5 py-1 font-mono text-xs font-bold ${toneBadge(tone)}`}>{meta}</span>
      </div>
      <div className="text-3xl font-black text-slate-900">
        {value.split(' / ')[0]}
        {value.includes(' / ') && <span className="text-sm font-normal text-slate-500"> / {value.split(' / ')[1]} ca</span>}
      </div>
      <Progress pct={pct} tone={tone} />
      {/* Compare row */}
      {compareValue != null && (
        <div className="flex items-center justify-between rounded-xl bg-blue-50 px-3 py-1.5 text-[10px]">
          <span className="font-semibold text-blue-600">So sánh: {compareValue}</span>
          {diff !== null && (
            <span className={`font-extrabold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
              {diff > 0 ? '+' : ''}{diff}
            </span>
          )}
        </div>
      )}
      <p className="text-[11px] font-medium text-slate-500">{description}</p>
    </div>
  )
}

// ── WeeklyKpi tile ────────────────────────────────────────────────────────────

function WeeklyKpi({
  week, count, target, pct, editable, onTargetChange,
}: {
  week: string; count: number; target: number; pct: number; editable: boolean
  onTargetChange?: (week: string, target: number) => void
}) {
  const complete = pct >= 100
  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner" data-week-kpi={week}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-700">{week}</span>
        <span className={`font-bold ${complete ? 'text-emerald-700' : 'text-amber-600'}`}>{pct}% Target</span>
      </div>
      <div className="flex items-baseline gap-1 text-2xl font-black text-slate-900">
        <span>{count}</span>
        <span className="text-xs font-normal text-slate-500">/</span>
        {editable ? (
          <input
            aria-label={`Mục tiêu ${week}`}
            className="w-12 rounded-lg border border-slate-300 bg-white px-1.5 py-0.5 text-center text-xs font-extrabold text-emerald-800 shadow-sm"
            min={1}
            onChange={(event) => {
              const nextTarget = Number(event.target.value)
              if (Number.isInteger(nextTarget) && nextTarget > 0) onTargetChange?.(week, nextTarget)
            }}
            type="number"
            value={target}
          />
        ) : (
          <span className="text-sm font-black text-emerald-800 bg-emerald-100/70 border border-emerald-200/80 px-2 py-0.5 rounded-lg font-mono">
            {target}
          </span>
        )}
        <span className="text-xs font-normal text-slate-500">ca</span>
      </div>
      <Progress pct={pct} tone={complete ? 'emerald' : 'amber'} />
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Progress({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all duration-500 ${toneBar(tone)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function toneText(tone: string) {
  if (tone === 'blue') return 'text-blue-600'
  if (tone === 'purple') return 'text-purple-600'
  if (tone === 'amber') return 'text-amber-600'
  return 'text-emerald-800'
}

function toneBadge(tone: string) {
  if (tone === 'blue') return 'border-blue-200 bg-blue-50 text-blue-600'
  if (tone === 'purple') return 'border-purple-200 bg-purple-50 text-purple-600'
  if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-600'
  return 'border-emerald-200 bg-emerald-50 text-emerald-800'
}

function toneBar(tone: string) {
  if (tone === 'blue') return 'bg-blue-600'
  if (tone === 'purple') return 'bg-purple-600'
  if (tone === 'amber') return 'bg-amber-500'
  return 'bg-emerald-700'
}

