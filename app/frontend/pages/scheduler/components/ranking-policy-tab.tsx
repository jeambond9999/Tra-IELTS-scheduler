import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { TutorRank, SchedulerProps, AdminTeacherStat } from '../types'

type SubTab = 'ranks' | 'benefits' | 'duties' | 'aim_detail' | 'funnel' | 'evaluator'

export interface RankingPolicyTabProps {
  role?: string
  studentTracking?: SchedulerProps['studentTracking']
  monthKey?: string
  currentTeacherId?: number
  currentTeacherName?: string
  adminStats?: AdminTeacherStat[]
}

export const QUARTER_OPTIONS = [
  { key: '2026-Q1', label: 'Quý 1/2026 (T01 – T03/2026)', year: 2026, q: 1, months: ['2026-01', '2026-02', '2026-03'] },
  { key: '2026-Q2', label: 'Quý 2/2026 (T04 – T06/2026)', year: 2026, q: 2, months: ['2026-04', '2026-05', '2026-06'] },
  { key: '2026-Q3', label: 'Quý 3/2026 (T07 – T09/2026)', year: 2026, q: 3, months: ['2026-07', '2026-08', '2026-09'] },
  { key: '2026-Q4', label: 'Quý 4/2026 (T10 – T12/2026)', year: 2026, q: 4, months: ['2026-10', '2026-11', '2026-12'] },
  { key: '2025-Q4', label: 'Quý 4/2025 (T10 – T12/2025)', year: 2025, q: 4, months: ['2025-10', '2025-11', '2025-12'] },
  { key: '2025-Q3', label: 'Quý 3/2025 (T07 – T09/2025)', year: 2025, q: 3, months: ['2025-07', '2025-08', '2025-09'] },
]

