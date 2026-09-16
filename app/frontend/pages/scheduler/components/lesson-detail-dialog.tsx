import { router } from '@inertiajs/react'
import {
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  GraduationCap,
  Loader2,
  Pencil,
  Save,
  Target,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { lessonSessionPath } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type { LessonSession, SchedulerMutationRedirectParams, Enrollment } from '../types'
import { QuickTagChips, TagBadges } from './note-tags'
import {
  PreviousSessionNoteCard,
  StructuredNoteDisplay,
  StructuredNoteEditor,
  parseStructuredNote,
  serializeStructuredNote,
} from './structured-lesson-note'

const IELTS_BANDS = ['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0+']
const PAYMENT_STATUSES = ['Đã đóng Full', 'Đã đóng Đợt 1', 'Đã đóng Đợt 2', 'Chưa đóng']
const COURSES = [
  'Speaking Foundation',
  'Speaking Intermediate',
  'Speaking Advanced',
  'Writing Foundation',
  'Writing Intermediate',
  'Writing Advanced',
  'SF1',
  'SF2',
  'SF3',
  'S1',
  'S1 - 6 buổi',
  'S2',
  'S3',
  'W1',
  'W2',
  'W3',
]
const SKILLS = ['Speaking', 'Writing']

function parseTuitionNote(raw: string | null | undefined): { reminderDays: number[]; extraNote: string } {
  if (!raw) return { reminderDays: [], extraNote: '' }
  const match = raw.match(/^\[Hẹn đóng:\s*([^\]]+)\]\s*(.*)$/i)
  if (!match) return { reminderDays: [], extraNote: raw }
  const dayNums = (match[1].match(/\d+/g) || []).map(Number).filter((n) => n > 0)
  return { reminderDays: dayNums, extraNote: match[2] || '' }
}

function formatTuitionNote(reminderDays: number[], extraNote: string): string {
  const clean = extraNote.trim()
  if (reminderDays.length === 0) return clean
  const sorted = [...reminderDays].sort((a, b) => a - b)
  const prefix = `[Hẹn đóng: Day ${sorted.join(', Day ')}]`
  return clean ? `${prefix} ${clean}` : prefix
}

