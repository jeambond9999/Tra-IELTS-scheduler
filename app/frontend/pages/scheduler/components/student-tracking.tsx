import { useMemo, useState } from 'react'
import { router } from '@inertiajs/react'
import {
  Award,
  BookCheck,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit,
  Filter,
  GraduationCap,
  PauseCircle,
  Play,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  TriangleAlert,
  UserCheck,
  Users,
  UsersRound,
  X,
  Zap,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Person, PersonRole, SchedulerMutationRedirectParams, SchedulerProps } from '../types'
import { TagBadges } from './note-tags'
import { EditStudentDialog } from './edit-student-dialog'

export function evaluateAimAchieved(
  aim?: string | null,
  actualScore?: string | null
): boolean | null {
  if (!actualScore || !actualScore.trim()) return null
  if (!aim || !aim.trim()) return null

  const aimMatch = aim.trim().match(/\d+(?:\.\d+)?/)
  const scoreMatch = actualScore.trim().match(/\d+(?:\.\d+)?/)

  if (aimMatch && scoreMatch) {
    const aimNum = parseFloat(aimMatch[0])
    const scoreNum = parseFloat(scoreMatch[0])
    if (!isNaN(aimNum) && !isNaN(scoreNum)) {
      return scoreNum >= aimNum
    }
  }

  const cefrLevels: Record<string, number> = {
    a1: 1,
    a2: 2,
    b1: 3,
    b2: 4,
    c1: 5,
    c2: 6,
  }
  const aimCefr = aim.trim().toLowerCase()
  const scoreCefr = actualScore.trim().toLowerCase()
  if (cefrLevels[aimCefr] !== undefined && cefrLevels[scoreCefr] !== undefined) {
    return cefrLevels[scoreCefr] >= cefrLevels[aimCefr]
  }

  return scoreCefr.includes(aimCefr)
}

export function isUpcomingExam(examDateStr?: string | null): boolean {
  if (!examDateStr || !examDateStr.trim()) return false
  const str = examDateStr.trim().toLowerCase()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= -7 && diffDays <= 90
  }

  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmyMatch) {
    const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]))
    const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= -7 && diffDays <= 90
  }

  const myMatch = str.match(/^(\d{1,2})\/(\d{4})$/)
  if (myMatch) {
    const m = Number(myMatch[1])
    const y = Number(myMatch[2])
    const monthDiff = (y - currentYear) * 12 + (m - currentMonth)
    return monthDiff >= -1 && monthDiff <= 3
  }

  const ymMatch = str.match(/^(\d{4})-(\d{1,2})$/)
  if (ymMatch) {
    const y = Number(ymMatch[1])
    const m = Number(ymMatch[2])
    const monthDiff = (y - currentYear) * 12 + (m - currentMonth)
    return monthDiff >= -1 && monthDiff <= 3
  }

  const textMonthMatch = str.match(/(?:tháng|thang|t)\s*(\d{1,2})(?:\/|[- ])?(\d{4})?/)
  if (textMonthMatch) {
    const m = Number(textMonthMatch[1])
    const y = textMonthMatch[2] ? Number(textMonthMatch[2]) : currentYear
    const monthDiff = (y - currentYear) * 12 + (m - currentMonth)
    return monthDiff >= -1 && monthDiff <= 3
  }

  if (/201\d|202[0-4]/.test(str)) return false
  return true
}

