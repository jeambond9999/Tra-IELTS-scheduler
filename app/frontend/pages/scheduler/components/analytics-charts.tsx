import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

export type WeeklyBarDatum = {
  week: string
  count: number
  target: number
}

export type DonutSlice = {
  label: string
  value: number
  color: string
}

export type TeacherBar = {
  name: string
  totalCa: number
  bookedCa: number
  completedCa: number
  kpiPct: number
}

export type StudentProgress = {
  name: string
  code: string
  completed: number
  total: number
  almostEnd: boolean
}

// ─── 1. Line + Bar chart — Weekly Ca Mở vs Target ────────────────────────────

export function WeeklyLineChart({ data }: { data: WeeklyBarDatum[] }) {
  if (data.length === 0) return null

  const W = 560
  const H = 160
  const PAD = { top: 16, right: 20, bottom: 36, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.flatMap((d) => [d.count, d.target]), 1)
  const n = data.length

  const xPos = (i: number) => PAD.left + (i / (n - 1 || 1)) * chartW
  const yPos = (v: number) => PAD.top + (1 - v / maxVal) * chartH
  const barW = Math.max(8, (chartW / n) * 0.4)

  const linePath = (key: 'count' | 'target') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yPos(d[key])}`).join(' ')

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }} aria-label="Biểu đồ ca mở theo tuần">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD.top + frac * chartH
          const val = Math.round(maxVal * (1 - frac))
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{val}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const bh = (d.count / maxVal) * chartH
          const color = d.count >= d.target ? '#059669' : d.count >= d.target * 0.7 ? '#f59e0b' : '#ef4444'
          return <rect key={i} x={xPos(i) - barW / 2} y={PAD.top + chartH - bh} width={barW} height={bh} fill={color} opacity={0.8} rx={3} />
        })}
        <path d={linePath('target')} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" />
        <path d={linePath('count')} fill="none" stroke="#059669" strokeWidth={2} />
        {data.map((d, i) => (
          <circle key={i} cx={xPos(i)} cy={yPos(d.count)} r={4} fill="#059669" stroke="white" strokeWidth={1.5} />
        ))}
        {data.map((d, i) => (
          <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle" fontSize={8.5} fill="#64748b" fontWeight={600}>
            {d.week.length > 8 ? d.week.slice(0, 7) + '\u2026' : d.week}
          </text>
        ))}
      </svg>
      <div className="mt-1 flex items-center gap-4 px-1 text-[10px] font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600 opacity-80" />Ca mở thực tế</span>
        <span className="flex items-center gap-1.5"><svg width="14" height="4"><line x1={0} y1={2} x2={14} y2={2} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 2" /></svg>Mục tiêu</span>
      </div>
    </div>
  )
}

export function DonutChart({
  slices,
  size = 140,
  title,
  onSliceClick,
}: {
  slices: DonutSlice[]
  size?: number
  title?: string
  onSliceClick?: (sliceLabel: string) => void
}) {
  const total = slices.reduce((s, d) => s + d.value, 0)
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center gap-2 py-4 text-xs text-slate-400">
      <svg viewBox="0 0 140 140" width={size}><circle cx={70} cy={70} r={52} fill="none" stroke="#e2e8f0" strokeWidth={22} /></svg>
      {title && <span className="font-bold text-slate-500">{title}</span>}
      <span>Chưa có dữ liệu</span>
    </div>
  )

  const R = 52; const CX = 70; const CY = 70; const STROKE = 22
  let cumAngle = -90

  const paths = slices.filter((s) => s.value > 0).map((s) => {
    const pct = s.value / total
    const sweep = pct * 360
    const startRad = (cumAngle * Math.PI) / 180
    const endRad = ((cumAngle + sweep) * Math.PI) / 180
    const x1 = CX + R * Math.cos(startRad); const y1 = CY + R * Math.sin(startRad)
    const x2 = CX + R * Math.cos(endRad); const y2 = CY + R * Math.sin(endRad)
    const large = sweep > 180 ? 1 : 0
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
    cumAngle += sweep
    return { ...s, d, pct }
  })

  return (
    <div className="flex flex-col items-center gap-3">
      {title && (
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
          {title}
        </p>
      )}
      <svg viewBox="0 0 140 140" width={size} aria-label={title ?? 'Biểu đồ tròn'}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={STROKE}
            strokeLinecap="butt"
            opacity={0.9}
            onClick={() => onSliceClick?.(p.label)}
            className={onSliceClick ? 'cursor-pointer transition-all duration-200 hover:opacity-100 hover:brightness-110' : ''}
          />
        ))}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={18} fontWeight={800} fill="#0f172a">{total}</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize={9} fill="#64748b" fontWeight={600}>
          {title?.includes('HV') ? 'HV' : 'ca'}
        </text>
      </svg>
      <div className="flex flex-col gap-1 text-[10px] w-full">
        {slices.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onSliceClick?.(s.label)}
            className={cn(
              'flex items-center gap-1.5 p-1 rounded-lg text-left transition-all',
              onSliceClick ? 'hover:bg-slate-100 cursor-pointer' : ''
            )}
          >
            <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="font-semibold text-slate-600 truncate">{s.label}</span>
            <span className="ml-auto pl-2 font-black tabular-nums text-slate-800">{s.value}</span>
            <span className="text-slate-400">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 3. Grouped Bar Chart — Admin per-teacher ─────────────────────────────

export function TeacherGroupedBar({
  data,
  onTeacherClick,
}: {
  data: TeacherBar[]
  onTeacherClick?: (teacherName: string) => void
}) {
  if (data.length === 0) return null

  const W = 600; const H = 200
  const PAD = { top: 12, right: 16, bottom: 52, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.flatMap((d) => [d.totalCa, d.bookedCa, d.completedCa]), 1)
  const n = data.length
  const groupW = chartW / n
  const barW = Math.max(6, (groupW * 0.7) / 3)
  const gap = barW * 0.15
  const yPos = (v: number) => PAD.top + (1 - v / maxVal) * chartH
  const COLORS = ['#059669', '#3b82f6', '#8b5cf6']
  const KEYS: (keyof TeacherBar)[] = ['totalCa', 'bookedCa', 'completedCa']
  const LABELS = ['Ca Mở', 'Ca Book', 'Ca Done']

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }} aria-label="Biểu đồ so sánh giảng viên">
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD.top + frac * chartH
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{Math.round(maxVal * (1 - frac))}</text>
            </g>
          )
        })}
        {data.map((d, gi) => {
          const groupCx = PAD.left + gi * groupW + groupW / 2
          const startX = groupCx - (barW * 3 + gap * 2) / 2
          return (
            <g
              key={gi}
              onClick={() => onTeacherClick?.(d.name)}
              className={onTeacherClick ? 'cursor-pointer transition-opacity hover:opacity-80' : ''}
            >
              {/* Background hover highlight */}
              <rect
                x={PAD.left + gi * groupW + 2}
                y={PAD.top}
                width={groupW - 4}
                height={chartH + 40}
                fill="transparent"
                className="hover:fill-slate-100/60 transition-colors"
                rx={6}
              />
              {KEYS.map((k, ki) => {
                const val = d[k] as number
                const bh = Math.max(1, (val / maxVal) * chartH)
                const x = startX + ki * (barW + gap)
                return (
                  <g key={ki}>
                    <rect x={x} y={yPos(val)} width={barW} height={bh} fill={COLORS[ki]} rx={2} opacity={0.85} />
                    {val > 0 && bh > 12 && (
                      <text x={x + barW / 2} y={yPos(val) + 9} textAnchor="middle" fontSize={7.5} fill="white" fontWeight={700}>{val}</text>
                    )}
                  </g>
                )
              })}
              <text x={groupCx} y={H - 28} textAnchor="middle" fontSize={8.5} fill="#0f172a" fontWeight={800}>
                {d.name.length > 10 ? d.name.slice(0, 9) + '\u2026' : d.name}
              </text>
              <text x={groupCx} y={H - 14} textAnchor="middle" fontSize={7.5} fill={d.kpiPct >= 90 ? '#059669' : d.kpiPct >= 70 ? '#d97706' : '#ef4444'} fontWeight={700}>
                KPI {d.kpiPct}%
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-[10px] font-semibold text-slate-500">
        <div className="flex items-center gap-3">
          {LABELS.map((l, i) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i], opacity: 0.85 }} />{l}
            </span>
          ))}
        </div>
        {onTeacherClick && (
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
            💡 Click vào cột GV để xem chi tiết học viên
          </span>
        )}
      </div>
    </div>
  )
}

// ─── 4. Student progress horizontal bars ─────────────────────────────────

export function StudentProgressBars({
  students,
  onStudentClick,
}: {
  students: StudentProgress[]
  onStudentClick?: (studentCode: string) => void
}) {
  if (students.length === 0) return <p className="text-xs text-slate-400">Chưa có học viên nào.</p>

  return (
    <div className="flex flex-col gap-2">
      {students.slice(0, 15).map((s) => {
        const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
        const barColor = s.almostEnd ? 'bg-rose-500' : pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-400'
        return (
          <div
            key={s.code}
            onClick={() => onStudentClick?.(s.code)}
            className={cn(
              'flex items-center gap-2 text-[10px] p-1 rounded-lg transition-all',
              onStudentClick ? 'cursor-pointer hover:bg-slate-100' : ''
            )}
          >
            <span className="w-28 shrink-0 truncate font-bold text-slate-700">
              {s.almostEnd && <span className="mr-0.5 text-rose-500">⚠️</span>}{s.name}
            </span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right font-mono font-bold text-slate-600">{s.completed}/{s.total}</span>
            <span className="w-8 shrink-0 text-right font-mono text-slate-400">{pct}%</span>
          </div>
        )
      })}
      {students.length > 15 && <p className="text-[10px] text-slate-400">+{students.length - 15} học viên khác…</p>}
    </div>
  )
}

// ─── 5. Fill rate donut ───────────────────────────────────────────────────

export function FillRateRing({
  available,
  booked,
  completed,
  onSliceClick,
}: {
  available: number
  booked: number
  completed: number
  onSliceClick?: (sliceLabel: string) => void
}) {
  const total = available
  const slices: DonutSlice[] = [
    { label: 'Đã hoàn thành', value: completed, color: '#8b5cf6' },
    { label: 'Đã book (chưa xong)', value: Math.max(0, booked - completed), color: '#3b82f6' },
    { label: 'Rảnh (chưa book)', value: Math.max(0, available - booked), color: '#d1fae5' },
  ].filter((s) => s.value > 0)
  return (
    <DonutChart
      slices={slices}
      size={150}
      title={`Fill Rate — ${total > 0 ? Math.round((booked / total) * 100) : 0}% booked`}
      onSliceClick={onSliceClick}
    />
  )
}

// ─── 6. Pie chart — student distribution per teacher (Admin) ────────────

const PIE_PALETTE = ['#059669','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1']

export function StudentPieChart({
  data,
  onTeacherClick,
}: {
  data: { name: string; count: number }[]
  onTeacherClick?: (teacherName: string) => void
}) {
  const slices: DonutSlice[] = data.map((d, i) => ({
    label: d.name,
    value: d.count,
    color: PIE_PALETTE[i % PIE_PALETTE.length],
  }))
  return (
    <DonutChart
      slices={slices}
      size={160}
      title="Phân Bổ HV Theo GV"
      onSliceClick={onTeacherClick}
    />
  )
}