export function LessonDetailDialog({
  role,
  lesson,
  open,
  onOpenChange,
  redirectParams,
  onReschedule,
  onEditEnrollment,
  onViewStudentSessions,
}: {
  role: 'teacher' | 'sales' | 'cs' | 'admin'
  lesson: LessonSession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectParams: SchedulerMutationRedirectParams
  onReschedule: (lesson: LessonSession) => void
  onEditEnrollment?: (enrollment: Enrollment) => void
  onViewStudentSessions?: (studentCode: string) => void
}): ReactElement {
  const [isEditing, setIsEditing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Edit form states
  const [studentName, setStudentName] = useState('')
  const [studentCode, setStudentCode] = useState('')
  const [dayNumber, setDayNumber] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseSkill, setCourseSkill] = useState('')
  const [totalSessions, setTotalSessions] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentReminderDays, setPaymentReminderDays] = useState<number[]>([])
  const [tuitionNoteExtra, setTuitionNoteExtra] = useState('')
  const [baseline, setBaseline] = useState('')
  const [aim, setAim] = useState('')
  const [examDate, setExamDate] = useState('')
  const [studentNote, setStudentNote] = useState('')
  const [lessonNotes, setLessonNotes] = useState('')
  const [lessonStatus, setLessonStatus] = useState('')
  const [csStatus, setCsStatus] = useState('')
  const [csForm, setCsForm] = useState('')
  const [deleteEnrollmentConfirm, setDeleteEnrollmentConfirm] = useState(false)
  const [currentLessonStatus, setCurrentLessonStatus] = useState(lesson?.lessonStatus || 'scheduled')
  const [currentCsStatus, setCurrentCsStatus] = useState(lesson?.csStatus || 'upcoming')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isSavingNote, setIsSavingNote] = useState(false)

  const previousSession = useMemo(() => {
    if (!lesson?.enrollment?.sessions || lesson.enrollment.sessions.length === 0) {
      return null
    }

    const sessions = lesson.enrollment.sessions

    const getDayNum = (label?: string) => {
      if (!label) return null
      const m = label.match(/\d+/)
      return m ? parseInt(m[0], 10) : null
    }

    const currentDayNum = getDayNum(lesson.dayLabel)

    // Strategy 1: Match by Day number = currentDayNum - 1 (e.g. Day 6 -> Day 5)
    if (currentDayNum && currentDayNum > 1) {
      const prevDaySession = sessions.find((s) => {
        const sLabel = s.dayLabel || (s as any).day_label
        return getDayNum(sLabel) === currentDayNum - 1
      })
      if (prevDaySession) return prevDaySession
    }

    // Strategy 2: Find index of current lesson session in sessions
    const currentIndex = sessions.findIndex((s) => s.id === lesson.id)
    if (currentIndex > 0) {
      return sessions[currentIndex - 1]
    }

    // Strategy 3: Match by date earlier than current scheduledOn
    const currentSch = lesson.scheduledOn || (lesson as any).scheduled_on
    if (currentSch) {
      const earlierSessions = sessions.filter((s) => {
        const sSch = s.scheduledOn || (s as any).scheduled_on
        return sSch && sSch < currentSch
      })
      if (earlierSessions.length > 0) {
        return earlierSessions[earlierSessions.length - 1]
      }
    }

    // If current is Day 1 or index 0
    if (currentDayNum === 1 || currentIndex === 0) {
      return null
    }

    return null
  }, [lesson])

  useEffect(() => {
    if (lesson) {
      setIsEditing(false)
      setDeleteConfirm(false)
      setDeleteEnrollmentConfirm(false)
      setErrorMessage(null)
      setIsUpdatingStatus(false)
      setIsSavingNote(false)

      // Parse day number from label like 'Day 4/13' or 'Day 4'
      const match = lesson.dayLabel.match(/\d+/)
      setDayNumber(match ? match[0] : '1')

      let cName = lesson.enrollment.courseName
      let cSkill = 'Speaking'
      if (cName.includes(' - ')) {
        const parts = cName.split(' - ')
        cName = parts[0]
        cSkill = parts.slice(1).join(' - ')
      }

      const { reminderDays, extraNote } = parseTuitionNote(lesson.enrollment.tuitionNote)

      setCourseName(cName)
      setCourseSkill(cSkill || 'Speaking')
      setTotalSessions(lesson.enrollment.totalSessions.toString())
      setPaymentStatus(lesson.enrollment.paymentStatus || 'Đã đóng Full')
      setPaymentReminderDays(reminderDays)
      setTuitionNoteExtra(extraNote)
      setStudentName(lesson.enrollment.student?.name || '')
      setStudentCode(lesson.enrollment.student?.code || '')
      setBaseline(lesson.enrollment.student.baseline || '')
      setAim(lesson.enrollment.student.aim || '')
      setExamDate(lesson.enrollment.student.examDate || '')
      setStudentNote(lesson.enrollment.student.studentNote || '')
      setLessonNotes(lesson.lessonNotes || '')
      setLessonStatus(lesson.lessonStatus || '')
      setCsStatus(lesson.csStatus || '')
      setCsForm(lesson.csForm || '')
      setCurrentLessonStatus(lesson.lessonStatus || 'scheduled')
      setCurrentCsStatus(lesson.csStatus || 'upcoming')
    }
  }, [lesson])

  if (!lesson) {
    return <Dialog open={open} onOpenChange={onOpenChange} />
  }

  const canEditAll = role === 'sales' || role === 'cs' || role === 'admin'
  const canDeleteLesson = role === 'sales' || role === 'cs' || role === 'admin'
  const canWriteTeacherNotes = role === 'teacher'
  const totalSessionsNum = Number(totalSessions) || lesson.enrollment.totalSessions || 1

  const handleSaveStructuredNote = (serializedNote: string) => {
    setIsSavingNote(true)
    router.patch(
      lessonSessionPath(lesson.id),
      {
        lesson_session: {
          lesson_notes: serializedNote,
        },
        ...redirectParams,
      },
      {
        onSuccess: () => {
          setIsSavingNote(false)
          setLessonNotes(serializedNote)
          toast.success('Đã lưu ghi chú buổi học thành công!')
        },
        onError: () => {
          setIsSavingNote(false)
          toast.error('Có lỗi xảy ra khi lưu ghi chú buổi học.')
        },
      }
    )
  }

  const handleSaveAll = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    const fullTuitionNote = formatTuitionNote(paymentReminderDays, tuitionNoteExtra)

    router.patch(
      lessonSessionPath(lesson.id),
      {
        lesson_session: {
          day_number: dayNumber,
          lesson_notes: lessonNotes,
          lesson_status: lessonStatus,
          cs_status: csStatus,
          cs_form: csForm,
        },
        enrollment: {
          course_name: courseSkill ? `${courseName} - ${courseSkill}` : courseName,
          total_sessions: Number(totalSessions),
          payment_status: paymentStatus,
          tuition_note: fullTuitionNote,
        },
        student: {
          name: studentName.trim(),
          code: studentCode.trim(),
          baseline: baseline,
          aim: aim,
          exam_date: examDate,
          student_note: studentNote,
        },
        ...redirectParams,
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          onOpenChange(false)
        },
        onError: (errors) => setErrorMessage(firstError(errors)),
      }
    )
  }

  const handleUpdateStatus = (nextStatus: string) => {
    if (!lesson) return
    setIsUpdatingStatus(true)
    const nextLessonStatus =
      nextStatus === 'completed' ? 'completed' : nextStatus === 'absent' ? 'absent' : 'scheduled'
    const nextCsStatus =
      nextStatus === 'completed' ? 'completed' : nextStatus === 'absent' ? 'absent' : 'upcoming'

    // Optimistic update
    if (role === 'teacher') {
      setCurrentLessonStatus(nextLessonStatus)
    } else if (role === 'cs') {
      setCurrentCsStatus(nextCsStatus)
    } else {
      setCurrentLessonStatus(nextLessonStatus)
      setCurrentCsStatus(nextCsStatus)
    }

    const patchPayload =
      role === 'cs'
        ? { cs_status: nextCsStatus }
        : role === 'teacher'
          ? { lesson_status: nextLessonStatus }
          : {
              cs_status: nextCsStatus,
              lesson_status: nextLessonStatus,
            }

    router.patch(
      lessonSessionPath(lesson.id),
      {
        lesson_session: patchPayload,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          setIsUpdatingStatus(false)
          toast.success(
            role === 'cs'
              ? nextStatus === 'completed'
                ? '✅ CS: Đã xác nhận hoàn thành ca học!'
                : 'CS: Đã chuyển ca học về chưa duyệt.'
              : role === 'teacher'
                ? nextStatus === 'completed'
                  ? '✅ GV: Đã điểm danh hoàn thành ca dạy!'
                  : 'GV: Đã chuyển ca học về chưa dạy.'
                : '✅ Đã cập nhật trạng thái ca học thành công!'
          )
        },
        onError: () => {
          setIsUpdatingStatus(false)
          setCurrentLessonStatus(lesson.lessonStatus || 'scheduled')
          setCurrentCsStatus(lesson.csStatus || 'upcoming')
          toast.error('Có lỗi xảy ra khi cập nhật trạng thái ca học.')
        },
      }
    )
  }

  const isGvDone = currentLessonStatus === 'completed'
  const isGvAbsent = currentLessonStatus === 'absent'
  const isCsDone = currentCsStatus === 'completed'
  const isCsAbsent = currentCsStatus === 'absent'
  const isMatched = isGvDone && isCsDone

  const effectiveStatus =
    role === 'cs'
      ? (currentCsStatus || 'upcoming')
      : role === 'teacher'
        ? (currentLessonStatus === 'completed' ? 'completed' : currentLessonStatus === 'absent' ? 'absent' : 'upcoming')
        : isMatched
          ? 'completed'
          : (currentCsStatus === 'completed' || currentLessonStatus === 'completed' ? 'completed' : 'upcoming')
  const isCompleted = effectiveStatus === 'completed'
  const isAbsent = effectiveStatus === 'absent'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl md:max-w-3xl">
        <DialogHeader className="flex flex-row items-start justify-between pr-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              {isEditing ? '✏️ Chỉnh Sửa Thông Tin' : 'Chi Tiết Lịch Học & Học Phí'}
            </p>
            <DialogTitle className="flex items-center gap-2 mt-1 flex-wrap">
              <span>
                {lesson.enrollment.student.name} - {lesson.enrollment.student.code}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200">
                {lesson.enrollment.courseName}
              </span>
              {canEditAll && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center justify-center p-1.5 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors shadow-xs"
                  title="Chỉnh sửa thông tin học viên & khóa học"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
            </DialogTitle>
          </div>
          {canEditAll && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-4 text-amber-700" /> Sửa Thông Tin
            </Button>
          )}
        </DialogHeader>

        {errorMessage && (
          <p role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 rounded-xl">
            {errorMessage}
          </p>
        )}

        {isEditing ? (
          <form className="space-y-4 text-xs" onSubmit={handleSaveAll}>
            {/* Thông tin học viên (Tên & Mã HV) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
              <span className="font-black uppercase text-slate-900">👤 Thông Tin Học Viên</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1 font-semibold text-slate-700">
                  Tên học viên *
                  <Input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    placeholder="VD: Nguyễn Văn A"
                    className="bg-white font-bold h-9"
                  />
                </div>
                <div className="grid gap-1 font-semibold text-slate-700">
                  Mã học viên *
                  <Input
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value)}
                    required
                    placeholder="VD: HV123"
                    className="bg-white font-mono font-bold h-9"
                  />
                </div>
              </div>
            </div>

            {/* Lịch Học & Thứ Tự Buổi */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black uppercase text-emerald-900">📅 Lịch Học & Thứ Tự Buổi</span>
                <span className="text-[11px] font-bold text-slate-500">
                  {lesson.scheduledOn} ({lesson.startTime} - {lesson.endTime})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1 font-semibold text-slate-700">
                  Buổi số (Day number) *
                  <Input
                    type="number"
                    min="1"
                    value={dayNumber}
                    onChange={(e) => setDayNumber(e.target.value)}
                    required
                    className="bg-white font-bold h-9"
                  />
                  <span className="text-[10px] text-slate-500 italic">
                    💡 Sửa số này sẽ auto chạy lại thứ tự các buổi sau.
                  </span>
                </div>
                <div className="grid gap-1 font-semibold text-slate-700">
                  Tổng số buổi khóa *
                  <Input
                    type="number"
                    min="1"
                    value={totalSessions}
                    onChange={(e) => setTotalSessions(e.target.value)}
                    required
                    className="bg-white font-bold h-9"
                  />
                </div>
              </div>
            </div>

            {/* Khóa học & Skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1 font-semibold text-slate-700">
                Khóa học & Skills *
                <div className="flex gap-2">
                  <Select value={courseName} onValueChange={setCourseName} required>
                    <SelectTrigger aria-label="Khóa học" className="bg-white font-bold h-9">
                      <SelectValue placeholder="Khóa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={courseSkill} onValueChange={setCourseSkill}>
                    <SelectTrigger aria-label="Skills" className="bg-white font-bold h-9">
                      <SelectValue placeholder="Skills..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILLS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Trạng thái học phí dropdown */}
              <div className="grid gap-1 font-semibold text-slate-700">
                Trạng thái học phí
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger aria-label="Trạng thái học phí" className="bg-white font-bold h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hẹn đóng & Ghi chú học phí */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="grid gap-1 font-semibold text-slate-700">
                <span className="truncate">Hẹn đóng (Ngày/Day)</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 w-full justify-start rounded-md border border-input bg-white px-3 py-2 text-left text-xs font-semibold shadow-sm"
                    >
                      {paymentReminderDays.length > 0
                        ? `Đã chọn ${paymentReminderDays.length} ngày (Day ${paymentReminderDays.sort((a, b) => a - b).join(', ')})`
                        : 'Chọn ngày hẹn...'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-60 w-56 overflow-y-auto">
                    {Array.from({ length: totalSessionsNum }, (_, i) => i + 1).map((dayNum) => {
                      const checked = paymentReminderDays.includes(dayNum)
                      return (
                        <DropdownMenuCheckboxItem
                          key={dayNum}
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c
                              ? [...paymentReminderDays, dayNum]
                              : paymentReminderDays.filter((d) => d !== dayNum)
                            setPaymentReminderDays(next)
                          }}
                        >
                          Day {dayNum}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid gap-1 font-semibold text-slate-700">
                Ghi chú thêm học phí
                <Input
                  value={tuitionNoteExtra}
                  onChange={(e) => setTuitionNoteExtra(e.target.value)}
                  placeholder="VD: Bổ sung 3tr..."
                  className="bg-white h-9"
                />
              </div>
            </div>

            {/* Baseline, Aim, Exam date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Baseline */}
              <div className="grid gap-1 font-semibold text-slate-700">
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-3.5 text-slate-500" /> Đầu vào (Baseline)
                </span>
                <div className="flex gap-1">
                  <Select
                    value={IELTS_BANDS.includes(baseline) ? baseline : ''}
                    onValueChange={setBaseline}
                  >
                    <SelectTrigger aria-label="Band đầu vào" className="bg-white font-bold h-9 w-24">
                      <SelectValue placeholder="Band..." />
                    </SelectTrigger>
                    <SelectContent>
                      {IELTS_BANDS.map((band) => (
                        <SelectItem key={band} value={band}>Band {band}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                    placeholder="hoặc nhập..."
                    className="bg-white h-9 flex-1 text-xs"
                  />
                </div>
              </div>

              {/* Aim */}
              <div className="grid gap-1 font-semibold text-slate-700">
                <span className="flex items-center gap-1">
                  <Target className="size-3.5 text-emerald-600" /> Aim (Target)
                </span>
                <div className="flex gap-1">
                  <Select
                    value={IELTS_BANDS.includes(aim) ? aim : ''}
                    onValueChange={setAim}
                  >
                    <SelectTrigger aria-label="Band mục tiêu" className="bg-white font-bold h-9 w-24">
                      <SelectValue placeholder="Band..." />
                    </SelectTrigger>
                    <SelectContent>
                      {IELTS_BANDS.map((band) => (
                        <SelectItem key={band} value={band}>Band {band}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={aim}
                    onChange={(e) => setAim(e.target.value)}
                    placeholder="hoặc nhập..."
                    className="bg-white h-9 flex-1 text-xs font-bold text-emerald-800"
                  />
                </div>
              </div>

              {/* Exam Date */}
              <div className="grid gap-1 font-semibold text-slate-700">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-slate-500" /> Ngày thi (Dự kiến)
                </span>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="bg-white h-9 font-semibold"
                />
              </div>
            </div>

            {/* Note từ Sales */}
            <div className="grid gap-1.5 font-semibold text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span>📌 Note từ Sales (Cho GV xem)</span>
                <TagBadges text={studentNote} />
              </div>
              {role !== 'teacher' && (
                <QuickTagChips
                  currentNote={studentNote}
                  onToggleTag={setStudentNote}
                  sessionTitle={`${lesson?.dayLabel || 'Buổi học'} - ${lesson?.enrollment?.student?.name || ''}`}
                />
              )}
              <Textarea
                rows={2}
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="Ghi chú cho giáo viên..."
                className="bg-white text-xs"
              />
            </div>

            {/* Ghi chú buổi học */}
            <div className="grid gap-1.5 font-semibold text-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span>Ghi chú buổi học (Hiện huy hiệu 📌 trên lịch)</span>
                <TagBadges text={lessonNotes} />
              </div>
              {role !== 'teacher' && (
                <QuickTagChips
                  currentNote={lessonNotes}
                  onToggleTag={setLessonNotes}
                  sessionTitle={`${lesson?.dayLabel || 'Buổi học'} - ${lesson?.enrollment?.student?.name || ''}`}
                />
              )}
              <Textarea
                rows={2}
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                placeholder="Nhập ghi chú buổi học..."
                className="bg-white text-xs"
              />
            </div>

            {/* CS Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CsSelect
                label="Trạng thái CS"
                value={csStatus}
                onChange={setCsStatus}
                emptyLabel="-- Trạng thái --"
                options={[
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
              <div className="grid gap-1 font-semibold text-slate-700">
                Trạng thái lớp
                <Input
                  value={lessonStatus}
                  onChange={(e) => setLessonStatus(e.target.value)}
                  placeholder="VD: Đang học, Vắng..."
                  className="bg-white h-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="h-9">
                <X data-icon className="size-4" /> Hủy
              </Button>
              <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-9 px-4">
                <Save data-icon className="size-4" /> Lưu Thay Đổi
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-500">
                📅 {lesson.scheduledOn} • 🕒 {lesson.startTime} – {lesson.endTime} ({lesson.dayLabel})
              </p>
              <p className="text-xs font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1.5">
                <span>👨‍🏫</span>
                <span>GV phụ trách: {lesson.teacherName}</span>
              </p>
            </div>

            {/* Khóa đang học & Tình trạng buổi học */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0 shadow-2xs">
                    <BookOpen className="size-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block leading-none mb-1">
                      Khóa đang học
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {lesson.enrollment.courseName}
                    </span>
                  </div>
                </div>

                {/* Status indicators: GV & CS separated */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={cn(
                      'text-[10px] font-extrabold px-2 py-0.5 rounded-lg border',
                      isGvDone
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : isGvAbsent
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}
                  >
                    GV: {isGvDone ? 'Đã dạy ✅' : isGvAbsent ? 'Vắng ❌' : 'Chưa dạy ⏳'}
                  </span>

                  <span
                    className={cn(
                      'text-[10px] font-extrabold px-2 py-0.5 rounded-lg border',
                      isCsDone
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : isCsAbsent
                          ? 'bg-rose-100 text-rose-900 border-rose-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}
                  >
                    CS: {isCsDone ? 'Đã duyệt ✅' : isCsAbsent ? 'Vắng ❌' : 'Chờ duyệt ⏳'}
                  </span>

                  {isMatched && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-700 text-white shadow-xs">
                      🎉 Khớp lệnh
                    </span>
                  )}
                </div>
              </div>

              {/* Attendance toggle dropdown */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <span>📋</span>
                  <span>
                    {role === 'teacher'
                      ? 'Điểm danh ca dạy:'
                      : role === 'cs'
                        ? 'Xác nhận buổi học (CS):'
                        : 'Tình trạng buổi học:'}
                  </span>
                </span>

                <Select
                  value={effectiveStatus}
                  disabled={isUpdatingStatus}
                  onValueChange={handleUpdateStatus}
                >
                  <SelectTrigger
                    aria-label="Cập nhật trạng thái buổi học"
                    className={cn(
                      'h-8 px-3 rounded-xl text-xs font-black border transition shadow-2xs cursor-pointer gap-1.5 w-auto min-w-[155px]',
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                        : isAbsent
                          ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {isUpdatingStatus ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin text-slate-600 shrink-0" />
                          <span>Đang lưu...</span>
                        </>
                      ) : isCompleted ? (
                        <>
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                          <span>{role === 'cs' ? 'CS: Đã duyệt' : role === 'teacher' ? 'GV: Đã dạy' : 'Đã hoàn thành'}</span>
                        </>
                      ) : isAbsent ? (
                        <>
                          <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                          <span>Vắng mặt</span>
                        </>
                      ) : (
                        <>
                          <Clock className="size-3.5 text-blue-600 shrink-0" />
                          <span>{role === 'cs' ? 'CS: Chờ duyệt' : role === 'teacher' ? 'GV: Chưa dạy' : 'Chưa diễn ra'}</span>
                        </>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    align="end"
                    className="rounded-2xl text-xs z-50 bg-white shadow-xl border border-slate-200 min-w-[190px] p-1.5"
                  >
                    <SelectItem
                      value="completed"
                      className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-emerald-800 focus:bg-emerald-50"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                        <span>{role === 'cs' ? 'CS: Xác nhận Đã học' : role === 'teacher' ? 'GV: Điểm danh Đã dạy' : 'Đã hoàn thành'}</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="upcoming"
                      className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-blue-800 focus:bg-blue-50"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-blue-600 shrink-0" />
                        <span>{role === 'cs' ? 'CS: Chưa duyệt' : role === 'teacher' ? 'GV: Chưa dạy' : 'Chưa diễn ra'}</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="absent"
                      className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-rose-800 focus:bg-rose-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                        <span>Vắng mặt (Absent)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-extrabold uppercase tracking-wide text-slate-800">
                  💰 Tình trạng học phí
                </h4>
                <span
                  className={`rounded-xl border px-2.5 py-1 text-[10px] font-black ${paymentStatusClass(
                    lesson.enrollment.paymentStatus
                  )}`}
                >
                  {lesson.enrollment.paymentStatus || 'Chưa cập nhật'}
                </span>
              </div>

              {lesson.enrollment.tuitionNote && (
                <p className="text-[11px] italic text-slate-600">
                  Note học phí: {lesson.enrollment.tuitionNote}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-2 text-slate-700">
                <CompactMetric label="Đầu vào:" value={lesson.enrollment.student.baseline || 'N/A'} />
                <CompactMetric label="Aim:" value={lesson.enrollment.student.aim || 'N/A'} highlight />
                <CompactMetric label="Ngày thi:" value={lesson.enrollment.student.examDate || 'N/A'} />
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <span className="block text-[10px] font-black uppercase text-amber-900">
                    📌 Note từ Sales (Cho GV xem):
                  </span>
                  <TagBadges text={lesson.enrollment.student.studentNote} />
                </div>
                <p className="font-bold italic text-slate-900">
                  {lesson.enrollment.student.studentNote || 'Không có ghi chú thêm từ Sales.'}
                </p>
              </div>


            </div>

            {lesson.enrollment.meetLink && (
              <div className="space-y-1">
                <Button
                  asChild
                  className="h-auto w-full rounded-2xl bg-emerald-700 px-4 py-3.5 text-sm font-bold shadow-md hover:bg-emerald-800"
                >
                  <a href={lesson.enrollment.meetLink} target="_blank" rel="noreferrer">
                    <Video data-icon className="size-5" />
                    <span>Join with Google Meet</span>
                  </a>
                </Button>
                <p className="truncate text-center font-mono text-[11px] text-slate-400">
                  {lesson.enrollment.meetLink}
                </p>
              </div>
            )}

            {canWriteTeacherNotes && (
              <StructuredNoteEditor
                initialNote={lessonNotes}
                role={role}
                onSave={handleSaveStructuredNote}
                isSaving={isSavingNote}
                currentDayLabel={lesson.dayLabel}
                previousSession={previousSession}
              />
            )}

            {!canWriteTeacherNotes && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <PreviousSessionNoteCard
                  previousSession={previousSession}
                  currentLessonDayLabel={lesson.dayLabel}
                  className="h-full"
                />
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2 h-full shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-emerald-200/80">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                      <span>📝</span>
                      <span>Ghi chú buổi này ({lesson.dayLabel})</span>
                    </span>
                    {lesson.lessonNotes && <TagBadges text={lesson.lessonNotes} />}
                  </div>
                  {lesson.lessonNotes ? (
                    <StructuredNoteDisplay note={lesson.lessonNotes} />
                  ) : (
                    <div className="p-4 rounded-xl bg-white/70 border border-dashed border-emerald-200 text-center">
                      <p className="text-xs font-bold text-slate-500">Chưa có ghi chú cho buổi này.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Giáo viên sẽ cập nhật sau ca dạy.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {canEditAll && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 font-bold text-slate-700"
                    onClick={() => onReschedule(lesson)}
                  >
                    <CalendarClock className="size-4" /> Dời lịch
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-bold text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="size-4 text-amber-700" /> Sửa thông tin
                  </Button>
                  {onViewStudentSessions && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-bold text-emerald-800 bg-emerald-50 border-emerald-300 hover:bg-emerald-100"
                      onClick={() => {
                        onOpenChange(false)
                        onViewStudentSessions(lesson.enrollment.student.code)
                      }}
                    >
                      📋 Tất cả buổi học của HV
                    </Button>
                  )}
                </div>

                {canDeleteLesson && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      {!deleteConfirm ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeleteConfirm(true)
                            setDeleteEnrollmentConfirm(false)
                          }}
                          className="gap-1 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs"
                        >
                          <Trash2 className="size-3.5" /> Xóa 1 buổi này
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs">
                          <span className="font-bold text-rose-800">Xóa buổi này?</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(false)}
                            className="h-7 px-2 text-xs"
                          >
                            Hủy
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              router.delete(lessonSessionPath(lesson.id), {
                                data: redirectParams,
                                onSuccess: () => onOpenChange(false),
                              })
                            }}
                            className="h-7 rounded-lg bg-rose-600 px-2.5 text-xs font-bold text-white hover:bg-rose-700"
                          >
                            Xóa buổi
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      {!deleteEnrollmentConfirm ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setDeleteEnrollmentConfirm(true)
                            setDeleteConfirm(false)
                          }}
                          className="gap-1 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-300 text-rose-700 font-bold text-xs transition"
                        >
                          <Trash2 className="size-3.5" /> Xóa toàn bộ khóa ({lesson.enrollment.totalSessions} buổi)
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl border border-rose-400 bg-rose-100 p-2 text-xs">
                          <span className="font-bold text-rose-900">
                            Xóa hết {lesson.enrollment.totalSessions} buổi của {lesson.enrollment.student.name}?
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteEnrollmentConfirm(false)}
                            className="h-7 px-2 text-xs"
                          >
                            Hủy
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              router.delete(`/enrollments/${lesson.enrollment.id}`, {
                                data: redirectParams,
                                onSuccess: () => onOpenChange(false),
                              })
                            }}
                            className="h-7 rounded-lg bg-rose-700 px-2.5 text-xs font-bold text-white hover:bg-rose-800"
                          >
                            Xác nhận xóa hết
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function firstError(errors: Record<string, string[]>) {
  return (
    Object.values(errors)
      .flat()
      .find((message) => message.length > 0) ?? 'Không thể lưu thay đổi.'
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

function CompactMetric({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <span className="block text-[10px] font-bold text-slate-400">{label}</span>
      <strong className={highlight ? 'text-emerald-700' : undefined}>{value}</strong>
    </div>
  )
}

function paymentStatusClass(paymentStatus: string) {
  if (paymentStatus === 'Đã đóng Full') {
    return 'border-emerald-300 bg-emerald-100 text-emerald-800'
  }

  if (paymentStatus === 'Chưa đóng') {
    return 'border-rose-300 bg-rose-100 text-rose-800'
  }

  return 'border-amber-300 bg-amber-100 text-amber-800'
}

function CsSelect({
  label,
  value,
  onChange,
  emptyLabel,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  emptyLabel: string
  options: Array<{ value: string; label: string }>
}) {
  const emptyValue = `${label}-empty`
  const selectedValue = value || emptyValue

  return (
    <div className="grid gap-1 text-sm font-semibold">
      {label}
      <Select
        value={selectedValue}
        onValueChange={(nextValue) => onChange(nextValue === emptyValue ? '' : nextValue)}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