export function extractExamDateFromNote(note?: string | null): string | null {
  if (!note || !note.trim()) return null
  const str = note.trim()

  // 1. Full date dd/mm/yyyy with exam context
  const fullMatch = str.match(/(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)
  if (fullMatch) return fullMatch[1]

  // 2. Month and year e.g. "cuối t9/2026", "tháng 9/2026", "t10/2026"
  const myMatch = str.match(/(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(?:tháng|thang|t)\s*(\d{1,2})(?:[\/\-]|[- ](?:năm\s*)?)(\d{4})/i)
  if (myMatch) {
    const m = Number(myMatch[1])
    const y = myMatch[2]
    const mm = m < 10 ? `0${m}` : `${m}`
    return `${mm}/${y}`
  }

  // 3. Direct mm/yyyy after thi: "thi 09/2026"
  const directMmMatch = str.match(/(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(\d{1,2})\/(\d{4})/i)
  if (directMmMatch) {
    const m = Number(directMmMatch[1])
    const y = directMmMatch[2]
    if (m >= 1 && m <= 12) {
      const mm = m < 10 ? `0${m}` : `${m}`
      return `${mm}/${y}`
    }
  }

  // 4. Month only with exam context: "thi vào cuối tháng 9"
  const mOnlyMatch = str.match(/(?:thi|exam|mục tiêu|target|kế hoạch)[^.\n;]*?(?:tháng|thang|t)\s*(\d{1,2})(?!\d)/i)
  if (mOnlyMatch) {
    const m = Number(mOnlyMatch[1])
    if (m >= 1 && m <= 12) {
      const now = new Date()
      const curYear = now.getFullYear()
      const curMonth = now.getMonth() + 1
      const y = m < curMonth - 2 ? curYear + 1 : curYear
      const mm = m < 10 ? `0${m}` : `${m}`
      return `${mm}/${y}`
    }
  }

  return null
}

export type ExamMonthOption = {
  value: string
  label: string
}

export function normalizeExamMonthVal(val?: string | null): string {
  if (!val || !val.trim()) return ''
  const trimmed = val.trim()

  const myMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/)
  if (myMatch) {
    const mm = Number(myMatch[1]) < 10 ? `0${Number(myMatch[1])}` : `${Number(myMatch[1])}`
    return `${mm}/${myMatch[2]}`
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmyMatch) {
    const mm = Number(dmyMatch[2]) < 10 ? `0${Number(dmyMatch[2])}` : `${Number(dmyMatch[2])}`
    return `${mm}/${dmyMatch[3]}`
  }

  const ymMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/)
  if (ymMatch) {
    const mm = Number(ymMatch[2]) < 10 ? `0${Number(ymMatch[2])}` : `${Number(ymMatch[2])}`
    return `${mm}/${ymMatch[1]}`
  }

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (ymdMatch) {
    const mm = Number(ymdMatch[2]) < 10 ? `0${Number(ymdMatch[2])}` : `${Number(ymdMatch[2])}`
    return `${mm}/${ymdMatch[1]}`
  }

  const textMonthMatch = trimmed.match(/(?:tháng|thang|t)\s*(\d{1,2})(?:\/|[- ])?(\d{4})?/i)
  if (textMonthMatch) {
    const mm = Number(textMonthMatch[1]) < 10 ? `0${Number(textMonthMatch[1])}` : `${Number(textMonthMatch[1])}`
    const yyyy = textMonthMatch[2] || `${new Date().getFullYear()}`
    return `${mm}/${yyyy}`
  }

  return trimmed
}

export function getExamMonthOptions(currentValue?: string | null): ExamMonthOption[] {
  const options: ExamMonthOption[] = [
    { value: '', label: '— Chưa có —' },
  ]

  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  // Range: past 2 months to next 12 months
  for (let offset = -2; offset <= 12; offset++) {
    const d = new Date(curYear, curMonth - 1 + offset, 1)
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    const mm = m < 10 ? `0${m}` : `${m}`
    const val = `${mm}/${y}`
    const isCurrent = offset === 0
    const label = `Tháng ${mm}/${y}${isCurrent ? ' (Hiện tại)' : ''}`
    options.push({ value: val, label })
  }

  if (currentValue && currentValue.trim()) {
    const trimmed = currentValue.trim()
    const normalized = normalizeExamMonthVal(trimmed)
    const exists = options.some((opt) => opt.value === trimmed || (normalized && opt.value === normalized))
    if (!exists) {
      options.splice(1, 0, {
        value: trimmed,
        label: `${trimmed} (Tùy chỉnh)`,
      })
    }
  }

  return options
}

type StudentRecord = SchedulerProps['studentTracking'][number]

type Props = {
  students: SchedulerProps['studentTracking']
  teacherName: string
  teachers?: Person[]
  isCenterWide?: boolean
  role?: PersonRole
  onSelectStudent?: (student: StudentRecord) => void
  onReserveStudent?: (student: StudentRecord) => void
  onResumeStudent?: (student: StudentRecord) => void
  redirectParams?: SchedulerMutationRedirectParams
}

// ─── Payment badge ────────────────────────────────────────────────────────────
function PaymentBadge({ status }: { status: string }) {
  const normalised = status?.toLowerCase() ?? ''
  if (
    normalised.includes('paid') ||
    normalised.includes('thanh toán') ||
    normalised.includes('complete')
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Đã TT
      </span>
    )
  }
  if (normalised.includes('partial') || normalised.includes('một phần')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Một phần
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      <span className="size-1.5 rounded-full bg-slate-400" />
      {status || 'Chưa TT'}
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({
  pct,
  completed,
  total,
  remaining,
  almostEnd,
  isEnded,
}: {
  pct: number
  completed: number
  total: number
  remaining: number
  almostEnd: boolean
  isEnded: boolean
}) {
  const barColor = isEnded
    ? 'bg-slate-400'
    : almostEnd
      ? 'bg-rose-500'
      : pct >= 80
        ? 'bg-emerald-700'
        : pct >= 50
          ? 'bg-blue-600'
          : 'bg-amber-400'

  return (
    <div className="flex flex-col gap-1.5">
      {/* Track */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {/* Labels */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
        <span className="text-slate-500">
          Đã hoàn thành: <strong>{completed}</strong>
        </span>
        <span className="text-slate-500">
          Còn lại:{' '}
          <strong
            className={cn(
              isEnded ? 'text-slate-500 font-bold' : almostEnd ? 'font-black text-rose-600' : 'text-slate-800'
            )}
          >
            {remaining} buổi
          </strong>
        </span>
      </div>
    </div>
  )
}

// ─── Student card ─────────────────────────────────────────────────────────────
function StudentCard({
  student,
  role,
  onSelect,
  onReserve,
  onResume,
  onEditStudent,
  redirectParams,
}: {
  student: StudentRecord
  role?: PersonRole
  onSelect?: () => void
  onReserve?: () => void
  onResume?: () => void
  onEditStudent?: (student: StudentRecord) => void
  redirectParams?: SchedulerMutationRedirectParams
}) {
  const [loading, setLoading] = useState(false)
  const isTeacher = role === 'teacher' || redirectParams?.role === 'teacher'
  const canEditStudent =
    !isTeacher &&
    (role === 'sales' ||
      role === 'cs' ||
      role === 'admin' ||
      redirectParams?.role === 'sales' ||
      redirectParams?.role === 'cs' ||
      redirectParams?.role === 'admin') &&
    Boolean(onEditStudent)
  const isReserved = Boolean(student.isReserved || student.status === 'reserved' || student.reservedFrom)
  const isEnded = !isReserved && Boolean(student.isEnded || student.active === false || (student.total > 0 && student.remaining === 0))
  const { almostEnd } = student

  const [editingExamDate, setEditingExamDate] = useState(false)
  const [examDateValue, setExamDateValue] = useState(student.examDate || '')
  const [savingExamDate, setSavingExamDate] = useState(false)

  const [editingNote, setEditingNote] = useState(false)
  const [noteValue, setNoteValue] = useState(student.studentNote || '')
  const [savingNote, setSavingNote] = useState(false)

  const [editingTarget, setEditingTarget] = useState(false)
  const [baselineValue, setBaselineValue] = useState(student.baseline || '')
  const [aimValue, setAimValue] = useState(student.aim || '')
  const [savingTarget, setSavingTarget] = useState(false)

  const [updatingExamStatus, setUpdatingExamStatus] = useState(false)
  const [editingScore, setEditingScore] = useState(false)
  const [scoreValue, setScoreValue] = useState(student.actualScore || '')
  const [savingScore, setSavingScore] = useState(false)

  const noteExtractedDate = useMemo(() => {
    return extractExamDateFromNote(student.studentNote)
  }, [student.studentNote])

  const effectiveExamDate = student.examDate || noteExtractedDate || ''
  const effectiveExamMonthVal = normalizeExamMonthVal(effectiveExamDate)

  const currentExamStatus = useMemo(() => {
    const raw = (student.examStatus || '').trim().toLowerCase()
    if (raw === 'đã thi' || raw === 'taken' || Boolean(student.actualScore && student.actualScore.trim())) {
      return 'đã thi'
    }
    if (raw === 'sắp thi' || raw === 'upcoming') {
      return 'sắp thi'
    }
    if (isUpcomingExam(effectiveExamDate)) {
      return 'sắp thi'
    }
    if (raw === 'chưa thi' || raw === 'not_taken') {
      return 'chưa thi'
    }
    return 'chưa thi'
  }, [student.examStatus, student.actualScore, effectiveExamDate])

  const computedAimAchieved = useMemo(() => {
    if (student.aimAchieved !== undefined && student.aimAchieved !== null) {
      return student.aimAchieved
    }
    return evaluateAimAchieved(student.aim, student.actualScore)
  }, [student.aimAchieved, student.aim, student.actualScore])

  const handleSaveTarget = () => {
    if (!student.enrollmentId) return
    setSavingTarget(true)
    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: {
          baseline: baselineValue.trim(),
          aim: aimValue.trim(),
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => setEditingTarget(false),
        onFinish: () => setSavingTarget(false),
      }
    )
  }

  const handleUpdateExamStatus = (newStatus: string) => {
    if (!student.enrollmentId) return
    setUpdatingExamStatus(true)
    if (newStatus === 'đã thi' && !student.actualScore) {
      setScoreValue(student.actualScore || '')
      setEditingScore(true)
    }
    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: {
          exam_status: newStatus,
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onFinish: () => setUpdatingExamStatus(false),
      }
    )
  }

  const handleSaveScore = () => {
    if (!student.enrollmentId) return
    setSavingScore(true)
    const isAchieved = evaluateAimAchieved(student.aim, scoreValue)
    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: {
          actual_score: scoreValue.trim(),
          exam_status: 'đã thi',
          aim_achieved: isAchieved,
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => setEditingScore(false),
        onFinish: () => setSavingScore(false),
      }
    )
  }

  const [customExamDateInput, setCustomExamDateInput] = useState(false)

  const handleSelectExamMonth = (selectedVal: string) => {
    if (!student.enrollmentId) return
    setSavingExamDate(true)

    const patchData: Record<string, any> = {
      exam_date: selectedVal,
    }

    if (selectedVal && isUpcomingExam(selectedVal)) {
      if (currentExamStatus !== 'đã thi') {
        patchData.exam_status = 'sắp thi'
      }
    } else if (!selectedVal) {
      if (currentExamStatus === 'sắp thi') {
        patchData.exam_status = 'chưa thi'
      }
    }

    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: patchData,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onFinish: () => setSavingExamDate(false),
      }
    )
  }

  const handleSaveCustomExamDate = (customVal: string) => {
    if (!student.enrollmentId) return
    setSavingExamDate(true)

    const patchData: Record<string, any> = {
      exam_date: customVal.trim(),
    }
    if (customVal && isUpcomingExam(customVal)) {
      if (currentExamStatus !== 'đã thi') {
        patchData.exam_status = 'sắp thi'
      }
    }

    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: patchData,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => setCustomExamDateInput(false),
        onFinish: () => setSavingExamDate(false),
      }
    )
  }

  const handleSaveNote = () => {
    if (!student.enrollmentId) return
    setSavingNote(true)

    const patchEnrollment: Record<string, any> = {
      student_note: noteValue,
    }

    const extractedDate = extractExamDateFromNote(noteValue)
    if (extractedDate) {
      patchEnrollment.exam_date = extractedDate
      if (isUpcomingExam(extractedDate) && currentExamStatus !== 'đã thi') {
        patchEnrollment.exam_status = 'sắp thi'
      }
    }

    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: patchEnrollment,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => setEditingNote(false),
        onFinish: () => setSavingNote(false),
      }
    )
  }

  const toggleCourseStatus = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!student.enrollmentId) return

    setLoading(true)
    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: { active: isEnded ? true : false },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onFinish: () => setLoading(false),
      }
    )
  }

  return (
    <article
      onClick={onSelect}
      className={cn(
        'group relative flex flex-col gap-3 overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer',
        isReserved
          ? 'border-amber-300 bg-amber-50/25'
          : isEnded
            ? 'border-slate-200 bg-slate-50/60 opacity-90'
            : almostEnd
              ? 'border-rose-200 bg-rose-50/30'
              : 'border-slate-200'
      )}
    >
      {/* Top accent stripe */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-0.5',
          isReserved
            ? 'bg-amber-400'
            : isEnded
              ? 'bg-slate-300'
              : almostEnd
                ? 'bg-rose-400'
                : 'bg-emerald-500'
        )}
      />

      {/* ── Student Top Header: Tên, Mã, Khóa trên 1 dòng duy nhất ── */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-2xl font-black text-sm shadow-xs transition-transform group-hover:scale-105',
            isReserved
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : isEnded
                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
          )}
        >
          {student.studentName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          {/* Dòng 1: Tên + Mã + Khóa học TRÊN CÙNG 1 DÒNG */}
          <div className="flex items-center gap-1.5 min-w-0 flex-nowrap overflow-hidden">
            <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition whitespace-nowrap truncate">
              {student.studentName}
            </h4>
            <span className="font-mono text-[10px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/80 shrink-0 whitespace-nowrap">
              {student.studentCode}
            </span>
            {canEditStudent && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditStudent(student)
                }}
                className="inline-flex items-center justify-center size-5 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition shrink-0"
                title="Sửa tên và mã học viên"
              >
                <Edit className="size-3" />
              </button>
            )}
            {student.course && (
              <span className="text-[11px] font-bold text-slate-400 truncate whitespace-nowrap">
                • {student.course}
              </span>
            )}
          </div>

          {/* Dòng 2: Badges thanh toán & Trạng thái khóa học */}
          <div className="flex items-center gap-1.5">
            <PaymentBadge status={student.paymentStatus} />

            {isReserved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                <PauseCircle className="size-2.5" />
                Bảo lưu
              </span>
            ) : isEnded ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                <BookCheck className="size-2.5" />
                Đã end
              </span>
            ) : student.hasNewerCourse ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <Sparkles className="size-2.5" />
                Lên khóa mới
              </span>
            ) : almostEnd ? (
              <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                <TriangleAlert className="size-2.5" />
                Sắp end
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <UserCheck className="size-2.5" />
                Đang học
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Academic & Exam Strip (Không tràn viền, phân tầng rõ ràng) ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-2.5 text-xs text-slate-800 shadow-2xs space-y-2"
      >
        {/* Hàng 1: Đầu vào & Aim (trái) + Trạng thái thi (phải) */}
        {editingTarget ? (
          <div className="flex items-center justify-between gap-1.5 w-full bg-white p-2 rounded-xl border border-amber-300 shadow-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Vào:</span>
              <input
                value={baselineValue}
                onChange={(e) => setBaselineValue(e.target.value)}
                placeholder="5.5"
                className="h-7.5 w-16 px-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-[10px] font-bold text-amber-600 uppercase shrink-0 ml-1">Aim:</span>
              <input
                value={aimValue}
                onChange={(e) => setAimValue(e.target.value)}
                placeholder="6.5"
                className="h-7.5 w-16 px-2 text-xs font-bold bg-slate-50 border border-amber-400 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={savingTarget}
                onClick={handleSaveTarget}
                className="h-7.5 px-2.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
              >
                {savingTarget ? '...' : 'Lưu'}
              </button>
              <button
                type="button"
                onClick={() => setEditingTarget(false)}
                className="h-7.5 text-slate-400 hover:text-slate-600 text-xs px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 w-full">
            {/* Trái: Vào & Aim */}
            <div
              onClick={() => {
                setBaselineValue(student.baseline || '')
                setAimValue(student.aim || '')
                setEditingTarget(true)
              }}
              className="group flex items-center gap-1 cursor-pointer hover:opacity-85 transition min-w-0"
              title="Click để sửa Đầu vào & Aim"
            >
              <span className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg font-bold text-slate-700 shadow-2xs whitespace-nowrap text-[11px]">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase">Vào</span>
                <strong>{student.baseline || '—'}</strong>
              </span>
              <span className="text-slate-400 font-bold">→</span>
              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg font-black text-amber-900 shadow-2xs whitespace-nowrap text-[11px]">
                <span className="text-[9px] font-extrabold text-amber-600 uppercase">Aim</span>
                <strong className="underline decoration-amber-400">{student.aim || '—'}</strong>
              </span>
              <Edit className="size-3 text-slate-400 group-hover:text-amber-600 transition shrink-0 ml-0.5" />
            </div>

            {/* Phải: Trạng thái thi Dropdown */}
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={currentExamStatus}
                onChange={(e) => handleUpdateExamStatus(e.target.value)}
                disabled={updatingExamStatus}
                className={cn(
                  'h-8 min-w-[95px] rounded-lg px-2.5 py-1 text-xs font-black border transition shadow-xs cursor-pointer focus:outline-none focus:ring-2',
                  currentExamStatus === 'đã thi'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-300'
                    : currentExamStatus === 'sắp thi'
                      ? 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-300'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                )}
              >
                <option value="chưa thi">Chưa thi</option>
                <option value="sắp thi">Sắp thi</option>
                <option value="đã thi">Đã thi</option>
              </select>
            </div>
          </div>
        )}

        {/* Hàng 2: Thời gian thi (Dropdown MM/YYYY rộng rãi) */}
        <div className="flex items-center gap-2 text-xs w-full pt-1.5 border-t border-slate-200/60">
          <span className="font-extrabold text-slate-600 flex items-center gap-1 text-[11px] uppercase whitespace-nowrap shrink-0">
            <Calendar className="size-3.5 text-indigo-600 shrink-0" />
            Thi:
          </span>
          {customExamDateInput ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <input
                value={examDateValue}
                onChange={(e) => setExamDateValue(e.target.value)}
                placeholder="VD: 15/10/2026..."
                className="h-8 flex-1 min-w-0 px-2.5 text-xs font-bold bg-white border border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomExamDate(examDateValue)
                  if (e.key === 'Escape') setCustomExamDateInput(false)
                }}
              />
              <button
                type="button"
                disabled={savingExamDate}
                onClick={() => handleSaveCustomExamDate(examDateValue)}
                className="h-8 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shrink-0"
              >
                {savingExamDate ? '...' : 'Lưu'}
              </button>
              <button
                type="button"
                onClick={() => setCustomExamDateInput(false)}
                className="h-8 text-slate-400 hover:text-slate-600 text-xs px-1.5 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
            <select
              value={effectiveExamMonthVal}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setExamDateValue(effectiveExamDate || '')
                  setCustomExamDateInput(true)
                } else {
                  handleSelectExamMonth(e.target.value)
                }
              }}
              disabled={savingExamDate}
              className="h-8 flex-1 min-w-0 rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-950 shadow-xs cursor-pointer hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {getExamMonthOptions(effectiveExamDate).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="__custom__">+ Nhập ngày cụ thể...</option>
            </select>
          )}
        </div>

        {/* Hàng 3: Khi Đã thi: Điểm thi & Tự tính Aim */}
        {currentExamStatus === 'đã thi' && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 bg-white/70 -mx-2.5 -mb-2.5 px-3 py-1.5 rounded-b-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-black text-slate-800 flex items-center gap-1 whitespace-nowrap shrink-0">
                <Award className="size-3.5 text-blue-600 shrink-0" />
                Điểm thi:
              </span>
              {editingScore ? (
                <div className="flex items-center gap-1 min-w-0">
                  <input
                    value={scoreValue}
                    onChange={(e) => setScoreValue(e.target.value)}
                    placeholder="VD: 7.0, 6.5..."
                    className="h-8 w-24 px-2 text-xs font-bold bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveScore()
                      if (e.key === 'Escape') setEditingScore(false)
                    }}
                  />
                  <button
                    type="button"
                    disabled={savingScore}
                    onClick={handleSaveScore}
                    className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    {savingScore ? '...' : 'Lưu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingScore(false)}
                    className="h-8 text-slate-400 hover:text-slate-600 text-xs px-1.5 cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setScoreValue(student.actualScore || '')
                    setEditingScore(true)
                  }}
                  className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 hover:border-blue-400 px-2 py-0.5 rounded-md font-extrabold text-blue-900 text-xs cursor-pointer transition shadow-2xs"
                  title="Click để sửa điểm thi"
                >
                  <span>{student.actualScore || 'Nhập điểm'}</span>
                  <Edit className="size-2.5 text-blue-500 ml-0.5" />
                </button>
              )}
            </div>

            {/* Aim Achieved status badge */}
            <div className="shrink-0">
              {computedAimAchieved === true ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-800 shadow-2xs">
                  <CheckCircle2 className="size-3 text-emerald-600" />
                  Đạt Aim
                </span>
              ) : computedAimAchieved === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-black text-rose-700 shadow-2xs">
                  <X className="size-3 text-rose-600" />
                  Chưa đạt Aim
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Chưa rõ
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Reservation Info ── */}
      {isReserved && (
        <div className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-2.5 text-[11px] text-amber-900 space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span>📅 Từ: {student.reservedFrom ? new Date(student.reservedFrom).toLocaleDateString('vi-VN') : '—'}</span>
            <span className="text-amber-800">Đã bảo lưu: {student.reservationDays || 0} ngày</span>
          </div>
          {student.resumeDate && (
            <p>🎯 Hẹn học lại: <strong>{new Date(student.resumeDate).toLocaleDateString('vi-VN')}</strong></p>
          )}
          {student.reservationNote && (
            <p className="text-[11px] italic text-amber-800/90 pt-0.5 border-t border-amber-200/60">
              💬 "{student.reservationNote}"
            </p>
          )}
        </div>
      )}

      {/* ── Progress Bar & Stats ── */}
      <ProgressBar
        pct={student.pct}
        completed={student.completed}
        total={student.total}
        remaining={student.remaining}
        almostEnd={almostEnd}
        isEnded={isEnded}
      />

      {/* ── Recent / Next sessions info ── */}
      <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
        {student.lastSessionDate && (
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Buổi gần nhất:</span>
            <span className="font-bold text-slate-700">
              {student.lastSessionDay ? `${student.lastSessionDay} • ` : ''}
              {new Date(student.lastSessionDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}
        {student.nextSessionDate && (
          <div className="flex items-center justify-between text-emerald-800 font-bold bg-emerald-50/70 px-2.5 py-1.5 rounded-xl border border-emerald-200/60">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5 text-emerald-600" />
              Buổi tiếp theo:
            </span>
            <span className="font-mono text-emerald-950">
              {student.nextSessionDay ? `${student.nextSessionDay} • ` : ''}
              {new Date(student.nextSessionDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}
      </div>

      {/* ── Note / Ghi chú học viên (GV & CS đều có thể ghi) ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-[10px] text-slate-700 uppercase tracking-wide flex items-center gap-1">
            📌 Ghi chú học viên:
          </span>
          {student.studentNote && <TagBadges text={student.studentNote} />}
          {!editingNote && (
            <button
              type="button"
              onClick={() => {
                setNoteValue(student.studentNote || '')
                setEditingNote(true)
              }}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Edit className="size-2.5" />
              {student.studentNote ? 'Sửa' : '+ Thêm ghi chú'}
            </button>
          )}
        </div>

        {editingNote ? (
          <div className="flex flex-col gap-1.5 pt-0.5">
            <Input
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Ghi chú về học viên, dặn dò, tình trạng..."
              className="h-8 text-xs bg-white border-slate-300"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveNote()
                if (e.key === 'Escape') setEditingNote(false)
              }}
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setEditingNote(false)}
                className="px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingNote}
                onClick={handleSaveNote}
                className="px-2.5 py-0.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Save className="size-3" />
                {savingNote ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        ) : student.studentNote ? (
          <p className="line-clamp-2 italic text-slate-700 text-[11px]">
            "{student.studentNote}"
          </p>
        ) : (
          <p
            onClick={() => {
              setNoteValue('')
              setEditingNote(true)
            }}
            className="text-[11px] text-slate-400 italic cursor-pointer hover:text-slate-600"
          >
            Chưa có ghi chú. Bấm để thêm ghi chú...
          </p>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
        {isReserved ? (
          <>
            {!isTeacher && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onResume ? onResume() : onSelect?.()
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-xs"
              >
                <Play className="size-3.5 fill-white" />
                <span>Học Lại / Xếp Lịch</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.()
              }}
              className={cn(
                "py-2 rounded-xl text-xs font-bold transition-all",
                isTeacher
                  ? "flex-1 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white"
                  : "px-3 bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              Xem Lịch
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.()
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
            >
              📋 Xem Lịch (Day 1..{student.total})
            </button>

            {!isTeacher && !isEnded && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onReserve ? onReserve() : onSelect?.()
                }}
                title="Bảo lưu khóa học cho học viên"
                className="px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-2xs"
              >
                <PauseCircle className="size-3.5 text-amber-700" />
                <span className="hidden sm:inline">Bảo lưu</span>
              </button>
            )}

            {!isTeacher && !isEnded && student.remaining > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.()
                }}
                title="Đổi tần suất học (1 buổi ➔ 2 buổi/tuần) và xếp lại các buổi còn lại"
                className="px-2.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-400 hover:text-slate-950 shadow-2xs"
              >
                <Zap className="size-3.5 fill-amber-600 text-amber-600" />
                <span className="hidden sm:inline">Đổi tần suất</span>
              </button>
            )}

            {!isTeacher && student.enrollmentId && (
              <button
                type="button"
                disabled={loading}
                onClick={toggleCourseStatus}
                title={isEnded ? 'Mở lại khóa học này' : 'Đánh dấu học viên đã hoàn thành / kết thúc khóa học'}
                className={cn(
                  'px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 border shadow-xs disabled:opacity-50',
                  isEnded
                    ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-600 hover:text-white'
                )}
              >
                {isEnded ? (
                  <>
                    <RotateCcw className="size-3.5" />
                    <span className="hidden sm:inline">Mở lại</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Đã end khóa</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </article>
  )
}

// ─── Section header with Stats ───────────────────────────────────────────────
function SectionHeader({
  total,
  activeCount,
  reservedCount,
  endedCount,
  almostEndCount,
  upcomingExamCount,
  takenCount,
  aimAchievedCount,
  scoredCount,
  aimRate,
  teacherName,
  isCenterWide,
  currentTeacherFilterName,
}: {
  total: number
  activeCount: number
  reservedCount: number
  endedCount: number
  almostEndCount: number
  upcomingExamCount?: number
  takenCount?: number
  aimAchievedCount?: number
  scoredCount?: number
  aimRate?: number | null
  teacherName: string
  isCenterWide?: boolean
  currentTeacherFilterName?: string | null
}) {
  const headerTitle = isCenterWide
    ? currentTeacherFilterName
      ? `👥 Danh Sách Học Viên — GV: ${currentTeacherFilterName}`
      : '👥 Thống Kê & Danh Sách Học Viên Toàn Trung Tâm'
    : `👥 Danh Sách Học Viên Đang Phụ Trách${teacherName ? ` (${teacherName})` : ''}`

  const headerSubtitle = isCenterWide
    ? currentTeacherFilterName
      ? `Đang lọc danh sách học viên phụ trách bởi giảng viên ${currentTeacherFilterName}.`
      : 'Tổng hợp toàn bộ học viên của tất cả Giảng Viên trong trung tâm. Theo dõi tiến độ học tập, ca học, bảo lưu và kết thúc khóa.'
    : 'Theo dõi tiến độ học tập, số buổi hoàn thành, học viên bảo lưu và thời điểm sắp kết thúc khóa học.'

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Users className="size-4" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              {headerTitle}
            </h2>
            <p className="text-xs font-medium text-slate-500">
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Tổng học viên đã nhận */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 shadow-xs">
            <UsersRound className="size-3.5 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-600">Tổng HV:</span>
            <span className="font-mono text-sm font-black text-slate-900">{total}</span>
          </div>

          {/* 2. Số học viên hiện tại (Đang học) */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 shadow-xs">
            <UserCheck className="size-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold text-emerald-800">Đang học:</span>
            <span className="font-mono text-sm font-black text-emerald-700">{activeCount}</span>
          </div>

          {/* 3. Số học viên đang bảo lưu */}
          {reservedCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-1.5 shadow-xs">
              <PauseCircle className="size-3.5 text-amber-700" />
              <span className="text-[11px] font-bold text-amber-900">Bảo lưu:</span>
              <span className="font-mono text-sm font-black text-amber-800">{reservedCount}</span>
            </div>
          )}

          {/* 4. Số học viên đã end khóa */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 shadow-xs">
            <BookCheck className="size-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold text-indigo-800">Đã end khóa:</span>
            <span className="font-mono text-sm font-black text-indigo-700">{endedCount}</span>
          </div>

          {/* Sắp hết khóa */}
          {almostEndCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 shadow-xs">
              <TriangleAlert className="size-3.5 animate-pulse text-rose-500" />
              <span className="text-[11px] font-bold text-rose-700">Sắp hết khóa:</span>
              <span className="font-mono text-sm font-black text-rose-600">{almostEndCount}</span>
            </div>
          )}

          {/* Sắp thi */}
          {upcomingExamCount !== undefined && upcomingExamCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 shadow-xs">
              <GraduationCap className="size-3.5 text-purple-600" />
              <span className="text-[11px] font-bold text-purple-800">Sắp thi:</span>
              <span className="font-mono text-sm font-black text-purple-700">{upcomingExamCount}</span>
            </div>
          )}

          {/* Đã thi */}
          {takenCount !== undefined && takenCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 shadow-xs">
              <GraduationCap className="size-3.5 text-blue-600" />
              <span className="text-[11px] font-bold text-blue-800">Đã thi:</span>
              <span className="font-mono text-sm font-black text-blue-700">{takenCount}</span>
            </div>
          )}

          {/* Aim Rate của GV */}
          {aimRate !== undefined && aimRate !== null && (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 to-emerald-50 px-3.5 py-1.5 shadow-xs">
              <Award className="size-4 text-amber-600" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Aim Rate:
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-sm font-black text-emerald-700">{aimRate}%</span>
                  <span className="text-[10px] font-bold text-slate-500">
                    ({aimAchievedCount}/{scoredCount} đạt aim)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function StudentTracking({
  students,
  teacherName,
  teachers,
  isCenterWide,
  role,
  onSelectStudent,
  onReserveStudent,
  onResumeStudent,
  redirectParams,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'active' | 'almostEnd' | 'upcomingExam' | 'taken' | 'reserved' | 'ended'>('all')
  const [takenSubFilter, setTakenSubFilter] = useState<'all' | 'achieved' | 'missed'>('all')
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingStudentTarget, setEditingStudentTarget] = useState<StudentRecord | null>(null)

  // 1. Filter students by selected teacher if a specific teacher is chosen (optional filter)
  const studentsByTeacher = useMemo(() => {
    if (!teachers || teachers.length === 0 || selectedTeacherId === 'all') {
      return students
    }
    return students.filter((s) => {
      if (s.teacherId && s.teacherId === selectedTeacherId) return true
      const targetTeacher = teachers.find((t) => t.id === selectedTeacherId)
      if (targetTeacher && s.teacherName === targetTeacher.name) return true
      return false
    })
  }, [students, teachers, selectedTeacherId])

  const currentTeacherFilterName = useMemo(() => {
    if (selectedTeacherId === 'all' || !teachers) return null
    return teachers.find((t) => t.id === selectedTeacherId)?.name || null
  }, [selectedTeacherId, teachers])

  const isStudentReserved = (s: StudentRecord) =>
    Boolean(s.isReserved || s.status === 'reserved' || s.reservedFrom)
  const isStudentEnded = (s: StudentRecord) =>
    !isStudentReserved(s) &&
    Boolean(s.isEnded || s.active === false || (s.total > 0 && s.remaining === 0))
  const isStudentActive = (s: StudentRecord) => !isStudentReserved(s) && !isStudentEnded(s)

  const isStudentTaken = (s: StudentRecord) => {
    const st = (s.examStatus || '').trim().toLowerCase()
    return st === 'đã thi' || st === 'taken' || Boolean(s.actualScore && s.actualScore.trim())
  }

  const isStudentUpcomingExam = (s: StudentRecord) => {
    const st = (s.examStatus || '').trim().toLowerCase()
    if (st === 'sắp thi' || st === 'upcoming') return true
    if (st === 'đã thi' || st === 'taken') return false
    const examDate = s.examDate || extractExamDateFromNote(s.studentNote)
    return isUpcomingExam(examDate)
  }

  const totalCount = studentsByTeacher.length
  const reservedCount = studentsByTeacher.filter(isStudentReserved).length
  const endedCount = studentsByTeacher.filter(isStudentEnded).length
  const activeCount = studentsByTeacher.filter(isStudentActive).length
  const almostEndCount = studentsByTeacher.filter((s) => s.almostEnd).length
  const upcomingExamCount = studentsByTeacher.filter(isStudentUpcomingExam).length

  // Aim rate calculation
  const takenStudents = studentsByTeacher.filter(isStudentTaken)
  const takenCount = takenStudents.length
  const scoredStudents = takenStudents.filter((s) => Boolean(s.actualScore && s.actualScore.trim()))
  const aimAchievedStudents = scoredStudents.filter((s) => {
    if (s.aimAchieved !== undefined && s.aimAchieved !== null) return s.aimAchieved
    return evaluateAimAchieved(s.aim, s.actualScore) === true
  })
  const aimAchievedCount = aimAchievedStudents.length
  const scoredCount = scoredStudents.length
  const aimRate = scoredCount > 0 ? Math.round((aimAchievedCount / scoredCount) * 100) : null

  const normalizedQuery = searchQuery.trim().toLowerCase()

  // Filter list with tab filter AND search query
  const filtered = studentsByTeacher.filter((s) => {
    if (filter === 'active' && !isStudentActive(s)) return false
    if (filter === 'reserved' && !isStudentReserved(s)) return false
    if (filter === 'ended' && !isStudentEnded(s)) return false
    if (filter === 'almostEnd' && !s.almostEnd) return false
    if (filter === 'upcomingExam' && !isStudentUpcomingExam(s)) return false
    if (filter === 'taken') {
      if (!isStudentTaken(s)) return false
      if (takenSubFilter === 'achieved') {
        const achieved = s.aimAchieved !== undefined && s.aimAchieved !== null
          ? s.aimAchieved
          : evaluateAimAchieved(s.aim, s.actualScore)
        if (achieved !== true) return false
      } else if (takenSubFilter === 'missed') {
        const achieved = s.aimAchieved !== undefined && s.aimAchieved !== null
          ? s.aimAchieved
          : evaluateAimAchieved(s.aim, s.actualScore)
        if (achieved !== false) return false
      }
    }

    if (normalizedQuery) {
      const matchName = s.studentName?.toLowerCase().includes(normalizedQuery)
      const matchCode = s.studentCode?.toLowerCase().includes(normalizedQuery)
      const matchCourse = s.course?.toLowerCase().includes(normalizedQuery)
      const matchNote = s.studentNote?.toLowerCase().includes(normalizedQuery)
      const matchTeacher = s.teacherName?.toLowerCase().includes(normalizedQuery)
      if (!matchName && !matchCode && !matchCourse && !matchNote && !matchTeacher) return false
    }

    return true
  })

  // Sort: almostEnd first, then active/newest, then reserved, then finished courses with newer courses last, then ended
  const sorted = [...filtered].sort((a, b) => {
    const aEnded = isStudentEnded(a)
    const bEnded = isStudentEnded(b)
    if (aEnded !== bEnded) return aEnded ? 1 : -1

    const aRes = isStudentReserved(a)
    const bRes = isStudentReserved(b)
    if (aRes !== bRes) return aRes ? 1 : -1

    if (a.almostEnd !== b.almostEnd) return a.almostEnd ? -1 : 1
    if (Boolean(a.hasNewerCourse) !== Boolean(b.hasNewerCourse)) return a.hasNewerCourse ? 1 : -1
    return a.remaining - b.remaining
  })

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100">
          <Users className="size-5 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">
            {isCenterWide
              ? 'Chưa có học viên nào trong hệ thống toàn trung tâm.'
              : teacherName
                ? `Chưa có học viên nào được xếp lịch cho giảng viên ${teacherName}.`
                : 'Chưa có học viên nào được xếp lịch cho giảng viên này.'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Học viên sẽ xuất hiện ở đây khi được xếp lịch học.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section aria-label="Quản lý học viên" className="flex flex-col gap-4">
      <SectionHeader
        total={totalCount}
        activeCount={activeCount}
        reservedCount={reservedCount}
        endedCount={endedCount}
        almostEndCount={almostEndCount}
        upcomingExamCount={upcomingExamCount}
        takenCount={takenCount}
        aimAchievedCount={aimAchievedCount}
        scoredCount={scoredCount}
        aimRate={aimRate}
        teacherName={teacherName}
        isCenterWide={isCenterWide}
        currentTeacherFilterName={currentTeacherFilterName}
      />

      {/* Teacher Filter Bar (Optional, for CSKH / Center-Wide) */}
      {teachers && teachers.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
              <Filter className="size-4 text-emerald-700" />
              <span>Lọc theo Giảng Viên:</span>
            </div>

            <div className="relative min-w-[260px]">
              <select
                aria-label="Lọc theo Giảng Viên"
                value={selectedTeacherId}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedTeacherId(val === 'all' ? 'all' : Number(val))
                }}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/80 py-2.5 pl-3.5 pr-9 text-xs font-bold text-slate-800 transition hover:bg-slate-100/70 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
              >
                <option value="all">
                  🌟 Tất cả Giảng Viên (Toàn trung tâm — {students.length} HV)
                </option>
                {teachers.map((t) => {
                  const teacherStudentCount = students.filter(
                    (s) => s.teacherId === t.id || s.teacherName === t.name
                  ).length
                  return (
                    <option key={t.id} value={t.id}>
                      👨‍🏫 {t.name} ({teacherStudentCount} HV)
                    </option>
                  )
                })}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown className="size-4" />
              </div>
            </div>

            {selectedTeacherId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedTeacherId('all')}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-extrabold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition shadow-2xs"
                title="Bỏ lọc theo Giảng Viên, xem toàn bộ học viên trung tâm"
              >
                <X className="size-3.5" />
                <span>Xem tất cả GV ({students.length})</span>
              </button>
            )}
          </div>

          {/* Quick status summary tag */}
          <div className="text-xs">
            {selectedTeacherId === 'all' ? (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 font-bold text-emerald-900 shadow-2xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Toàn trung tâm: <strong>{students.length}</strong> học viên từ{' '}
                  <strong>{teachers.length}</strong> Giảng Viên
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 font-bold text-indigo-900 shadow-2xs">
                <GraduationCap className="size-4 text-indigo-700" />
                <span>
                  Đang lọc: <strong>{studentsByTeacher.length}</strong> học viên của GV{' '}
                  <strong>{currentTeacherFilterName}</strong>
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-100 p-1 font-bold text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1',
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <span>Tất cả</span>
            <span className="text-[11px] opacity-75">({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('active')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1',
              filter === 'active'
                ? 'bg-white text-emerald-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <UserCheck className="size-3.5" />
            <span>Đang học</span>
            <span className="text-[11px] opacity-75">({activeCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('almostEnd')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer',
              filter === 'almostEnd'
                ? 'bg-white text-rose-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <TriangleAlert className="size-3.5 text-rose-500" />
            <span>Sắp end</span>
            <span className="text-[11px] opacity-75">({almostEndCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('upcomingExam')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer',
              filter === 'upcomingExam'
                ? 'bg-white text-purple-800 shadow-xs font-black ring-1 ring-purple-300'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <GraduationCap className="size-3.5 text-purple-600" />
            <span>Sắp thi</span>
            <span className="text-[11px] font-bold text-purple-700">({upcomingExamCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter('taken')
              setTakenSubFilter('all')
            }}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer',
              filter === 'taken'
                ? 'bg-white text-blue-800 shadow-xs font-black ring-1 ring-blue-300'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Award className="size-3.5 text-blue-600" />
            <span>Đã thi</span>
            <span className="text-[11px] font-bold text-blue-700">({takenCount})</span>
          </button>

          {reservedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('reserved')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1',
                filter === 'reserved'
                  ? 'bg-white text-amber-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <PauseCircle className="size-3.5 text-amber-700" />
              <span>Bảo lưu</span>
              <span className="text-[11px] opacity-75">({reservedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilter('ended')}
            className={cn(
              'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1',
              filter === 'ended'
                ? 'bg-white text-indigo-800 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <BookCheck className="size-3.5" />
            <span>Đã end khóa</span>
            <span className="text-[11px] opacity-75">({endedCount})</span>
          </button>
        </div>

        {/* Real-time Student Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Tìm tên HV, mã HV, khóa học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-8 rounded-2xl text-xs bg-white border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 shadow-2xs placeholder:text-slate-400 placeholder:font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {filter === 'taken' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 p-2 text-xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Award className="size-3.5 text-indigo-600" />
            Phân loại kết quả thi:
          </span>
          <button
            type="button"
            onClick={() => setTakenSubFilter('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition',
              takenSubFilter === 'all'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            Tất cả đã thi ({takenCount})
          </button>
          <button
            type="button"
            onClick={() => setTakenSubFilter('achieved')}
            className={cn(
              'px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition flex items-center gap-1',
              takenSubFilter === 'achieved'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            )}
          >
            <span>🎉 Đạt aim</span>
            <span>({aimAchievedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setTakenSubFilter('missed')}
            className={cn(
              'px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition flex items-center gap-1',
              takenSubFilter === 'missed'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            )}
          >
            <span>Chưa đạt aim</span>
            <span>({scoredCount - aimAchievedCount})</span>
          </button>
        </div>
      )}

      {searchQuery && (
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-emerald-50/60 border border-emerald-200/80 px-3.5 py-2 rounded-2xl">
          <span>
            🔍 Kết quả tìm kiếm: <strong>{sorted.length}</strong> học viên khớp với "<strong>{searchQuery}</strong>"
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-emerald-700 hover:underline"
          >
            Xóa tìm kiếm
          </button>
        </div>
      )}

      {/* Students Grid */}
      {sorted.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs font-bold text-slate-500 flex flex-col items-center gap-3">
          <p>
            {searchQuery
              ? `Không tìm thấy học viên nào khớp với từ khóa "${searchQuery}".`
              : selectedTeacherId !== 'all'
                ? `Giảng viên ${currentTeacherFilterName} hiện chưa có học viên nào trong mục này.`
                : 'Không có học viên nào trong mục này.'}
          </p>
          {selectedTeacherId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedTeacherId('all')}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 transition"
            >
              <RotateCcw className="size-3.5" />
              <span>Xem tất cả học viên toàn trung tâm ({students.length})</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((student) => (
            <StudentCard
              key={student.enrollmentId ?? `${student.studentCode}-${student.course}`}
              student={student}
              role={role}
              onSelect={() => onSelectStudent?.(student)}
              onReserve={() => onReserveStudent?.(student)}
              onResume={() => onResumeStudent?.(student)}
              onEditStudent={(s) => setEditingStudentTarget(s)}
              redirectParams={redirectParams}
            />
          ))}
        </div>
      )}

      {editingStudentTarget && (
        <EditStudentDialog
          open={editingStudentTarget !== null}
          onOpenChange={(open) => {
            if (!open) setEditingStudentTarget(null)
          }}
          student={editingStudentTarget}
          redirectParams={
            redirectParams ?? {
              role: role ?? 'sales',
              person_id: 0,
              teacher_id: 'all',
              month_key: '',
              week_name: '',
            }
          }
        />
      )}
    </section>
  )
}