export function RankingPolicyTab({
  role = 'teacher',
  studentTracking = [],
  monthKey = '2026-03',
  currentTeacherId,
  currentTeacherName,
  adminStats,
}: RankingPolicyTabProps = {}) {
  const [activeTab, setActiveTab] = useState<SubTab>('ranks')

  // Interactive Evaluator States
  const [evalDemoTotal, setEvalDemoTotal] = useState<number>(10)
  const [evalDemoPass, setEvalDemoPass] = useState<number>(8)
  const [evalStudentsTotal, setEvalStudentsTotal] = useState<number>(12)
  const [evalDropTotal, setEvalDropTotal] = useState<number>(1)
  const [evalGraduatesTotal, setEvalGraduatesTotal] = useState<number>(6)
  const [evalAimPassTotal, setEvalAimPassTotal] = useState<number>(3)
  const [evalCurrentRank, setEvalCurrentRank] = useState<'standard' | 'expert'>('standard')

  // Quarter selection (Tự động tính theo từng quý)
  const defaultQuarterKey = useMemo(() => {
    if (monthKey) {
      const [y, m] = monthKey.split('-')
      const q = Math.ceil((parseInt(m, 10) || 1) / 3)
      return `${y || '2026'}-Q${q}`
    }
    return '2026-Q1'
  }, [monthKey])

  const [selectedQuarter, setSelectedQuarter] = useState<string>(defaultQuarterKey)
  const isAdmin = role === 'admin'
  const [isAdminEditingFunnel, setIsAdminEditingFunnel] = useState<boolean>(false)

  // Admin overrides saved in localStorage
  const [adminCustomOverrides, setAdminCustomOverrides] = useState<
    Record<string, { enrolled: number; completed: number; examed: number; aimPass: number }>
  >(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(`meng_funnel_overrides_${currentTeacherId || 'all'}`)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  // Selected quarter info
  const currentQOpt = useMemo(
    () => QUARTER_OPTIONS.find((q) => q.key === selectedQuarter) || QUARTER_OPTIONS[0],
    [selectedQuarter]
  )

  // Filter students relevant to selected quarter
  const quarterStudents = useMemo(() => {
    const list = studentTracking || []
    if (!list.length) return []

    const qMonths = currentQOpt.months

    const matching = list.filter((s) => {
      const hasSessionInQ = s.sessions?.some((sess) => {
        const d = sess.scheduledOn || sess.scheduled_on || ''
        return qMonths.some((m) => d.startsWith(m))
      })
      const hasExamInQ = s.examDate && qMonths.some((m) => s.examDate!.startsWith(m))
      return hasSessionInQ || hasExamInQ
    })

    if (matching.length > 0) return matching
    return list
  }, [studentTracking, currentQOpt])

  // Automated Funnel Metrics per Quarter
  const autoFunnelEnrolled = quarterStudents.length
  const autoFunnelCompleted = quarterStudents.filter(
    (s) => s.isEnded || (s.total > 0 && s.remaining === 0) || (s.total > 0 && s.completed >= s.total) || s.status === 'completed'
  ).length
  const autoFunnelExamed = quarterStudents.filter(
    (s) => s.examStatus === 'đã thi' || Boolean(s.actualScore) || s.aimAchieved !== null
  ).length
  const autoFunnelAimPass = quarterStudents.filter(
    (s) => s.aimAchieved === true
  ).length

  // Check if admin override exists for this quarter
  const quarterOverride = adminCustomOverrides[selectedQuarter]

  // Final values: If override exists use it. If quarterStudents has data, use auto. Else fallback to standard default (25, 22, 14, 6)
  const funnelEnrolled = quarterOverride?.enrolled ?? (autoFunnelEnrolled > 0 ? autoFunnelEnrolled : 25)
  const funnelCompleted = quarterOverride?.completed ?? (autoFunnelEnrolled > 0 ? autoFunnelCompleted : 22)
  const funnelExamed = quarterOverride?.examed ?? (autoFunnelEnrolled > 0 ? autoFunnelExamed : 14)
  const funnelAimPass = quarterOverride?.aimPass ?? (autoFunnelEnrolled > 0 ? autoFunnelAimPass : 6)

  const handleSaveAdminOverride = (enrolled: number, completed: number, examed: number, aimPass: number) => {
    const updated = {
      ...adminCustomOverrides,
      [selectedQuarter]: { enrolled, completed, examed, aimPass },
    }
    setAdminCustomOverrides(updated)
    try {
      localStorage.setItem(`meng_funnel_overrides_${currentTeacherId || 'all'}`, JSON.stringify(updated))
    } catch {}
    setIsAdminEditingFunnel(false)
  }

  const handleResetAdminOverride = () => {
    const updated = { ...adminCustomOverrides }
    delete updated[selectedQuarter]
    setAdminCustomOverrides(updated)
    try {
      localStorage.setItem(`meng_funnel_overrides_${currentTeacherId || 'all'}`, JSON.stringify(updated))
    } catch {}
    setIsAdminEditingFunnel(false)
  }

  // Exclusion Checker States
  const [violationHomework, setViolationHomework] = useState<boolean>(false)
  const [violationTakeNote, setViolationTakeNote] = useState<boolean>(false)

  // Evaluation computation
  const evalPassDemoRate = evalDemoTotal > 0 ? Math.round((evalDemoPass / evalDemoTotal) * 100) : 0
  const evalDropRate = evalStudentsTotal > 0 ? Math.round((evalDropTotal / evalStudentsTotal) * 100) : 0
  const evalAimRate = evalGraduatesTotal > 0 ? Math.round((evalAimPassTotal / evalGraduatesTotal) * 100) : 0

  const hasEnoughDemoSample = evalDemoTotal >= 8
  const hasEnoughAimSample = evalGraduatesTotal >= 5

  const evalResult = useMemo(() => {
    const reasons: string[] = []

    // Check Warning first
    const isWarning =
      (hasEnoughDemoSample && evalPassDemoRate < 60) ||
      evalDropRate > 25

    if (isWarning) {
      if (hasEnoughDemoSample && evalPassDemoRate < 60) {
        reasons.push(`Pass demo rate (${evalPassDemoRate}%) < 60%`)
      }
      if (evalDropRate > 25) {
        reasons.push(`Drop-out rate (${evalDropRate}%) > 25%`)
      }
      return {
        rank: 'warning' as const,
        title: 'Hạng Cảnh Báo (Warning)',
        color: 'rose',
        badge: 'bg-rose-500 text-white',
        reasons,
        advice: 'Cần cải thiện tỷ lệ chốt demo và hỗ trợ giữ chân học viên để tránh bị tạm ngưng nhận học viên mới.',
      }
    }

    // Check Expert
    // Expert needs: Pass demo >= 80%, Drop <= 15%, Aim >= 35% (if enough sample)
    const passDemoExpert = evalPassDemoRate >= 80
    const dropExpert = evalDropRate <= 15
    const aimExpert = !hasEnoughAimSample || evalAimRate >= 35

    if (passDemoExpert && dropExpert && aimExpert) {
      if (!hasEnoughDemoSample) {
        reasons.push(`Chưa đủ 8 demo/quý (hiện có ${evalDemoTotal}) → Giữ hạng quý trước (${evalCurrentRank.toUpperCase()})`)
        return {
          rank: evalCurrentRank,
          title: `Giữ Hạng ${evalCurrentRank.toUpperCase()} (Thiếu Mẫu Demo)`,
          color: 'amber',
          badge: 'bg-amber-500 text-white',
          reasons,
          advice: 'Cần nhận thêm demo để đủ mẫu xét duyệt thăng hạng chính thức.',
        }
      }
      reasons.push(`Pass demo rate đạt ${evalPassDemoRate}% (≥ 80%)`)
      reasons.push(`Drop-out rate đạt ${evalDropRate}% (≤ 15%)`)
      if (hasEnoughAimSample) {
        reasons.push(`Aim rate đạt ${evalAimRate}% (≥ 35% trên ${evalGraduatesTotal} HV kết thúc khóa)`)
      } else {
        reasons.push(`Mẫu HV kết thúc khóa < 5 (${evalGraduatesTotal}) → Được miễn xét chỉ số Aim rate`)
      }
      return {
        rank: 'expert' as const,
        title: 'Hạng Expert ⭐ (Đạt Tiêu Chuẩn Xuất Sắc)',
        color: 'emerald',
        badge: 'bg-emerald-700 text-white font-black',
        reasons,
        advice: 'Chúc mừng bạn đạt chuẩn Expert! Bạn sẽ được ưu tiên nhận học viên không qua demo và hưởng bảng rate cao nhất (tới 170.000đ/ca).',
      }
    }

    // Check Standard
    const passDemoStandard = evalPassDemoRate >= 60
    const dropStandard = evalDropRate <= 25

    if (passDemoStandard && dropStandard) {
      reasons.push(`Pass demo rate đạt ${evalPassDemoRate}% (≥ 60%)`)
      reasons.push(`Drop-out rate đạt ${evalDropRate}% (≤ 25%)`)
      if (!passDemoExpert) {
        reasons.push(`Chưa đạt Pass demo Expert (cần ≥ 80%, hiện tại ${evalPassDemoRate}%)`)
      }
      if (!dropExpert) {
        reasons.push(`Chưa đạt Drop-out Expert (cần ≤ 15%, hiện tại ${evalDropRate}%)`)
      }
      if (hasEnoughAimSample && evalAimRate < 35) {
        reasons.push(`Chưa đạt Aim rate Expert (cần ≥ 35%, hiện tại ${evalAimRate}%)`)
      }
      return {
        rank: 'standard' as const,
        title: 'Hạng Standard (Đạt Tiêu Chuẩn)',
        color: 'blue',
        badge: 'bg-blue-600 text-white',
        reasons,
        advice: 'Duy trì phong độ tốt! Để lên hạng Expert, hãy nâng tỷ lệ pass demo lên ≥ 80% và giảm drop-out xuống ≤ 15%.',
      }
    }

    return {
      rank: evalCurrentRank,
      title: `Giữ Hạng ${evalCurrentRank.toUpperCase()}`,
      color: 'slate',
      badge: 'bg-slate-700 text-white',
      reasons: ['Số liệu chưa đủ điều kiện thăng/hạ hạng'],
      advice: 'Tiếp tục theo dõi các chỉ số trong suốt quý.',
    }
  }, [evalPassDemoRate, evalDropRate, evalAimRate, hasEnoughDemoSample, hasEnoughAimSample, evalDemoTotal, evalGraduatesTotal, evalCurrentRank])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-black tracking-wide text-amber-300 backdrop-blur-md border border-amber-500/30">
                <Star className="size-3.5 fill-amber-300" /> QUY CHẾ XẾP HẠNG GIA SƯ
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Áp dụng chu kỳ theo Quý (Q1 – Q4)
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Hệ Thống Tiêu Chuẩn, Lợi Ích & Nghĩa Vụ Gia Sư
            </h1>
            <p className="max-w-3xl text-xs font-medium text-slate-300 leading-relaxed">
              Tài liệu chính thức quy định tiêu chí xếp hạng <strong>Standard / Expert / Warning</strong>, chính sách phân bổ học viên không qua demo, chính sách thưởng đạt Aim IELTS Speaking & Writing, và công thức tính toán chi tiết.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('evaluator')}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition cursor-pointer shrink-0"
          >
            <Sparkles className="size-4" />
            <span>Kiểm Tra Hạng Của Bạn →</span>
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('ranks')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer',
            activeTab === 'ranks'
              ? 'bg-slate-900 text-white shadow-sm font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          <Award className="size-4 text-amber-400" />
          <span>1. Các Hạng & Điều Kiện</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('benefits')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer',
            activeTab === 'benefits'
              ? 'bg-emerald-700 text-white shadow-sm font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          <Sparkles className="size-4 text-emerald-300" />
          <span>2. Lợi Ích & Thưởng Đạt Aim</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('duties')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer',
            activeTab === 'duties'
              ? 'bg-blue-700 text-white shadow-sm font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          <Scale className="size-4 text-blue-300" />
          <span>3. Nghĩa Vụ & Định Nghĩa Drop</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('aim_detail')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer',
            activeTab === 'aim_detail'
              ? 'bg-purple-700 text-white shadow-sm font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          <Target className="size-4 text-purple-300" />
          <span>4. Chi Tiết Tính Aim Rate</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('funnel')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer',
            activeTab === 'funnel'
              ? 'bg-amber-700 text-white shadow-sm font-black'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          <Flame className="size-4 text-amber-300" />
          <span>5. Funnel & Loại Khỏi KPI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('evaluator')}
          className={cn(
            'flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ml-auto',
            activeTab === 'evaluator'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
          )}
        >
          <Sparkles className="size-4 text-amber-600" />
          <span>🧮 Đánh Giá Hạng Tự Động</span>
        </button>
      </div>

      {/* ── 1. CÁC HẠNG GIA SƯ & ĐIỀU KIỆN (Khớp 100% Ảnh 2) ────────────────── */}
      {activeTab === 'ranks' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  TIÊU CHUẨN ĐÁNH GIÁ CHU KỲ QUÝ
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  1. CÁC HẠNG GIA SƯ & ĐIỀU KIỆN
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-slate-300 bg-slate-50">
                Quy chuẩn áp dụng: 2025–2026
              </Badge>
            </div>

            {/* Quick Summary Cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Expert Card */}
              <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-50/60 to-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-emerald-900 text-lg">
                    <Star className="size-5 fill-amber-400 text-amber-500" />
                    <span>Expert</span>
                  </div>
                  <Badge className="bg-emerald-700 text-white font-extrabold text-[10px]">
                    Đạt cả 3 tiêu chuẩn
                  </Badge>
                </div>
                <ul className="mt-4 space-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    <span>Pass demo rate: <strong className="text-emerald-800 font-extrabold">≥ 80%</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    <span>Drop-out rate: <strong className="text-emerald-800 font-extrabold">≤ 15%</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                    <span>Aim rate: <strong className="text-emerald-800 font-extrabold">≥ 35%</strong></span>
                  </li>
                </ul>
                <p className="mt-3 text-[11px] text-slate-500 italic">
                  Ưu tiên assign case không qua demo & hưởng rate tối đa tới 170k/ca.
                </p>
              </div>

              {/* Standard Card */}
              <div className="rounded-2xl border border-blue-300 bg-gradient-to-b from-blue-50/40 to-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-blue-900 text-lg">
                    <ShieldCheck className="size-5 text-blue-600" />
                    <span>Standard</span>
                  </div>
                  <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 font-bold text-[10px]">
                    Đạt cả 2 tiêu chuẩn
                  </Badge>
                </div>
                <ul className="mt-4 space-y-2 text-xs font-semibold text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-blue-600" />
                    <span>Pass demo rate: <strong className="text-blue-900 font-extrabold">≥ 60%</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-blue-600" />
                    <span>Drop-out rate: <strong className="text-blue-900 font-extrabold">≤ 25%</strong></span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-500">
                    <span className="size-1.5 rounded-full bg-slate-300" />
                    <span>Aim rate: <em>Theo dõi — chưa bắt buộc</em></span>
                  </li>
                </ul>
                <p className="mt-3 text-[11px] text-slate-500 italic">
                  Hạng tiêu chuẩn vận hành nền tảng của mọi gia sư trong trung tâm.
                </p>
              </div>

              {/* Warning Card */}
              <div className="rounded-2xl border border-rose-300 bg-gradient-to-b from-rose-50/40 to-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-rose-900 text-lg">
                    <AlertTriangle className="size-5 text-rose-600" />
                    <span>Warning</span>
                  </div>
                  <Badge className="bg-rose-600 text-white font-extrabold text-[10px]">
                    Cần cải thiện ngay
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 text-xs font-semibold text-rose-900">
                  <p>Không đạt ≥ 1 trong 2 tiêu chí cơ bản:</p>
                  <ul className="space-y-1 text-[11px] text-slate-700 list-disc pl-4 font-normal">
                    <li>Pass demo rate &lt; 60%</li>
                    <li>HOẶC Drop-out rate &gt; 25%</li>
                  </ul>
                </div>
                <p className="mt-3 text-[11px] text-rose-700 italic">
                  Hạn chế phân bổ học viên mới cho đến khi cải thiện các chỉ số.
                </p>
              </div>
            </div>

            {/* Bảng Chi Tiết Tiêu Chuẩn (Khớp chuẩn Ảnh 2) */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="p-3.5 w-1/4">Hạng</th>
                    <th className="p-3.5 text-center bg-blue-900">Pass demo rate</th>
                    <th className="p-3.5 text-center bg-teal-900">Drop-out rate</th>
                    <th className="p-3.5 text-center bg-emerald-950">Aim rate (xét Expert)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {/* Expert row */}
                  <tr className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors font-semibold">
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-emerald-900 text-sm">Expert</span>
                        <Star className="size-3.5 fill-amber-400 text-amber-500" />
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-extrabold text-emerald-900 text-sm">
                      ≥ 80%
                    </td>
                    <td className="p-3.5 text-center font-extrabold text-emerald-900 text-sm">
                      ≤ 15%
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="font-extrabold text-emerald-900 text-sm">≥ 35%</span>
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                        (min 5 HV kết thúc khoá có dữ liệu)
                      </span>
                    </td>
                  </tr>

                  {/* Standard row */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <span className="font-black text-blue-900 text-sm">Standard</span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-blue-900 text-sm">
                      ≥ 60%
                    </td>
                    <td className="p-3.5 text-center font-bold text-blue-900 text-sm">
                      ≤ 25%
                    </td>
                    <td className="p-3.5 text-center text-slate-500 italic">
                      Theo dõi — chưa bắt buộc
                    </td>
                  </tr>

                  {/* Warning row */}
                  <tr className="bg-rose-50/40 hover:bg-rose-50/70 transition-colors">
                    <td className="p-3.5">
                      <span className="font-black text-rose-900 text-sm">Warning</span>
                    </td>
                    <td className="p-3.5 text-center text-rose-700 font-bold">
                      Không đạt ≥ 1 trong 2
                    </td>
                    <td className="p-3.5 text-center text-rose-700 font-bold">
                      Không đạt ≥ 1 trong 2
                    </td>
                    <td className="p-3.5 text-center text-slate-400">
                      —
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quy Định Khi Không Đủ Mẫu (Khớp Ảnh 2) */}
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold mb-2">
                <Info className="size-4 text-amber-700 shrink-0" />
                <span className="uppercase tracking-wide">Quy định xử lý khi không đủ mẫu:</span>
              </div>
              <ul className="space-y-1.5 text-slate-700 pl-6 list-disc font-medium">
                <li>
                  <strong>Pass demo:</strong> Cần <strong>≥ 8 demo / quý</strong>. Nếu ít hơn 8 demo: <em>giữ nguyên hạng của quý trước</em>.
                </li>
                <li>
                  <strong>Aim rate:</strong> Cần <strong>≥ 5 HV kết thúc khoá / quý</strong>. Nếu không đủ 5 HV: <em>không dùng điều kiện aim rate để xét lên Expert quý đó</em>. Trường hợp GV đang là Expert thì được <strong>giữ hạng</strong>.
                </li>
              </ul>
            </div>

            {/* 2. LỘ TRÌNH KHI KHÔNG ĐẠT STANDARD (Khớp 100% Ảnh Mới) */}
            <div className="mt-6 rounded-2xl border border-rose-200 overflow-hidden shadow-xs">
              <div className="bg-rose-900 px-4 py-2.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-rose-300" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    2. LỘ TRÌNH KHI KHÔNG ĐẠT STANDARD
                  </span>
                </div>
                <span className="text-[11px] text-rose-200">Xử lý khi giảm sút chỉ số</span>
              </div>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-rose-100 font-medium">
                  <tr className="bg-rose-50/60 hover:bg-rose-50 transition-colors">
                    <td className="p-3.5 w-1/4 font-black text-rose-900 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-rose-600" />
                        <span>Warning</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-800 leading-relaxed">
                      Số liệu trong tháng liên tục không đạt mức Standard →{' '}
                      <strong className="text-rose-900">chuyển xuống Warning</strong> (mức lương chung với Standard nhưng sẽ{' '}
                      <span className="underline decoration-rose-400 font-bold">giảm lượng HV nhận</span> &amp;{' '}
                      <span className="font-bold text-rose-900">bắt buộc training lại</span> &amp;{' '}
                      <span className="font-bold text-rose-900">không nhận HV mới</span>).
                    </td>
                  </tr>
                  <tr className="bg-rose-100/50 hover:bg-rose-100/80 transition-colors">
                    <td className="p-3.5 w-1/4 font-black text-rose-950 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-rose-800" />
                        <span>2 tháng Warning liên tiếp</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-rose-950 font-bold leading-relaxed">
                      Review hợp đồng — chấm dứt hợp tác hoặc chuyển vai trò khác nếu có.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. QUY ĐỊNH GV MỚI (Khớp 100% Ảnh Mới) */}
            <div className="mt-6 rounded-2xl border border-blue-200 overflow-hidden shadow-xs">
              <div className="bg-blue-900 px-4 py-2.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-blue-300" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    3. QUY ĐỊNH DÀNH CHO GIÁO VIÊN MỚI
                  </span>
                </div>
                <span className="text-[11px] text-blue-200">Áp dụng trong giai đoạn thử thách / onboarding</span>
              </div>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-blue-100 font-medium">
                  <tr className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3.5 w-1/4 font-black text-blue-900 align-top">
                      Quý đầu — mặc định Standard
                    </td>
                    <td className="p-3.5 text-slate-800 leading-relaxed">
                      Chỉ tính <strong>Pass demo rate</strong> &amp; <strong>Drop-out rate</strong>. Aim rate chưa áp dụng do chưa đủ số lượng học viên kết thúc khoá (yêu cầu tối thiểu 5 HV).
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                    <td className="p-3.5 w-1/4 font-black text-emerald-900 align-top">
                      <div className="flex items-center gap-1.5">
                        <Star className="size-3.5 fill-amber-400 text-amber-500" />
                        <span>Lên Expert sớm</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-800 leading-relaxed">
                      Pass demo <strong>≥ 80%</strong> + Drop-out <strong>≤ 15%</strong> ngay quý đầu →{' '}
                      <strong className="text-emerald-800 font-extrabold">lên Expert quý tiếp theo</strong>. Aim rate sẽ bắt đầu áp dụng từ quý 2 trở đi khi có đủ dữ liệu học viên kết thúc khóa.
                    </td>
                  </tr>
                  <tr className="bg-amber-50/50 hover:bg-amber-50 transition-colors">
                    <td className="p-3.5 w-1/4 font-black text-amber-900 align-top">
                      Vào Warning sớm
                    </td>
                    <td className="p-3.5 text-slate-800 leading-relaxed">
                      Pass demo <strong>&lt; 60%</strong> hoặc Drop-out rate <strong>&gt; 25%</strong> trong quý đầu →{' '}
                      <strong className="text-rose-800">Warning</strong>. Leader sẽ review đánh giá vào đầu quý tiếp theo.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Lịch Tổng Kết KPI của Leader (Footer Note Ảnh Mới) */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs font-semibold text-indigo-950 shadow-2xs">
              <Clock className="size-5 shrink-0 text-indigo-600" />
              <div>
                <strong>Lịch trình tổng kết &amp; thông báo xếp hạng:</strong>{' '}
                Leader tổng kết KPI trước ngày <strong>5 đầu mỗi quý</strong> và thông báo hạng mới đến từng GV.{' '}
                Mọi thắc mắc phản hồi trước ngày <strong>10</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. LỢI ÍCH & THƯỞNG ĐẠT AIM (Khớp 100% Ảnh 3) ────────────────────── */}
      {activeTab === 'benefits' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  CHÍNH SÁCH QUYỀN LỢI & PHÚC LỢI GIA SƯ
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  2. LỢI ÍCH & THƯỞNG KHI HỌC VIÊN ĐẠT AIM
                </h2>
              </div>
            </div>

            {/* Phân 1: Phân Bổ Case Không Qua Demo */}
            <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex size-6 items-center justify-center rounded-lg bg-purple-700 text-white font-black text-xs">
                  1
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-purple-900">
                  PHÂN BỐ CASE HỌC VIÊN KHÔNG QUA DEMO
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-white p-3.5 border border-purple-100 shadow-2xs">
                  <span className="block font-bold text-slate-500 uppercase text-[10px] mb-1">
                    Định nghĩa
                  </span>
                  <p className="font-semibold text-slate-800">
                    Học viên chốt học và đóng tiền trực tiếp, không cần thông qua buổi học demo.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3.5 border border-purple-100 shadow-2xs">
                  <span className="block font-bold text-purple-700 uppercase text-[10px] mb-1">
                    GV Expert ưu tiên ⭐
                  </span>
                  <p className="font-semibold text-slate-800">
                    Ưu tiên assign GV Expert trước. Nếu không có GV Expert available → assign Standard, Leader ghi chú lý do.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3.5 border border-purple-100 shadow-2xs">
                  <span className="block font-bold text-emerald-700 uppercase text-[10px] mb-1">
                    Quy tắc tính chỉ số
                  </span>
                  <p className="font-semibold text-slate-800">
                    <strong>KHÔNG</strong> tính vào tử số lẫn mẫu số pass demo rate. Chỉ tính vào <strong>drop-out rate từ tháng tiếp theo</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Phần 2: Thưởng Đạt Aim (Speaking & Writing) */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-700 text-white font-black text-xs">
                    2
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-950">
                    THƯỞNG KHI HỌC VIÊN ĐẠT AIM — SPEAKING & WRITING
                  </h3>
                </div>
                <Badge className="bg-emerald-700 text-white font-bold text-xs">
                  Thưởng 300.000đ / HV
                </Badge>
              </div>

              {/* 3 Tiêu Chí Xét Thưởng */}
              <div className="mb-4 rounded-xl bg-white p-4 border border-emerald-200 text-xs">
                <span className="font-bold text-emerald-900 block mb-2">
                  Điều kiện xét thưởng (Áp dụng khi học viên đạt một trong các trường hợp sau):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50/80 p-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      1
                    </span>
                    <span className="text-slate-800 font-medium">
                      Thưởng khi HV tăng <strong>1.5 band</strong> sau khoá <strong>2-3 tháng</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50/80 p-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      2
                    </span>
                    <span className="text-slate-800 font-medium">
                      Thưởng khi HV tăng <strong>1 band</strong> trong khoá cấp tốc <strong>1 tháng</strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-emerald-50/80 p-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      3
                    </span>
                    <span className="text-slate-800 font-medium">
                      Thưởng khi HV đạt <strong>7.0 Speaking hoặc Writing</strong>
                    </span>
                  </div>
                </div>
                <p className="mt-2.5 text-[11px] text-slate-500 italic">
                  → Học viên nộp bằng chứng chứng chỉ cho CS, CS xác nhận, tổng hợp & trao thưởng cuối mỗi quý.
                </p>
              </div>

              {/* Bảng Mức Thưởng Chi Tiết */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-extrabold">
                      <th className="p-3 w-1/3">Trường Hợp Xét Thưởng</th>
                      <th className="p-3 text-center">Tiêu Chí Đạt</th>
                      <th className="p-3 text-right">Mức Thưởng</th>
                      <th className="p-3 text-center">Đối Tượng Nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3">
                        <strong className="text-slate-900 block text-sm">Khoá 2–3 tháng</strong>
                        <span className="text-[11px] text-slate-500">
                          Khoá học tiêu chuẩn thời lượng 2–3 tháng
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-800">
                        HV tăng ≥ 1.5 band sau khoá
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700 text-sm">
                        300,000đ / HV
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 font-bold">
                          All GV
                        </Badge>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="p-3">
                        <strong className="text-slate-900 block text-sm">Khoá cấp tốc 1 tháng</strong>
                        <span className="text-[11px] text-slate-500">
                          Khoá học cấp tốc tăng tốc trong 1 tháng
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-800">
                        HV tăng ≥ 1.0 band trong khoá
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700 text-sm">
                        300,000đ / HV
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 font-bold">
                          All GV
                        </Badge>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="p-3">
                        <strong className="text-slate-900 block text-sm">Mục tiêu điểm cao (7.0+)</strong>
                        <span className="text-[11px] text-slate-500">
                          Speaking hoặc Writing đạt band cao
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-800">
                        Đạt 7.0 Speaking hoặc Writing
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700 text-sm">
                        300,000đ / HV
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 font-bold">
                          All GV
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-[11px] text-slate-600 italic">
                * Lưu ý: Tiền thưởng tính riêng cho từng học viên khi đạt một trong các tiêu chí trên.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. NGHĨA VỤ & ĐỊNH NGHĨA DROP (Khớp 100% Ảnh 4) ──────────────────── */}
      {activeTab === 'duties' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
                  CÔNG THỨC & NGHĨA VỤ VẬN HÀNH
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  3. NGHĨA VỤ & CÁCH TÍNH TỪNG CHỈ SỐ
                </h2>
              </div>
            </div>

            {/* Bảng Cách Tính Từng Chỉ Số (Khớp Ảnh 4) */}
            <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="p-3.5 w-1/5">Chỉ Số</th>
                    <th className="p-3.5 w-1/3">Công Thức Tính</th>
                    <th className="p-3.5 text-center">Chu Kỳ & Điều Kiện</th>
                    <th className="p-3.5">Lưu Ý Quan Trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900 text-sm">
                      Pass demo rate
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="rounded-lg bg-slate-100 p-2 font-mono text-[11px]">
                        Số HV chốt đóng tiền trong 7 ngày (từ ngày demo) <br />
                        <span className="text-slate-400 font-sans">chia cho</span> <br />
                        Tổng số HV demo với GV trong quý
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="outline" className="font-bold border-blue-200 text-blue-800 bg-blue-50">
                        Theo Quý
                      </Badge>
                      <span className="block text-[11px] text-slate-500 mt-1">
                        Min 8 demo/quý — ít hơn: giữ hạng quý trước
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <strong className="text-rose-700">Case không demo:</strong> KHÔNG tính vào chỉ số này.
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900 text-sm">
                      Drop-out rate
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="rounded-lg bg-slate-100 p-2 font-mono text-[11px]">
                        Số HV bỏ giữa chừng <br />
                        <span className="text-slate-400 font-sans">chia cho</span> <br />
                        Tổng HV bắt đầu học với bạn (tính gộp 3 tháng quý)
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="outline" className="font-bold border-teal-200 text-teal-800 bg-teal-50">
                        Theo Quý
                      </Badge>
                      <span className="block text-[11px] text-slate-500 mt-1">
                        Tính từ Q2/2025
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      <div>
                        <strong className="text-emerald-700">Không tính drop:</strong> Hoàn thành khóa tự nhiên, bảo lưu hợp lệ, ngoại lệ Leader duyệt.
                      </div>
                      <div className="mt-1">
                        <strong className="text-rose-700">Tính là drop:</strong> Quá hạn bảo lưu, bảo lưu lần 2, chủ động xin dừng.
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900 text-sm">
                      Aim rate
                      <span className="block text-[10px] text-slate-400 font-normal">
                        (Chỉ dùng xét Expert)
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="rounded-lg bg-slate-100 p-2 font-mono text-[11px]">
                        Số HV đạt aim <br />
                        <span className="text-slate-400 font-sans">chia cho</span> <br />
                        Tổng HV hoàn thành khoá & đi thi thật
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant="outline" className="font-bold border-emerald-200 text-emerald-800 bg-emerald-50">
                        Theo Quý
                      </Badge>
                      <span className="block text-[11px] text-slate-500 mt-1">
                        Min 5 HV kết thúc khoá — ít hơn: không áp điều kiện aim rate
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      Xem chi tiết cách tính và tiêu chí từng khóa tại <strong>Phần 4</strong>.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* BẢNG ĐỊNH NGHĨA DROP (Khớp 100% Ảnh 4) */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="bg-slate-800 px-4 py-3 text-white">
                <h3 className="text-xs font-black uppercase tracking-wider">
                  ĐỊNH NGHĨA DROP (Ảnh Hưởng Trực Tiếp Đến Drop-Out Rate)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                {/* KHÔNG TÍNH DROP */}
                <div className="p-5 bg-emerald-50/40">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm mb-3">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span>KHÔNG TÍNH DROP</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700 pl-4 list-disc font-medium">
                    <li>
                      <strong>HV hoàn thành khoá tự nhiên</strong> (học hết số buổi của gói đăng ký).
                    </li>
                    <li>
                      <strong>HV bảo lưu hợp lệ:</strong> Báo CS, thời gian bảo lưu ≤ 2 tháng tổng, là lần đầu trong khoá, và quay lại học đúng hạn cam kết.
                    </li>
                    <li>
                      <strong>Ngoại lệ được Leader duyệt:</strong> Ốm có giấy tờ y tế, sự cố gia đình bất khả kháng.
                    </li>
                  </ul>
                </div>

                {/* TÍNH LÀ DROP */}
                <div className="p-5 bg-rose-50/40">
                  <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm mb-3">
                    <XCircle className="size-5 text-rose-600" />
                    <span>TÍNH LÀ DROP</span>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-700 pl-4 list-disc font-medium">
                    <li>
                      <strong>Bảo lưu quá ngày quay lại đã ghi:</strong> CS nhắn nhắc 3 ngày không phản hồi → <em>drop</em>.
                    </li>
                    <li>
                      <strong>Xin dời ngày quay lại vượt 2 tháng tổng:</strong> → <em>drop ngay</em>.
                    </li>
                    <li>
                      <strong>Bảo lưu lần 2</strong> trong cùng 1 khoá học: → <em>drop ngay</em>.
                    </li>
                    <li>
                      <strong>Học viên chủ động báo huỷ khoá:</strong> → <em>drop ngay</em>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. CÁCH TÍNH AIM RATE CHI TIẾT (Khớp 100% Ảnh 5) ─────────────────── */}
      {activeTab === 'aim_detail' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-800">
                  TIÊU CHÍ ĐẦU RA CAM KẾT
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  4. CÁCH TÍNH AIM RATE — CHI TIẾT
                </h2>
              </div>
              <Badge className="bg-purple-700 text-white font-extrabold text-xs">
                Ngưỡng Expert: ≥ 35%
              </Badge>
            </div>

            <div className="mb-4 rounded-xl bg-purple-50 p-4 border border-purple-200 text-xs text-purple-950">
              <p className="font-bold">
                Công thức: Aim rate = Số HV đạt aim / Tổng HV trong mẫu. Ngưỡng Expert: ≥ 35%. Mẫu tính và điều kiện đạt aim được định nghĩa rõ dưới đây.
              </p>
            </div>

            {/* Quy Tắc Xử Lý Band Đầu Vào (Khớp Ảnh 5) */}
            <div className="mb-6 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white font-extrabold">
                    <th className="p-3 w-1/4">Vấn đề</th>
                    <th className="p-3 w-1/3">Quy tắc xử lý</th>
                    <th className="p-3">Ví dụ cụ thể</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr className="bg-amber-50/50">
                    <td className="p-3 font-bold text-slate-900">
                      Band đầu vào có khoảng (vd: 4.5–5.0)
                    </td>
                    <td className="p-3 text-slate-800">
                      Lấy mức <strong>CAO HƠN</strong> để tính mức tăng tối thiểu
                    </td>
                    <td className="p-3 text-slate-700">
                      Đầu vào 4.5–5.0 → <strong>dùng 5.0</strong> để tính mức tăng
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bảng Chi Tiết Theo Loại Khóa Học (Khớp 100% Ảnh 5) */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="p-3.5 w-1/5">Loại HV / Khoá</th>
                    <th className="p-3.5 w-2/5 text-emerald-300">Điều kiện tính ĐẠT aim rate</th>
                    <th className="p-3.5 w-1/5 text-rose-300">Điều kiện tính CHƯA ĐẠT</th>
                    <th className="p-3.5 text-blue-300">Xử lý đặc biệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {/* Khoá Foundation */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <strong className="text-slate-900 text-sm block">Khoá Foundation</strong>
                      <span className="text-[11px] text-slate-500">
                        Đầu vào 3.0–4.5 (1.5 tháng hoặc 3 tháng)
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-2">
                        <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
                          <span className="font-bold text-emerald-900 block text-[11px]">TRƯỜNG HỢP 1 (Test thử):</span>
                          <span className="text-slate-700">① Đạt ≥ 5.0 Speaking (Test thử Part 1 trên web <em>luyennoi.com</em> cuối khoá)</span> <br />
                          <span className="text-slate-700">② Tăng ≥ 1.0 band so với đầu vào (Cả 2 điều kiện)</span>
                        </div>
                        <div className="rounded-lg bg-teal-50 p-2 border border-teal-200">
                          <span className="font-bold text-teal-900 block text-[11px]">HOẶC THI IELTS THẬT:</span>
                          <span className="text-slate-700">① Thi IELTS thật</span> <br />
                          <span className="text-slate-700">② Đạt ≥ 6.0 Speaking</span> <br />
                          <span className="text-slate-700">③ Tăng ≥ 1.0 band so với đầu vào (Cả 3 điều kiện)</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-rose-800 text-[11px]">
                      Thi thật nhưng không đủ 1 trong 3 điều kiện trên <br />
                      <strong>HOẶC</strong> CS hỏi 2 lần không phản hồi
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      HV xác nhận chưa thi → <strong>Loại khỏi mẫu</strong> (để là pending), tính vào Quý mà có điểm của bạn.
                    </td>
                  </tr>

                  {/* Khoá Intermediate */}
                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                    <td className="p-3.5">
                      <strong className="text-slate-900 text-sm block">Khoá Intermediate</strong>
                      <span className="text-[11px] text-slate-500">
                        Đầu vào 4.5+ (2–3 tháng)
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-2">
                        <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
                          <span className="font-bold text-emerald-900 block text-[11px]">TH1:</span>
                          <span>① Thi IELTS thật</span> <br />
                          <span>② Đạt ≥ 6.0 Speaking</span> <br />
                          <span>③ Tăng ≥ 1.0 band so với đầu vào (Cả 3 điều kiện)</span>
                        </div>
                        <div className="rounded-lg bg-teal-50 p-2 border border-teal-200">
                          <span className="font-bold text-teal-900 block text-[11px]">TH2:</span>
                          <span>① Thi IELTS thật</span> <br />
                          <span>② Đạt ≥ 6.5 Speaking</span> <br />
                          <span>③ Tăng ≥ 0.5 band so với đầu vào (Cả 3 điều kiện)</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-rose-800 text-[11px]">
                      Thi thật nhưng không đủ 1 trong các điều kiện trên <br />
                      <strong>HOẶC</strong> CS hỏi 2 lần không phản hồi
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      HV xác nhận chưa thi → <strong>Loại khỏi mẫu</strong> (để là pending), tính vào Quý mà có điểm của bạn.
                    </td>
                  </tr>

                  {/* Khoá 1 tháng */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5">
                      <strong className="text-slate-900 text-sm block">Khoá 1 tháng (Thi gấp)</strong>
                      <span className="text-[11px] text-slate-500">
                        Đầu vào 4.5+
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
                        <span>① Thi IELTS thật</span> <br />
                        <span>② Tăng ≥ 0.5 band so với đầu vào</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-rose-800 text-[11px]">
                      Thi thật nhưng không tăng được 0.5 band <br />
                      <strong>HOẶC</strong> CS hỏi 2 lần không phản hồi
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      Khoá ngắn — không kỳ vọng đạt đầu ra cam kết đầy đủ, chỉ cần có tiến bộ. HV xác nhận chưa thi → Loại khỏi mẫu (pending).
                    </td>
                  </tr>

                  {/* Advanced */}
                  <tr className="hover:bg-slate-50 transition-colors bg-purple-50/30">
                    <td className="p-3.5">
                      <strong className="text-purple-950 text-sm block">Advanced</strong>
                    </td>
                    <td className="p-3.5">
                      <div className="rounded-lg bg-purple-100/70 p-2 border border-purple-200">
                        <span>① Thi IELTS thật</span> <br />
                        <span>② Đạt ≥ 7.0 Speaking</span> <br />
                        <span>③ Tăng ≥ 0.5 band so với đầu vào (Cả 3 điều kiện)</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-rose-800 text-[11px]">
                      Thi thật nhưng không đủ điều kiện <br />
                      <strong>HOẶC</strong> CS hỏi 2 lần không phản hồi
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">
                      Ít HV — nếu &lt; 5 HV kết thúc khoá trong quý thì <strong>không áp điều kiện aim rate</strong> khi xét Expert quý đó.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. FUNNEL GIẢNG DẠY & LOẠI KHỎI KPI (Khớp 100% Ảnh Mới) ─────────── */}
      {activeTab === 'funnel' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                  THEO DÕI CHẤT LƯỢNG GIẢNG DẠY DÀI HẠN
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  5. FUNNEL GIẢNG DẠY – THEO DÕI THAM KHẢO MỖI QUÝ
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-amber-300 bg-amber-50 text-amber-900">
                Chỉ số tham khảo • Không ảnh hưởng xếp hạng
              </Badge>
            </div>

            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs font-medium text-amber-950">
              💡 <strong>Mục đích:</strong> Không ảnh hưởng trực tiếp đến xếp hạng Standard/Expert/Warning. Leader dùng số liệu này để hiểu rõ hơn chất lượng giảng dạy, tỷ lệ giữ chân (engagement) và hiệu quả chuyển đổi từ học đến thi của từng GV theo thời gian.
            </div>

            {/* BẢNG 4 BƯỚC FUNNEL GIẢNG DẠY (Khớp Ảnh Mới) */}
            <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-extrabold">
                    <th className="p-3.5 w-1/6">Bước</th>
                    <th className="p-3.5 w-1/4">Chỉ Số</th>
                    <th className="p-3.5 w-1/3">Cách Tính</th>
                    <th className="p-3.5">Ý Nghĩa Quản Trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-black text-slate-900">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-200 text-slate-800 text-xs font-black mr-2">
                        1
                      </span>
                      Dạy
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      Tổng HV đang/đã học trong quý
                    </td>
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      Tổng số học viên được phân bổ và bắt đầu học với GV trong quý
                    </td>
                    <td className="p-3.5 text-slate-600">
                      Quy mô học viên GV tiếp nhận và giảng dạy
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors bg-slate-50/40">
                    <td className="p-3.5 font-black text-blue-900">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-xs font-black mr-2">
                        2
                      </span>
                      Hoàn thành
                    </td>
                    <td className="p-3.5 font-bold text-blue-900">
                      Tỷ lệ HV hoàn thành khoá
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="rounded-lg bg-white p-2 border border-slate-200 font-mono text-[11px]">
                        Số HV học hết số buổi <br />
                        <span className="text-slate-400 font-sans">chia cho</span> <br />
                        Tổng HV dạy trong quý
                      </div>
                    </td>
                    <td className="p-3.5 text-blue-900 font-semibold">
                      GV giữ engagement và động lực học tập của HV
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-black text-indigo-900">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-800 text-xs font-black mr-2">
                        3
                      </span>
                      Đi thi
                    </td>
                    <td className="p-3.5 font-bold text-indigo-900">
                      Số HV hoàn thành &amp; đi thi thật
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="rounded-lg bg-white p-2 border border-slate-200 font-mono text-[11px]">
                        Số HV hoàn thành + có lịch thi sau buổi học cuối
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      Mức độ tự tin và sẵn sàng bước vào kỳ thi IELTS thật
                    </td>
                  </tr>

                  <tr className="hover:bg-emerald-50/50 transition-colors bg-emerald-50/30">
                    <td className="p-3.5 font-black text-emerald-950">
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 text-xs font-black mr-2">
                        4
                      </span>
                      Aim rate
                    </td>
                    <td className="p-3.5 font-bold text-emerald-900">
                      % HV đạt aim (theo định nghĩa Phần 3)
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="rounded-lg bg-white p-2 border border-emerald-200 font-mono text-[11px]">
                        Số HV đạt aim <br />
                        <span className="text-slate-400 font-sans">chia cho</span> <br />
                        Tổng HV trong mẫu{' '}
                        <span className="text-[10px] text-slate-500 font-normal block">
                          (loại HV chưa thi, tính chưa đạt cho HV không báo điểm)
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-emerald-900 font-black">
                      Điều kiện tiên quyết để xét lên hạng Expert ⭐
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* MÔ HÌNH FUNNEL TRỰC QUAN (Teaching Funnel) */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50/30 p-5 shadow-xs">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Flame className="size-4 text-amber-500" />
                      MÔ HÌNH PHỄU CHUYỂN ĐỔI GIẢNG DẠY (TEACHING FUNNEL)
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                      <Lock className="size-2.5 text-slate-500" />
                      Tự động theo quý • Không sửa
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Số liệu được hệ thống tự động tổng hợp theo từng quý từ tiến độ học viên, khảo sát thi thật và kết quả đạt Aim của Giáo viên (Chỉ đọc).
                  </p>
                </div>

                {/* Quarter Selection Bar */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-600">Xem theo Quý:</span>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                    <SelectTrigger
                      aria-label="Chọn quý xem funnel"
                      className="h-8 min-w-[170px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-800 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      <SelectValue placeholder="Chọn quý" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="rounded-xl text-xs z-50 bg-white shadow-md border border-slate-200">
                      <SelectGroup>
                        {QUARTER_OPTIONS.map((q) => (
                          <SelectItem key={q.key} value={q.key} className="text-xs font-bold py-1.5 cursor-pointer">
                            {q.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsAdminEditingFunnel(!isAdminEditingFunnel)}
                      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-300 transition shadow-2xs cursor-pointer"
                      title="Chỉnh sửa số liệu Quý (Chỉ Admin)"
                    >
                      {isAdminEditingFunnel ? 'Đóng sửa' : '✏️ Sửa số liệu'}
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Editing Inline Form */}
              {isAdmin && isAdminEditingFunnel ? (
                <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                      🛠️ Điều chỉnh số liệu Funnel cho {currentQOpt.label} (Chỉ Admin):
                    </span>
                    {quarterOverride && (
                      <button
                        type="button"
                        onClick={handleResetAdminOverride}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Khôi phục tự động
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        ① Dạy (Tổng HV)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        defaultValue={funnelEnrolled}
                        id="admin-input-enrolled"
                        className="h-8 rounded-lg font-bold text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-blue-700 mb-1">
                        ② Hoàn Thành Khóa
                      </label>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={funnelCompleted}
                        id="admin-input-completed"
                        className="h-8 rounded-lg font-bold text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-indigo-700 mb-1">
                        ③ Đi Thi Thật
                      </label>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={funnelExamed}
                        id="admin-input-examed"
                        className="h-8 rounded-lg font-bold text-center bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-800 mb-1">
                        ④ Đạt Aim Cam Kết
                      </label>
                      <Input
                        type="number"
                        min={0}
                        defaultValue={funnelAimPass}
                        id="admin-input-aim"
                        className="h-8 rounded-lg font-bold text-center bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAdminEditingFunnel(false)}
                      className="h-7 text-xs"
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const enrolled = Number((document.getElementById('admin-input-enrolled') as HTMLInputElement)?.value || funnelEnrolled)
                        const completed = Number((document.getElementById('admin-input-completed') as HTMLInputElement)?.value || funnelCompleted)
                        const examed = Number((document.getElementById('admin-input-examed') as HTMLInputElement)?.value || funnelExamed)
                        const aimPass = Number((document.getElementById('admin-input-aim') as HTMLInputElement)?.value || funnelAimPass)
                        handleSaveAdminOverride(enrolled, completed, examed, aimPass)
                      }}
                      className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      Lưu số liệu
                    </Button>
                  </div>
                </div>
              ) : (
                /* Funnel Stat Display Cards (Read-only cho Giáo viên) */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        ① Dạy (Tổng HV)
                      </span>
                      <span className="size-2 rounded-full bg-slate-400" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono text-center py-1">
                      {funnelEnrolled}
                    </div>
                    <span className="block text-center text-[10px] font-semibold text-slate-400">
                      Học viên quý
                    </span>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        ② Hoàn Thành Khóa
                      </span>
                      <span className="size-2 rounded-full bg-blue-500" />
                    </div>
                    <div className="text-2xl font-black text-blue-900 font-mono text-center py-1">
                      {funnelCompleted}
                    </div>
                    <span className="block text-center text-[10px] font-bold text-blue-600">
                      {funnelEnrolled > 0 ? Math.round((funnelCompleted / funnelEnrolled) * 100) : 0}% quy mô
                    </span>
                  </div>

                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                        ③ Đi Thi Thật
                      </span>
                      <span className="size-2 rounded-full bg-indigo-500" />
                    </div>
                    <div className="text-2xl font-black text-indigo-900 font-mono text-center py-1">
                      {funnelExamed}
                    </div>
                    <span className="block text-center text-[10px] font-bold text-indigo-600">
                      {funnelCompleted > 0 ? Math.round((funnelExamed / funnelCompleted) * 100) : 0}% hoàn thành
                    </span>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        ④ Đạt Aim Cam Kết
                      </span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-900 font-mono text-center py-1">
                      {funnelAimPass}
                    </div>
                    <span className="block text-center text-[10px] font-bold text-emerald-700">
                      {funnelExamed > 0 ? Math.round((funnelAimPass / funnelExamed) * 100) : 0}% đi thi
                    </span>
                  </div>
                </div>
              )}

              {/* Funnel Visual Bars */}
              <div className="space-y-3">
                {/* Step 1 */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>① Quy Mô Học Viên Ban Đầu</span>
                    <span>{funnelEnrolled} HV (100%)</span>
                  </div>
                  <div className="h-6 w-full rounded-xl bg-slate-200 overflow-hidden flex items-center">
                    <div className="h-full bg-slate-700 text-white text-[11px] font-extrabold flex items-center px-3" style={{ width: '100%' }}>
                      Tất cả học viên ({funnelEnrolled})
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-blue-900 mb-1">
                    <span>② Tỷ Lệ Hoàn Thành Khóa (Engagement)</span>
                    <span>
                      {funnelCompleted} HV ({funnelEnrolled > 0 ? Math.round((funnelCompleted / funnelEnrolled) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-xl bg-slate-100 overflow-hidden flex items-center">
                    <div
                      className="h-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center px-3 transition-all duration-500"
                      style={{ width: `${funnelEnrolled > 0 ? Math.min(100, Math.round((funnelCompleted / funnelEnrolled) * 100)) : 0}%` }}
                    >
                      Hoàn thành {funnelCompleted} HV
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-indigo-900 mb-1">
                    <span>③ Học Viên Đi Thi IELTS Thật</span>
                    <span>
                      {funnelExamed} HV ({funnelCompleted > 0 ? Math.round((funnelExamed / funnelCompleted) * 100) : 0}% của nhóm hoàn thành)
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-xl bg-slate-100 overflow-hidden flex items-center">
                    <div
                      className="h-full bg-indigo-600 text-white text-[11px] font-extrabold flex items-center px-3 transition-all duration-500"
                      style={{ width: `${funnelEnrolled > 0 ? Math.min(100, Math.round((funnelExamed / funnelEnrolled) * 100)) : 0}%` }}
                    >
                      Đi thi thật {funnelExamed} HV
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-emerald-900 mb-1">
                    <span>④ Học Viên Đạt Aim Đầu Ra (Xét Expert)</span>
                    <span className="font-extrabold text-emerald-800">
                      {funnelAimPass} HV ({funnelExamed > 0 ? Math.round((funnelAimPass / funnelExamed) * 100) : 0}% của nhóm thi thật)
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-xl bg-slate-100 overflow-hidden flex items-center">
                    <div
                      className="h-full bg-emerald-600 text-white text-[11px] font-extrabold flex items-center px-3 transition-all duration-500"
                      style={{ width: `${funnelEnrolled > 0 ? Math.min(100, Math.round((funnelAimPass / funnelEnrolled) * 100)) : 0}%` }}
                    >
                      Đạt Aim {funnelAimPass} HV
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BẢNG HV ĐƯỢC LOẠI KHỎI KPI GV (Khớp 100% Ảnh Mới) */}
            <div className="rounded-2xl border border-rose-200 overflow-hidden shadow-xs">
              <div className="bg-rose-950 px-4 py-3 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 text-rose-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider">
                      HV ĐƯỢC LOẠI KHỎI KPI GV
                    </h3>
                  </div>
                  <p className="text-[11px] text-rose-200 font-normal mt-0.5">
                    Dựa trên điều kiện cam kết đầu ra trong Nội quy. HV vi phạm ≥ 1 điều kiện → loại khỏi mẫu tính band trung bình (funnel). Cần GV xác nhận + CS xác nhận.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="p-3.5 w-1/4">Điều Kiện Vi Phạm</th>
                      <th className="p-3.5 w-2/5">Định Nghĩa Cụ Thể</th>
                      <th className="p-3.5 w-1/6 text-center">Cơ Sở Nội Quy</th>
                      <th className="p-3.5 text-center">Ai Xác Nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <strong className="text-rose-900 block font-black text-sm">
                          Vi phạm 1
                        </strong>
                        <span className="text-slate-600 font-semibold">
                          BTVN không đầy đủ
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-800 leading-relaxed">
                        Làm <strong className="text-rose-900">dưới 50%</strong> tổng bài tập được giao trong khoá{' '}
                        <br />
                        <strong>HOẶC</strong> còn bài chưa hoàn thành sau <strong>1 tuần</strong> kể từ ngày kết thúc khoá học.
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant="outline" className="font-mono text-[11px] border-slate-300 bg-slate-50">
                          Điều 6.1 &amp; 6.4 Nội quy
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800">
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-900 border border-amber-200">
                          GV + CS xác nhận
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <strong className="text-rose-900 block font-black text-sm">
                          Vi phạm 2
                        </strong>
                        <span className="text-slate-600 font-semibold">
                          Take note quá 02 buổi
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-800 leading-relaxed">
                        Nghỉ <strong className="text-rose-900">quá 2 buổi/khoá</strong> dẫn tới việc GV phải chữa take notes thay vì dạy trực tiếp.
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge variant="outline" className="font-mono text-[11px] border-slate-300 bg-slate-50">
                          Điều 2.1 &amp; 2.2 Nội quy
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800">
                        <span className="rounded-lg bg-blue-50 px-2 py-1 text-blue-900 border border-blue-200">
                          CS xác nhận từ lịch điểm danh
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Interactive Exclusion Checker Tool */}
              <div className="bg-slate-50/80 p-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Công cụ kiểm tra nhanh điều kiện loại trừ học viên:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-2 rounded-xl bg-white p-3 border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={violationHomework}
                      onChange={(e) => setViolationHomework(e.target.checked)}
                      className="mt-0.5 size-4 accent-rose-600 rounded"
                    />
                    <span className="text-slate-700">
                      <strong>Vi phạm 1:</strong> Học viên làm &lt; 50% bài tập hoặc nợ bài quá 1 tuần sau khóa.
                    </span>
                  </label>

                  <label className="flex items-start gap-2 rounded-xl bg-white p-3 border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={violationTakeNote}
                      onChange={(e) => setViolationTakeNote(e.target.checked)}
                      className="mt-0.5 size-4 accent-rose-600 rounded"
                    />
                    <span className="text-slate-700">
                      <strong>Vi phạm 2:</strong> Học viên nghỉ quá 2 buổi/khóa dẫn tới việc GV phải chữa take note.
                    </span>
                  </label>
                </div>

                {(violationHomework || violationTakeNote) && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 p-3 text-xs font-bold text-emerald-900 animate-in fade-in duration-300">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>
                      ✓ Học viên vi phạm {violationHomework && violationTakeNote ? 'cả 2 điều kiện' : 'điều kiện cam kết'} →{' '}
                      <strong>Đủ điều kiện loại khỏi mẫu tính band trung bình (funnel) &amp; KPI cam kết của GV</strong>. GV và CS cùng xác nhận để hoàn tất thủ tục.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. CÔNG CỤ TÍNH & ĐÁNH GIÁ HẠNG TỰ ĐỘNG (Interactive Evaluator) ───── */}
      {activeTab === 'evaluator' && (
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-slate-50 p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs">
                <Sparkles className="size-4" />
              </span>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Công Cụ Đánh Giá Hạng Tự Động (Rank Evaluator)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Nhập số liệu thực tế của quý để hệ thống tự động tính tỷ lệ, đối soát điều kiện mẫu tối thiểu và xác định xếp hạng dự kiến.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Hạng hiện tại:</span>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEvalCurrentRank('standard')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    evalCurrentRank === 'standard' ? 'bg-white shadow-xs text-slate-900 font-black' : 'text-slate-600'
                  )}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setEvalCurrentRank('expert')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    evalCurrentRank === 'expert' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-slate-600'
                  )}
                >
                  Expert ⭐
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Input fields */}
            <div className="space-y-4 lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              {/* Field 1: Pass demo */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    1. Buổi Demo Học Viên (Min 8 demo/quý)
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold',
                      hasEnoughDemoSample ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-amber-300 text-amber-800 bg-amber-50'
                    )}
                  >
                    {hasEnoughDemoSample ? 'Đủ mẫu (≥8)' : 'Chưa đủ mẫu (<8)'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Tổng số HV Demo:</label>
                    <Input
                      type="number"
                      min={0}
                      value={evalDemoTotal}
                      onChange={(e) => setEvalDemoTotal(Number(e.target.value))}
                      className="h-8 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Số HV Chốt Trong 7 Ngày:</label>
                    <Input
                      type="number"
                      min={0}
                      max={evalDemoTotal}
                      value={evalDemoPass}
                      onChange={(e) => setEvalDemoPass(Number(e.target.value))}
                      className="h-8 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1 text-slate-700">
                  <span>Tỷ lệ Pass Demo:</span>
                  <strong className={cn(evalPassDemoRate >= 80 ? 'text-emerald-700' : evalPassDemoRate >= 60 ? 'text-blue-700' : 'text-rose-700')}>
                    {evalPassDemoRate}%
                  </strong>
                </div>
              </div>

              {/* Field 2: Drop-out */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    2. Học Viên Bắt Đầu & Drop-out (Quy chuẩn ≤15% / ≤25%)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Tổng HV Bắt Đầu Học Trong Quý:</label>
                    <Input
                      type="number"
                      min={1}
                      value={evalStudentsTotal}
                      onChange={(e) => setEvalStudentsTotal(Number(e.target.value))}
                      className="h-8 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Số HV Bị Tính Drop:</label>
                    <Input
                      type="number"
                      min={0}
                      max={evalStudentsTotal}
                      value={evalDropTotal}
                      onChange={(e) => setEvalDropTotal(Number(e.target.value))}
                      className="h-8 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1 text-slate-700">
                  <span>Tỷ lệ Drop-out:</span>
                  <strong className={cn(evalDropRate <= 15 ? 'text-emerald-700' : evalDropRate <= 25 ? 'text-blue-700' : 'text-rose-700')}>
                    {evalDropRate}%
                  </strong>
                </div>
              </div>

              {/* Field 3: Aim rate */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    3. Học Viên Kết Thúc Khóa & Đạt Aim (Min 5 HV xét Expert)
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold',
                      hasEnoughAimSample ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-amber-300 text-amber-800 bg-amber-50'
                    )}
                  >
                    {hasEnoughAimSample ? 'Đủ mẫu (≥5)' : 'Chưa đủ mẫu (<5)'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Số HV Kết Thúc Khóa & Thi Thật:</label>
                    <Input
                      type="number"
                      min={0}
                      value={evalGraduatesTotal}
                      onChange={(e) => setEvalGraduatesTotal(Number(e.target.value))}
                      className="h-8 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Số HV Đạt Aim Cam Kết:</label>
                    <Input
                      type="number"
                      min={0}
                      max={evalGraduatesTotal}
                      value={evalAimPassTotal}
                      onChange={(e) => setEvalAimPassTotal(Number(e.target.value))}
                      className="h-8 rounded-lg font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold pt-1 text-slate-700">
                  <span>Tỷ lệ Đạt Aim:</span>
                  <strong className={cn(evalAimRate >= 35 ? 'text-emerald-700' : 'text-slate-700')}>
                    {evalAimRate}% {hasEnoughAimSample && evalAimRate >= 35 ? '(Đạt tiêu chuẩn Expert)' : ''}
                  </strong>
                </div>
              </div>
            </div>

            {/* Evaluation Result card */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  KẾT QUẢ ĐÁNH GIÁ DỰ KIẾN
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-1">
                  {evalResult.title}
                </h4>

                <div className="my-3">
                  <Badge className={cn('text-xs px-3 py-1 font-black', evalResult.badge)}>
                    {evalResult.rank.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block">Căn cứ đánh giá:</span>
                  <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
                    {evalResult.reasons.map((r, idx) => (
                      <li key={idx} className="leading-snug">{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-900 block mb-0.5">Khuyến nghị:</span>
                <p className="leading-relaxed">{evalResult.advice}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
