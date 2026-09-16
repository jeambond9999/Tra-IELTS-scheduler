import { router } from '@inertiajs/react'
import {
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit,
  GraduationCap,
  PauseCircle,
  Play,
  RotateCcw,
  Save,
  Square,
  StickyNote,
  Tag,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { type ReactElement, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { lessonSessionPath, rescheduleLessonSessionPath } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type {
  Person,
  PersonRole,
  SchedulerMutationRedirectParams,
  SchedulerProps,
  StudentSessionItem,
} from '../types'
import { QuickTagChips, TagBadges, toggleNoteTag } from './note-tags'
import { TakeNotesDeadlineDialog } from './take-notes-deadline-dialog'
import { StructuredNoteDisplay, StructuredNoteEditor } from './structured-lesson-note'
import { evaluateAimAchieved, isUpcomingExam, getExamMonthOptions, normalizeExamMonthVal, extractExamDateFromNote } from './student-tracking'
import { RescheduleFrequencyDialog } from './reschedule-frequency-dialog'
import { EditStudentDialog } from './edit-student-dialog'

type StudentRecord = SchedulerProps['studentTracking'][number]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentRecord | null
  redirectParams: SchedulerMutationRedirectParams
  role: PersonRole
  allStudents?: StudentRecord[]
  onSelectStudent?: (student: StudentRecord) => void
  onReserveStudent?: (student: StudentRecord) => void
  onResumeStudent?: (student: StudentRecord) => void
  teachers?: Person[]
  timeIntervals?: string[]
}

export function StudentSessionsDialog({
  open,
  onOpenChange,
  student: propStudent,
  redirectParams,
  role,
  allStudents = [],
  onSelectStudent,
  onReserveStudent,
  onResumeStudent,
  teachers = [],
  timeIntervals = [],
}: Props): ReactElement {
  const student = useMemo(() => {
    if (!propStudent) return null
    return (
      allStudents.find(
        (s) =>
          (propStudent.enrollmentId && s.enrollmentId === propStudent.enrollmentId) ||
          s.studentCode === propStudent.studentCode
      ) || propStudent
    )
  }, [allStudents, propStudent])

  const isTeacher = role === 'teacher'

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [notesState, setNotesState] = useState<Record<number, string>>({})
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null)
  const [isBatchUpdating, setIsBatchUpdating] = useState(false)
  const [batchTakeNotesOpen, setBatchTakeNotesOpen] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [deleteEnrollmentConfirm, setDeleteEnrollmentConfirm] = useState(false)
  const [editStudentOpen, setEditStudentOpen] = useState(false)
  const [editingDayId, setEditingDayId] = useState<number | null>(null)
  const [editingDayValue, setEditingDayValue] = useState('')
  const [editingCascade, setEditingCascade] = useState(true)
  const [isRecalculatingDays, setIsRecalculatingDays] = useState(false)
  const [savingDayId, setSavingDayId] = useState<number | null>(null)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null)
  const [editingScheduleDate, setEditingScheduleDate] = useState('')
  const [editingScheduleTime, setEditingScheduleTime] = useState('')
  const [editingScheduleTeacherId, setEditingScheduleTeacherId] = useState<number | null>(null)
  const [editingScheduleShiftAll, setEditingScheduleShiftAll] = useState(false)
  const [inlineScheduleError, setInlineScheduleError] = useState<string | null>(null)
  const [savingScheduleId, setSavingScheduleId] = useState<number | null>(null)
  const [expandedEditorSessionId, setExpandedEditorSessionId] = useState<number | null>(null)

  const [editingExamDate, setEditingExamDate] = useState(false)
  const [examDateValue, setExamDateValue] = useState(student?.examDate || '')
  const [savingExamDate, setSavingExamDate] = useState(false)

  const [editingBaselineAim, setEditingBaselineAim] = useState(false)
  const [baselineVal, setBaselineVal] = useState(student?.baseline || '')
  const [aimVal, setAimVal] = useState(student?.aim || '')
  const [savingBaselineAim, setSavingBaselineAim] = useState(false)

  const [updatingExamStatus, setUpdatingExamStatus] = useState(false)
  const [editingScore, setEditingScore] = useState(false)
  const [scoreValue, setScoreValue] = useState(student?.actualScore || '')
  const [savingScore, setSavingScore] = useState(false)

  useEffect(() => {
    setExamDateValue(student?.examDate || '')
    setBaselineVal(student?.baseline || '')
    setAimVal(student?.aim || '')
    setScoreValue(student?.actualScore || '')
  }, [student?.examDate, student?.baseline, student?.aim, student?.actualScore])

  const noteExtractedDate = useMemo(() => {
    return extractExamDateFromNote(student?.studentNote)
  }, [student?.studentNote])

  const effectiveExamDate = student?.examDate || noteExtractedDate || ''
  const effectiveExamMonthVal = normalizeExamMonthVal(effectiveExamDate)

  const currentExamStatus = useMemo(() => {
    const raw = (student?.examStatus || '').trim().toLowerCase()
    if (raw === 'đã thi' || raw === 'taken' || Boolean(student?.actualScore && student?.actualScore.trim())) {
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
  }, [student?.examStatus, student?.actualScore, effectiveExamDate])

  const computedAimAchieved = useMemo(() => {
    if (student?.aimAchieved !== undefined && student?.aimAchieved !== null) {
      return student.aimAchieved
    }
    return evaluateAimAchieved(student?.aim, student?.actualScore)
  }, [student?.aimAchieved, student?.aim, student?.actualScore])

  const handleUpdateExamStatus = (newStatus: string) => {
    if (!student?.enrollmentId) return
    setUpdatingExamStatus(true)
    if (newStatus === 'đã thi' && !student?.actualScore) {
      setScoreValue(student?.actualScore || '')
      setEditingScore(true)
    }
    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: { exam_status: newStatus },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onFinish: () => setUpdatingExamStatus(false),
      }
    )
  }

  const handleSaveScore = () => {
    if (!student?.enrollmentId) return
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

  const handleSaveBaselineAim = () => {
    if (!student?.enrollmentId) return
    setSavingBaselineAim(true)
    router.patch(
      `/enrollments/${student.enrollmentId}`,
      {
        enrollment: {
          baseline: baselineVal.trim(),
          aim: aimVal.trim(),
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => setEditingBaselineAim(false),
        onFinish: () => setSavingBaselineAim(false),
      }
    )
  }

  const [customExamDateInput, setCustomExamDateInput] = useState(false)

  const handleSelectExamMonth = (selectedVal: string) => {
    if (!student?.enrollmentId) return
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
    if (!student?.enrollmentId) return
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

  const availableTimeOptions = useMemo(() => {
    const defaultTimes = [
      '07:00', '07:20', '07:40',
      '08:00', '08:20', '08:40',
      '09:00', '09:20', '09:40',
      '10:00', '10:20', '10:40',
      '11:00', '11:20', '11:40',
      '12:00', '12:20', '12:40',
      '13:00', '13:20', '13:40',
      '14:00', '14:20', '14:40',
      '15:00', '15:20', '15:40',
      '16:00', '16:20', '16:40',
      '17:00', '17:20', '17:40',
      '18:00', '18:20', '18:40',
      '19:00', '19:20', '19:40',
      '20:00', '20:20', '20:40',
      '21:00', '21:20', '21:40',
      '22:00', '22:20', '22:40',
    ]
    const list = Array.from(
      new Set([
        ...(timeIntervals && timeIntervals.length > 0 ? timeIntervals : defaultTimes),
        ...(editingScheduleTime ? [editingScheduleTime] : []),
      ])
    ).sort()
    return list
  }, [timeIntervals, editingScheduleTime])

  if (!student) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <p className="text-center text-sm text-slate-500">Không có dữ liệu học viên.</p>
        </DialogContent>
      </Dialog>
    )
  }

  const sessions: StudentSessionItem[] = student.sessions ?? []
  const allSelected = sessions.length > 0 && selectedIds.length === sessions.length
  const isSomeSelected = selectedIds.length > 0 && !allSelected

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(sessions.map((s) => s.id))
    }
  }

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBatchUpdate = (updates: {
    cs_status?: string
    cs_form?: string
    lesson_status?: string
  }) => {
    if (selectedIds.length === 0) return
    setIsBatchUpdating(true)
    setStatusMessage(null)

    router.post(
      '/lesson_sessions/batch_update',
      {
        session_ids: selectedIds,
        updates,
        ...redirectParams,
      },
      {
        onSuccess: () => {
          setIsBatchUpdating(false)
          setSelectedIds([])
          setStatusMessage('✅ Đã cập nhật hàng loạt thành công!')
          setTimeout(() => setStatusMessage(null), 3000)
        },
        onError: (errors) => {
          setIsBatchUpdating(false)
          setStatusMessage(Object.values(errors).flat()[0] ?? 'Lỗi khi cập nhật.')
        },
      }
    )
  }

  const handleSingleUpdate = (sessionId: number, updates: Record<string, unknown>) => {
    router.patch(
      lessonSessionPath(sessionId),
      {
        lesson_session: updates,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setStatusMessage('✅ Đã cập nhật buổi học.')
          setTimeout(() => setStatusMessage(null), 2500)
        },
      }
    )
  }

  const handleSaveDayLabel = (sessionId: number, newLabel: string, cascade: boolean) => {
    setSavingDayId(sessionId)
    router.patch(
      lessonSessionPath(sessionId),
      {
        lesson_session: { day_label: newLabel },
        cascade: cascade,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSavingDayId(null)
          setEditingDayId(null)
          setStatusMessage('✅ Đã cập nhật nhãn Day!')
          setTimeout(() => setStatusMessage(null), 2500)
        },
        onError: (errors) => {
          setSavingDayId(null)
          setStatusMessage(Object.values(errors).flat()[0] ?? 'Lỗi khi cập nhật.')
        },
      }
    )
  }

  const handleSaveSchedule = (
    sessionId: number,
    newDate: string,
    newTime: string,
    newTeacherId: number | null,
    shiftAll: boolean
  ) => {
    if (!newDate || !newTime) return
    setSavingScheduleId(sessionId)
    setInlineScheduleError(null)

    router.patch(
      rescheduleLessonSessionPath(sessionId),
      {
        lesson_session: {
          scheduled_on: newDate,
          start_time: newTime,
          ...(newTeacherId ? { teacher_id: newTeacherId } : {}),
        },
        shift_subsequent: shiftAll,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSavingScheduleId(null)
          setEditingScheduleId(null)
          setStatusMessage('✅ Đã đổi lịch học thành công!')
          setTimeout(() => setStatusMessage(null), 2500)
        },
        onError: (errors) => {
          setSavingScheduleId(null)
          const errText = Object.values(errors).flat()[0] ?? 'Lỗi khi đổi lịch.'
          setInlineScheduleError(errText)
          setStatusMessage(`❌ ${errText}`)
        },
      }
    )
  }

  const handleRecalculateDays = () => {
    if (!student?.enrollmentId) return
    setIsRecalculatingDays(true)
    setStatusMessage(null)

    router.post(
      `/enrollments/${student.enrollmentId}/recalculate_days`,
      { ...redirectParams },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsRecalculatingDays(false)
          setStatusMessage('✅ Đã tự động sắp xếp lại nhãn Day cho toàn bộ khóa học!')
          setTimeout(() => setStatusMessage(null), 3000)
        },
        onError: (errors) => {
          setIsRecalculatingDays(false)
          setStatusMessage(Object.values(errors).flat()[0] ?? 'Lỗi khi cập nhật.')
        },
      }
    )
  }

  const handleSaveNote = (sessionId: number, explicitNoteValue?: string) => {
    const noteValue = explicitNoteValue !== undefined ? explicitNoteValue : notesState[sessionId]
    setSavingNoteId(sessionId)

    router.patch(
      lessonSessionPath(sessionId),
      {
        lesson_session: { lesson_notes: noteValue },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setSavingNoteId(null)
          if (explicitNoteValue !== undefined) {
            setNotesState((prev) => ({ ...prev, [sessionId]: explicitNoteValue }))
          }
          setStatusMessage('✅ Đã lưu ghi chú buổi học.')
          setTimeout(() => setStatusMessage(null), 2500)
        },
        onError: () => setSavingNoteId(null),
      }
    )
  }

  const handleBatchToggleTag = (tag: string) => {
    if (selectedIds.length === 0) return
    setIsBatchUpdating(true)
    setStatusMessage(null)

    router.patch(
      '/lesson_sessions/batch_update',
      {
        session_ids: selectedIds,
        tag_to_toggle: tag,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsBatchUpdating(false)
          setNotesState((prev) => {
            const next = { ...prev }
            for (const id of selectedIds) {
              const session = sessions.find((s) => s.id === id)
              const cur = prev[id] ?? session?.lessonNotes ?? ''
              next[id] = toggleNoteTag(cur, tag)
            }
            return next
          })
          setSelectedIds([])
          setStatusMessage(`✅ Đã cập nhật tag ${tag} cho ${selectedIds.length} buổi học!`)
          setTimeout(() => setStatusMessage(null), 3000)
        },
        onError: (errors) => {
          setIsBatchUpdating(false)
          setStatusMessage(Object.values(errors).flat()[0] ?? 'Lỗi khi cập nhật tag.')
        },
      }
    )
  }

  const handleBatchApplyTakeNotes = (_newNote: string, tagOnly?: string) => {
    if (selectedIds.length === 0) return
    const effectiveTag = tagOnly || _newNote
    setIsBatchUpdating(true)
    setStatusMessage(null)

    router.patch(
      '/lesson_sessions/batch_update',
      {
        session_ids: selectedIds,
        tag_to_apply: effectiveTag,
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsBatchUpdating(false)
          setBatchTakeNotesOpen(false)
          setNotesState((prev) => {
            const next = { ...prev }
            for (const id of selectedIds) {
              const session = sessions.find((s) => s.id === id)
              const cur = prev[id] ?? session?.lessonNotes ?? ''
              const cleaned = cur.replace(/\[Take notes[^\]]*\]/gi, '').replace(/\s{2,}/g, ' ').trim()
              next[id] = cleaned ? `${effectiveTag} ${cleaned}` : effectiveTag
            }
            return next
          })
          const count = selectedIds.length
          setSelectedIds([])
          setStatusMessage(`✅ Đã gắn tag Take Notes cho ${count} buổi học!`)
          setTimeout(() => setStatusMessage(null), 3000)
        },
        onError: (errors) => {
          setIsBatchUpdating(false)
          setStatusMessage(Object.values(errors).flat()[0] ?? 'Lỗi khi gắn tag Take Notes.')
        },
      }
    )
  }

  const handleDeleteEnrollment = () => {
    if (!student.enrollmentId) return

    router.delete(`/enrollments/${student.enrollmentId}`, {
      data: { ...redirectParams },
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl p-0 gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white rounded-t-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/20 text-white font-black text-xl backdrop-blur-sm shadow-inner">
                {student.studentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-white flex items-center gap-2 flex-wrap">
                  <span>{student.studentName}</span>
                  <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full text-emerald-100">
                    {student.studentCode}
                  </span>
                  {(role === 'sales' || role === 'cs' || role === 'admin') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditStudentOpen(true)}
                      className="h-6 px-2 text-[11px] font-bold text-emerald-100 hover:text-white hover:bg-white/20 rounded-lg gap-1 border border-white/20 shadow-2xs cursor-pointer"
                      title="Sửa tên và mã học viên"
                    >
                      <Edit className="size-3" />
                      <span>Sửa tên / mã</span>
                    </Button>
                  )}
                </DialogTitle>
                <p className="text-xs text-emerald-100 font-semibold mt-0.5 flex items-center gap-2">
                  <BookOpen className="size-3.5" /> Khóa học: <strong>{student.course}</strong>
                </p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1">
              <span className="rounded-full bg-emerald-500/30 border border-emerald-300/40 px-3 py-1 text-xs font-bold text-white">
                {student.paymentStatus || 'Chưa TT'}
              </span>
              <span className="text-[11px] text-emerald-100 font-medium">
                Hoàn thành: <strong>{student.completed}/{student.total} buổi</strong> ({student.pct}%)
              </span>
            </div>
          </div>

          {/* Multi-course switcher for the same student */}
          {allStudents.filter((s) => s.studentCode === student.studentCode).length > 1 && (
            <div className="mt-3.5 pt-3 border-t border-white/20 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wide">
                📚 Các khóa của học viên này:
              </span>
              {allStudents
                .filter((s) => s.studentCode === student.studentCode)
                .map((c) => (
                  <button
                    key={c.enrollmentId}
                    type="button"
                    onClick={() => onSelectStudent?.(c)}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-xs',
                      c.enrollmentId === student.enrollmentId
                        ? 'bg-white text-emerald-900 ring-2 ring-emerald-300 font-extrabold scale-105'
                        : 'bg-white/20 text-emerald-100 hover:bg-white/30 hover:text-white'
                    )}
                  >
                    <BookOpen className="size-3" />
                    <span>{c.course}</span>
                    <span className="text-[10px] opacity-80">({c.completed}/{c.total} buổi)</span>
                  </button>
                ))}
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-4 relative h-2 overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full rounded-full bg-emerald-300 transition-all duration-500"
              style={{ width: `${Math.min(student.pct, 100)}%` }}
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-xs font-medium text-emerald-50 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            {/* 1. Đầu vào */}
            <div>
              <span className="text-emerald-200 text-[10px] block font-bold uppercase">Đầu vào</span>
              {editingBaselineAim ? (
                <Input
                  value={baselineVal}
                  onChange={(e) => setBaselineVal(e.target.value)}
                  placeholder="VD: 5.5 - 6.0"
                  className="h-6 w-24 px-1 text-[11px] font-bold bg-white text-slate-900 border-emerald-400 mt-0.5"
                />
              ) : (
                <strong className="text-white">{student.baseline || 'Chưa có'}</strong>
              )}
            </div>

            {/* 2. Aim (Đầu ra) */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-200 text-[10px] block font-bold uppercase">Aim (Đầu ra)</span>
                {!editingBaselineAim && (
                  <button
                    type="button"
                    onClick={() => {
                      setBaselineVal(student.baseline || '')
                      setAimVal(student.aim || '')
                      setEditingBaselineAim(true)
                    }}
                    title="Sửa Đầu vào & Aim"
                    className="text-emerald-300 hover:text-white cursor-pointer"
                  >
                    <Edit className="size-2.5" />
                  </button>
                )}
              </div>
              {editingBaselineAim ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Input
                    value={aimVal}
                    onChange={(e) => setAimVal(e.target.value)}
                    placeholder="VD: 6.5 - 7.0"
                    className="h-6 w-24 px-1 text-[11px] font-bold bg-white text-slate-900 border-emerald-400"
                  />
                  <button
                    type="button"
                    disabled={savingBaselineAim}
                    onClick={handleSaveBaselineAim}
                    className="px-1.5 py-0.5 rounded bg-emerald-300 text-emerald-950 font-bold text-[10px] cursor-pointer"
                  >
                    {savingBaselineAim ? '...' : 'Lưu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBaselineAim(false)}
                    className="text-emerald-200 hover:text-white text-[10px] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <strong className="text-yellow-200 font-bold">{student.aim || 'Chưa có'}</strong>
              )}
            </div>

            {/* 3. Thời gian thi (MM/YY) */}
            <div>
              <span className="text-emerald-200 text-[10px] block font-bold uppercase">Thời gian thi</span>
              {customExamDateInput ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    value={examDateValue}
                    onChange={(e) => setExamDateValue(e.target.value)}
                    placeholder="VD: 15/10/2026..."
                    className="h-8 w-28 px-2 text-xs font-bold bg-white text-slate-900 border-emerald-400"
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
                    className="h-8 px-2 rounded bg-emerald-300 hover:bg-emerald-200 text-emerald-950 font-bold text-xs cursor-pointer"
                  >
                    {savingExamDate ? '...' : 'Lưu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomExamDateInput(false)}
                    className="h-8 text-emerald-200 hover:text-white text-xs px-1 cursor-pointer"
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
                  className="mt-1 h-8 rounded-lg bg-emerald-950/80 border border-emerald-400/60 px-2.5 py-1 text-xs font-bold text-white cursor-pointer hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {getExamMonthOptions(effectiveExamDate).map((opt) => (
                    <option key={opt.value} value={opt.value} className="text-slate-900">
                      {opt.label}
                    </option>
                  ))}
                  <option value="__custom__" className="text-slate-900">+ Nhập ngày cụ thể...</option>
                </select>
              )}
            </div>

            {/* 4. Trạng thái thi & Điểm thi */}
            <div>
              <span className="text-emerald-200 text-[10px] block font-bold uppercase">Trạng thái thi</span>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <select
                  value={currentExamStatus}
                  onChange={(e) => handleUpdateExamStatus(e.target.value)}
                  disabled={updatingExamStatus}
                  className="h-8 rounded-lg bg-emerald-950/80 border border-emerald-400/60 px-2.5 py-1 text-xs font-bold text-white cursor-pointer hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="chưa thi" className="text-slate-900">Chưa thi</option>
                  <option value="sắp thi" className="text-slate-900">Sắp thi</option>
                  <option value="đã thi" className="text-slate-900">Đã thi</option>
                </select>

                {currentExamStatus === 'đã thi' && (
                  <>
                    {editingScore ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={scoreValue}
                          onChange={(e) => setScoreValue(e.target.value)}
                          placeholder="Điểm..."
                          className="h-6 w-16 px-1 text-[11px] font-bold bg-white text-slate-900 border-emerald-400"
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
                          className="px-1.5 py-0.5 rounded bg-emerald-300 text-emerald-950 font-bold text-[10px] cursor-pointer"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingScore(false)}
                          className="text-emerald-200 hover:text-white text-[10px] cursor-pointer"
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
                        className="hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <span className="text-yellow-200">
                          {student.actualScore ? `Điểm: ${student.actualScore}` : '+ Nhập điểm'}
                        </span>
                        <Edit className="size-2 text-emerald-200" />
                        {computedAimAchieved === true && (
                          <span className="bg-emerald-300 text-emerald-950 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                            🎉 Đạt aim
                          </span>
                        )}
                        {computedAimAchieved === false && (
                          <span className="bg-rose-300 text-rose-950 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            Chưa đạt aim
                          </span>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 5. Còn lại */}
            <div>
              <span className="text-emerald-200 text-[10px] block font-bold uppercase">Còn lại</span>
              <strong className={student.almostEnd ? 'text-rose-200 font-black' : ''}>
                {student.remaining} buổi {student.almostEnd && '(Sắp hết)'}
              </strong>
            </div>
          </div>

          {/* Reservation Status Banner */}
          {(student.isReserved || student.status === 'reserved' || student.reservedFrom) && (
            <div className="mt-3 rounded-2xl bg-amber-500/30 border border-amber-300/50 p-3 text-xs text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="font-black text-white flex items-center gap-1.5">
                  <PauseCircle className="size-4 text-amber-300" />
                  <span>KHÓA HỌC ĐANG BẢO LƯU</span>
                  <span className="font-normal text-amber-200">
                    (từ {student.reservedFrom ? new Date(student.reservedFrom).toLocaleDateString('vi-VN') : '—'} • Đã bảo lưu: <strong>{student.reservationDays || 0} ngày / max 60 ngày</strong>)
                  </span>
                </div>
                {student.resumeDate && (
                  <p className="text-[11px] text-amber-200">
                    🎯 Dự kiến học lại: <strong>{new Date(student.resumeDate).toLocaleDateString('vi-VN')}</strong>
                    {student.daysUntilResume !== null && student.daysUntilResume !== undefined && (
                      <span className="ml-1 text-white/90">
                        ({student.daysUntilResume > 0 ? `còn ${student.daysUntilResume} ngày` : 'đến hạn'})
                      </span>
                    )}
                  </p>
                )}
                {student.reservationNote && (
                  <p className="text-[11px] italic text-amber-200/90">
                    💬 Ghi chú: "{student.reservationNote}"
                  </p>
                )}
              </div>

              {!isTeacher && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      onResumeStudent?.(student)
                    }}
                    className="h-8 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-black shadow-md"
                  >
                    <Play className="size-3.5 fill-emerald-800 mr-1 text-emerald-800" /> Học Lại / Xếp Lịch
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (!student.enrollmentId) return
                      router.post(
                        `/enrollments/${student.enrollmentId}/cancel_reservation`,
                        { ...redirectParams },
                        { preserveScroll: true }
                      )
                    }}
                    className="h-8 rounded-xl text-amber-100 hover:text-white hover:bg-white/10 text-xs font-bold"
                  >
                    Hủy bảo lưu
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {student.studentNote ? (
              <div className="flex-1 rounded-xl bg-amber-500/20 border border-amber-300/30 px-3 py-2 text-xs text-amber-100 flex flex-wrap items-center justify-between gap-2">
                <div>
                  📌 <strong>Note từ Sales:</strong> {student.studentNote}
                </div>
                <TagBadges text={student.studentNote} />
              </div>
            ) : <div />}

            {/* Actions: Reschedule frequency, Reserve, End course & Delete entire course (Only for CS / Admin) */}
            {!isTeacher && student.enrollmentId && (
              <div className="flex flex-wrap items-center gap-2">
                {/* Reserve Button if not already reserved */}
                {!student.isReserved && !student.isEnded && student.active !== false && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      onReserveStudent?.(student)
                    }}
                    className="h-8 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 text-amber-100 border border-amber-300/40 text-xs font-bold transition shadow-sm"
                  >
                    <PauseCircle className="size-3.5 mr-1 text-amber-200" /> Bảo lưu khóa
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setRescheduleDialogOpen(true)}
                  className="h-8 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 text-xs font-black transition shadow-sm"
                >
                  <Zap className="size-3.5 mr-1 text-amber-950 fill-amber-950" /> Đổi tần suất / Xếp lại lịch
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const isEnded = Boolean(student.isEnded || student.active === false || (student.total > 0 && student.remaining === 0))
                    router.patch(
                      `/enrollments/${student.enrollmentId}`,
                      {
                        enrollment: { active: isEnded ? true : false },
                        ...redirectParams,
                      },
                      { preserveScroll: true }
                    )
                  }}
                  className={cn(
                    'h-8 rounded-xl text-xs font-bold transition shadow-sm',
                    student.isEnded || student.active === false || (student.total > 0 && student.remaining === 0)
                      ? 'bg-emerald-500/30 hover:bg-emerald-600 border border-emerald-300 text-white'
                      : 'bg-white/20 hover:bg-white/30 border border-white/30 text-white'
                  )}
                >
                  {student.isEnded || student.active === false || (student.total > 0 && student.remaining === 0) ? (
                    <>
                      <RotateCcw className="size-3.5 mr-1" /> Mở lại khóa
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5 mr-1" /> Đã end khóa
                    </>
                  )}
                </Button>

                {!deleteEnrollmentConfirm ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setDeleteEnrollmentConfirm(true)}
                    className="h-8 rounded-xl bg-rose-500/25 hover:bg-rose-600 border border-rose-300/40 text-rose-100 hover:text-white text-xs font-bold transition shadow-sm"
                  >
                    <Trash2 className="size-3.5 mr-1" /> Xóa Khóa ({sessions.length} buổi)
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-950/90 border border-rose-400 p-1.5 rounded-xl text-xs backdrop-blur-md">
                    <span className="text-rose-200 font-bold text-[11px]">Xóa hết toàn bộ {sessions.length} buổi?</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDeleteEnrollment}
                      className="h-7 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-2.5 rounded-lg"
                    >
                      Xóa vĩnh viễn
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteEnrollmentConfirm(false)}
                      className="h-7 text-rose-200 hover:text-white text-xs px-2"
                    >
                      Hủy
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 animate-in fade-in">
              {statusMessage}
            </div>
          )}

          {/* Batch Actions Toolbar (Only for CS / Admin) */}
          {!isTeacher && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-sm space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-emerald-700 transition"
                >
                  {allSelected ? (
                    <CheckSquare className="size-4 text-emerald-600" />
                  ) : isSomeSelected ? (
                    <Square className="size-4 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Square className="size-4 text-slate-400" />
                  )}
                  <span>Chọn tất cả ({sessions.length} buổi)</span>
                </button>

                {selectedIds.length > 0 && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold">
                    Đã chọn {selectedIds.length} buổi
                  </Badge>
                )}

                {selectedIds.length === 0 && student.enrollmentId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRecalculatingDays}
                    onClick={handleRecalculateDays}
                    title="Tự động tính lại nhãn Day theo thời lượng từng ca: ca 40p -> Day 1, các ca 50p/60p/80p -> Day 2 & 3, Day 4 & 5..."
                    className="h-7 text-xs font-bold border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 rounded-xl transition shadow-xs"
                  >
                    <RotateCcw className="size-3 mr-1 text-indigo-600" />
                    {isRecalculatingDays ? 'Đang căn chỉnh...' : '⚡ Căn chỉnh lại nhãn Day'}
                  </Button>
                )}
              </div>

              {selectedIds.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="h-7 text-xs text-slate-500 hover:text-slate-900"
                >
                  <X className="size-3 mr-1" /> Bỏ chọn
                </Button>
              )}
            </div>

            {/* Quick action buttons for batch update */}
            {selectedIds.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">
                    Trạng thái:
                  </span>

                  {role === 'cs' ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ cs_status: 'completed' })}
                        className="h-8 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> CS Xác nhận hoàn thành
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ cs_status: 'upcoming' })}
                        className="h-8 border-slate-300 text-slate-700 font-bold text-xs bg-white"
                      >
                        <Clock className="size-3.5 mr-1 text-slate-500" /> CS Chưa duyệt
                      </Button>
                    </>
                  ) : role === 'teacher' ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ lesson_status: 'completed' })}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> GV Báo đã dạy
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ lesson_status: 'scheduled' })}
                        className="h-8 border-slate-300 text-slate-700 font-bold text-xs bg-white"
                      >
                        <Clock className="size-3.5 mr-1 text-slate-500" /> GV Chưa dạy
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ cs_status: 'completed', lesson_status: 'completed' })}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> Đã Học (Khớp cả GV & CS)
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ cs_status: 'completed' })}
                        className="h-8 border-purple-300 text-purple-800 font-bold text-xs bg-purple-50"
                      >
                        <CheckCircle2 className="size-3.5 mr-1 text-purple-600" /> CS Duyệt
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ lesson_status: 'completed' })}
                        className="h-8 border-emerald-300 text-emerald-800 font-bold text-xs bg-emerald-50"
                      >
                        <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" /> GV Điểm danh
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isBatchUpdating}
                        onClick={() => handleBatchUpdate({ cs_status: 'upcoming', lesson_status: 'scheduled' })}
                        className="h-8 border-slate-300 text-slate-700 font-bold text-xs bg-white"
                      >
                        <Clock className="size-3.5 mr-1 text-slate-500" /> Chưa Học
                      </Button>
                    </>
                  )}
                </div>

                {/* Batch Tagging: chỉ CS/Admin làm, ẩn với GV */}
                {!isTeacher && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-1">
                      <Tag className="size-3 text-slate-500" /> Gắn Tag Hàng Loạt ({selectedIds.length} buổi):
                    </span>
                    {[
                      { label: 'Đã bảo lưu', tag: '[Đã bảo lưu]' },
                      { label: 'Nghỉ có phép', tag: '[Nghỉ có phép]' },
                      { label: 'Học bù', tag: '[Học bù]' },
                      { label: 'Đổi giờ', tag: '[Đổi giờ]' },
                      { label: 'Take notes', tag: '[Take notes]' },
                      { label: 'Đã nộp BTVN', tag: '[Đã nộp BTVN]' },
                      { label: 'Chưa làm BTVN', tag: '[Chưa làm BTVN]' },
                    ].map((t) => (
                      <button
                        key={t.tag}
                        type="button"
                        disabled={isBatchUpdating}
                        onClick={() => {
                          if (t.tag === '[Take notes]') {
                            setBatchTakeNotesOpen(true)
                          } else {
                            handleBatchToggleTag(t.tag)
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <span>+ {t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Sessions List */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              📅 Danh Sách Các Buổi Học ({sessions.length} buổi)
            </h3>

            {sessions.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed rounded-2xl">
                Chưa có buổi học nào được tạo cho học viên này.
              </p>
            ) : (
              sessions.map((session, index) => {
                const isSelected = selectedIds.includes(session.id)
                const currentNote = notesState[session.id] ?? session.lessonNotes ?? ''
                const hasNoteChanged = currentNote !== (session.lessonNotes ?? '')
                const isCompleted =
                  session.csStatus === 'completed' || session.lessonStatus === 'completed'

                return (
                  <div
                    key={session.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all shadow-sm space-y-3',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400'
                        : isCompleted
                          ? 'border-slate-200 bg-slate-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    {/* Top row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {!isTeacher && (
                          <button
                            type="button"
                            onClick={() => toggleSelectOne(session.id)}
                            className="text-slate-400 hover:text-emerald-600 transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="size-5 text-emerald-600" />
                            ) : (
                              <Square className="size-5" />
                            )}
                          </button>
                        )}

                        <div className="flex items-center gap-2">
                          {isTeacher ? (
                            <span className="font-extrabold text-sm text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
                              {session.dayLabel || `Day ${index + 1}`}
                            </span>
                          ) : editingDayId === session.id ? (
                            <div className="flex flex-wrap items-center gap-1.5 bg-indigo-50 border border-indigo-200 p-1.5 rounded-xl shadow-xs">
                              <Input
                                value={editingDayValue}
                                onChange={(e) => setEditingDayValue(e.target.value)}
                                placeholder="VD: Day 1/13 hay Day 2 & 3/13"
                                className="h-6 w-32 font-black text-xs bg-white border-indigo-300 px-2"
                                autoFocus
                              />
                              <label className="flex items-center gap-1 text-[10px] font-bold text-indigo-900 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={editingCascade}
                                  onChange={(e) => setEditingCascade(e.target.checked)}
                                  className="rounded size-3 border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Đổi tiếp sau
                              </label>
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingDayId === session.id || !editingDayValue.trim()}
                                onClick={() => handleSaveDayLabel(session.id, editingDayValue, editingCascade)}
                                className="h-6 px-2 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                              >
                                <Save className="size-2.5 mr-0.5" />
                                {savingDayId === session.id ? '...' : 'Lưu'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingDayId(null)}
                                className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-900"
                              >
                                Hủy
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDayId(session.id)
                                setEditingDayValue(session.dayLabel || `Day ${index + 1}`)
                                setEditingCascade(true)
                              }}
                              title="Click để sửa tên/nhãn Day (VD: Day 1/13, Day 2 & 3/13...)"
                              className="group font-extrabold text-sm text-slate-900 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-900 border border-slate-200 hover:border-indigo-300 px-2.5 py-1 rounded-xl transition flex items-center gap-1"
                            >
                              <span>{session.dayLabel || `Day ${index + 1}`}</span>
                              <Edit className="size-3 text-slate-400 group-hover:text-indigo-600 opacity-60 group-hover:opacity-100" />
                            </button>
                          )}

                          {isTeacher ? (
                            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3.5 text-slate-500" />
                                <span className="font-bold">{session.scheduledOn}</span>
                              </span>
                              <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                                <Clock className="size-3 text-emerald-600" />
                                {session.startTime} - {session.endTime}
                              </span>
                            </div>
                          ) : editingScheduleId === session.id ? (
                            <div className="flex flex-wrap items-center gap-1.5 bg-emerald-50/95 border border-emerald-300 p-1.5 rounded-xl shadow-xs">
                              {/* Date Picker */}
                              <div className="flex items-center gap-1">
                                <Calendar className="size-3.5 text-emerald-700" />
                                <Input
                                  type="date"
                                  value={editingScheduleDate}
                                  onChange={(e) => {
                                    setEditingScheduleDate(e.target.value)
                                    setInlineScheduleError(null)
                                  }}
                                  className="h-7 w-32 font-bold text-xs bg-white border-emerald-300 px-2 rounded-lg"
                                  autoFocus
                                />
                              </div>

                              {/* Time Select */}
                              <div className="flex items-center gap-1">
                                <Clock className="size-3.5 text-emerald-700" />
                                <Select
                                  value={editingScheduleTime}
                                  onValueChange={(val) => {
                                    setEditingScheduleTime(val)
                                    setInlineScheduleError(null)
                                  }}
                                >
                                  <SelectTrigger className="h-7 w-24 bg-white border-emerald-300 font-bold text-xs px-2 rounded-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {availableTimeOptions.map((t) => (
                                      <SelectItem key={t} value={t} className="text-xs font-semibold">
                                        {t}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Teacher Select (if multiple teachers) */}
                              {teachers && teachers.length > 1 && (
                                <Select
                                  value={String(editingScheduleTeacherId ?? session.teacherId ?? '')}
                                  onValueChange={(val) => setEditingScheduleTeacherId(Number(val))}
                                >
                                  <SelectTrigger className="h-7 w-28 bg-white border-emerald-300 font-bold text-xs px-2 rounded-lg">
                                    <SelectValue placeholder="Chọn GV" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-56">
                                    {teachers.map((t) => (
                                      <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                                        {t.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {/* Shift Subsequent Checkbox with delta */}
                              <label
                                className="flex items-center gap-1 text-[10px] font-bold text-emerald-950 cursor-pointer select-none px-1"
                                title="Tự động dời các buổi học tiếp theo theo số ngày thay đổi"
                              >
                                <input
                                  type="checkbox"
                                  checked={editingScheduleShiftAll}
                                  onChange={(e) => setEditingScheduleShiftAll(e.target.checked)}
                                  className="rounded size-3 border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>
                                  Dời các buổi sau
                                  {editingScheduleDate && session.scheduledOn && (
                                    (() => {
                                      const delta = Math.round(
                                        (new Date(editingScheduleDate).getTime() -
                                          new Date(session.scheduledOn).getTime()) /
                                          86400000
                                      )
                                      if (delta !== 0) return ` (${delta > 0 ? `+${delta}` : delta} ngày)`
                                      return ''
                                    })()
                                  )}
                                </span>
                              </label>

                              {/* Save button */}
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  savingScheduleId === session.id ||
                                  !editingScheduleDate ||
                                  !editingScheduleTime
                                }
                                onClick={() =>
                                  handleSaveSchedule(
                                    session.id,
                                    editingScheduleDate,
                                    editingScheduleTime,
                                    editingScheduleTeacherId,
                                    editingScheduleShiftAll
                                  )
                                }
                                className="h-7 px-2.5 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs cursor-pointer"
                              >
                                <Save className="size-3 mr-1" />
                                {savingScheduleId === session.id ? '...' : 'Lưu'}
                              </Button>

                              {/* Cancel button */}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingScheduleId(null)
                                  setInlineScheduleError(null)
                                }}
                                className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                              >
                                Hủy
                              </Button>

                              {inlineScheduleError && (
                                <p className="w-full text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5 mt-1">
                                  {inlineScheduleError}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingScheduleId(session.id)
                                setEditingScheduleDate(session.scheduledOn)
                                setEditingScheduleTime(session.startTime)
                                setEditingScheduleTeacherId(session.teacherId || student.teacherId || null)
                                setEditingScheduleShiftAll(false)
                                setInlineScheduleError(null)
                              }}
                              title="Click để đổi ngày / giờ dạy của buổi học này"
                              className="group flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/90 hover:bg-emerald-50 hover:border-emerald-300 px-2.5 py-1 text-xs font-semibold text-slate-800 transition cursor-pointer shadow-2xs"
                            >
                              <span className="flex items-center gap-1 group-hover:text-emerald-950">
                                <Calendar className="size-3.5 text-slate-500 group-hover:text-emerald-700" />
                                <span className="font-bold">{session.scheduledOn}</span>
                              </span>
                              <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                                <Clock className="size-3 text-emerald-600" />
                                {session.startTime} - {session.endTime}
                              </span>
                              <Edit className="size-3 text-slate-400 group-hover:text-emerald-700 opacity-70 group-hover:opacity-100 transition" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Status selectors / badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <TagBadges text={currentNote || session.lessonNotes} />

                        {session.teacherName && (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                            GV: {session.teacherName}
                          </span>
                        )}

                        {/* Status indicators: GV & CS separated */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn(
                            'text-[10px] font-extrabold px-2 py-0.5 rounded-lg border',
                            session.lessonStatus === 'completed'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : session.lessonStatus === 'absent'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            GV: {session.lessonStatus === 'completed' ? 'Đã dạy ✅' : session.lessonStatus === 'absent' ? 'Vắng ❌' : 'Chưa dạy ⏳'}
                          </span>

                          <span className={cn(
                            'text-[10px] font-extrabold px-2 py-0.5 rounded-lg border',
                            session.csStatus === 'completed'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : session.csStatus === 'absent'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            CS: {session.csStatus === 'completed' ? 'Đã duyệt ✅' : session.csStatus === 'absent' ? 'Vắng ❌' : 'Chờ duyệt ⏳'}
                          </span>

                          {session.lessonStatus === 'completed' && session.csStatus === 'completed' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-700 text-white shadow-xs">
                              🎉 Khớp lệnh
                            </span>
                          )}
                        </div>

                        {/* Status toggle dropdown */}
                        <Select
                          value={
                            role === 'cs'
                              ? (session.csStatus || 'upcoming')
                              : role === 'teacher'
                                ? (session.lessonStatus === 'completed' ? 'completed' : session.lessonStatus === 'absent' ? 'absent' : 'upcoming')
                                : (session.csStatus || 'upcoming')
                          }
                          onValueChange={(val) => {
                            const updatePayload =
                              role === 'cs'
                                ? { cs_status: val }
                                : role === 'teacher'
                                  ? { lesson_status: val === 'completed' ? 'completed' : val === 'absent' ? 'absent' : 'scheduled' }
                                  : {
                                      cs_status: val,
                                      lesson_status: val === 'completed' ? 'completed' : val === 'absent' ? 'absent' : 'scheduled',
                                    }
                            handleSingleUpdate(session.id, updatePayload)
                          }}
                        >
                          <SelectTrigger className={cn(
                            'h-7 text-xs font-bold rounded-lg w-auto min-w-[130px] border shadow-2xs cursor-pointer gap-1.5',
                            (role === 'cs' ? session.csStatus === 'completed' : session.lessonStatus === 'completed')
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                              : (role === 'cs' ? session.csStatus === 'absent' : session.lessonStatus === 'absent')
                                ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                          )}>
                            <div className="flex items-center gap-1.5">
                              {(role === 'cs' ? session.csStatus === 'completed' : session.lessonStatus === 'completed') ? (
                                <>
                                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                  <span>{role === 'cs' ? 'CS: Đã duyệt' : role === 'teacher' ? 'GV: Đã dạy' : 'Đã hoàn thành'}</span>
                                </>
                              ) : (role === 'cs' ? session.csStatus === 'absent' : session.lessonStatus === 'absent') ? (
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
                          <SelectContent position="popper" align="end" className="rounded-2xl text-xs z-50 bg-white shadow-xl border border-slate-200 min-w-[190px] p-1.5">
                            <SelectItem value="completed" className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-emerald-800 focus:bg-emerald-50">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                <span>{role === 'cs' ? 'CS: Xác nhận Đã học' : role === 'teacher' ? 'GV: Điểm danh Đã dạy' : 'Đã hoàn thành'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="upcoming" className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-blue-800 focus:bg-blue-50">
                              <div className="flex items-center gap-2">
                                <Clock className="size-3.5 text-blue-600 shrink-0" />
                                <span>{role === 'cs' ? 'CS: Chưa duyệt' : role === 'teacher' ? 'GV: Chưa dạy' : 'Chưa diễn ra'}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="absent" className="text-xs font-bold py-2 px-2.5 rounded-xl cursor-pointer text-rose-800 focus:bg-rose-50">
                              <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                                <span>Vắng mặt</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                      </div>
                    </div>

                    {/* Daily Note Row */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                      {/* Tag chips: chỉ hiển thị cho CS / Sales / Admin, GV không gắn tag */}
                      {!isTeacher && (
                        <QuickTagChips
                          currentNote={currentNote}
                          onToggleTag={(newNote) =>
                            setNotesState((prev) => ({ ...prev, [session.id]: newNote }))
                          }
                        />
                      )}

                      {/* Display structured note if present and not currently expanding the editor */}
                      {(session.lessonNotes || currentNote) && expandedEditorSessionId !== session.id && (
                        <StructuredNoteDisplay note={currentNote || session.lessonNotes} compact />
                      )}

                      {expandedEditorSessionId === session.id ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-3 mt-1 space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100">
                            <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1">
                              <span>✏️</span>
                              <span>Ghi chú buổi học 3 phần ({session.dayLabel || `Day ${index + 1}`})</span>
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer px-2"
                              onClick={() => setExpandedEditorSessionId(null)}
                            >
                              ✕ Đóng
                            </Button>
                          </div>
                          <StructuredNoteEditor
                            initialNote={currentNote || session.lessonNotes || ''}
                            role={role}
                            currentDayLabel={session.dayLabel || `Day ${index + 1}`}
                            previousSession={index > 0 ? sessions[index - 1] : null}
                            isSaving={savingNoteId === session.id}
                            onSave={(serializedNote) => {
                              handleSaveNote(session.id, serializedNote)
                              setExpandedEditorSessionId(null)
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            <Input
                              placeholder={
                                isTeacher
                                  ? `📝 Ghi chú buổi học ${session.dayLabel || `Day ${index + 1}`} (nếu có)...`
                                  : `📝 Ghi chú bài tập / dặn dò / tag cho ${session.dayLabel || `Day ${index + 1}`}...`
                              }
                              value={currentNote}
                              onChange={(e) =>
                                setNotesState((prev) => ({ ...prev, [session.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && hasNoteChanged) handleSaveNote(session.id)
                              }}
                              className="h-8 text-xs bg-slate-50/80 border-slate-200 placeholder:text-slate-400 pr-16 focus:bg-white"
                            />
                            {session.lessonNotes && !hasNoteChanged && (
                              <span className="absolute right-2 top-2 text-[10px] font-bold text-emerald-600">
                                Đã lưu
                              </span>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            title="Mở trình soạn ghi chú 3 phần (Điểm tốt / Cần cải thiện / Lưu ý khác) và xem ghi chú buổi trước"
                            onClick={() => setExpandedEditorSessionId(session.id)}
                            className="h-8 text-[11px] font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border-indigo-200 px-2.5 shadow-2xs cursor-pointer shrink-0"
                          >
                            <span>📝 Soạn 3 phần</span>
                          </Button>

                          {hasNoteChanged && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={savingNoteId === session.id}
                              onClick={() => handleSaveNote(session.id)}
                              className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-3 shadow-xs cursor-pointer shrink-0"
                            >
                              <Save className="size-3 mr-1" />
                              {savingNoteId === session.id ? 'Đang lưu...' : 'Lưu Note'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>

      {rescheduleDialogOpen && (
        <RescheduleFrequencyDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          student={student}
          teachers={teachers}
          timeIntervals={timeIntervals}
          redirectParams={redirectParams}
        />
      )}

      {batchTakeNotesOpen && (
        <TakeNotesDeadlineDialog
          open={batchTakeNotesOpen}
          onOpenChange={setBatchTakeNotesOpen}
          currentNote=""
          sessionTitle={`Gắn tag Take Notes cho ${selectedIds.length} buổi học đã chọn`}
          onSave={handleBatchApplyTakeNotes}
        />
      )}

      {editStudentOpen && (
        <EditStudentDialog
          open={editStudentOpen}
          onOpenChange={setEditStudentOpen}
          student={student}
          redirectParams={redirectParams}
        />
      )}
    </Dialog>
  )
}
