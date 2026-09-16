import { router } from '@inertiajs/react'
import { PlusCircle, Save, Sparkles, UserCheck } from 'lucide-react'
import {
  type ComponentProps,
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useState,
} from 'react'
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
import { enrollmentsPath } from '@/lib/routes'
import { cn } from '@/lib/utils'
import { DAYS } from '../calendar'
import type { Enrollment, Person, SchedulerMutationRedirectParams } from '../types'

type SchedulePattern = { id: string; day: string; time: string }

type BookingForm = {
  teacherId: string
  studentName: string
  studentCode: string
  courseName: string
  courseSkill: string
  meetLink: string
  durationMinutes: string
  startDate: string
  totalSessions: string
  frequencyPerWeek: string
  baseline: string
  aim: string
  examDate: string
  studentNote: string
  paymentStatus: string
  tuitionNote: string
  schedulePatterns: SchedulePattern[]
  startDayNumber: string
  direction: 'forward' | 'backward' | 'both'
  paymentReminderDays: number[]
  doubleSession: boolean
}

export function SalesBookingDialog({
  open,
  onOpenChange,
  teachers,
  salesId,
  selectedTeacherId,
  timeIntervals,
  redirectParams,
  prefill,
  enrollments = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teachers: Person[]
  salesId: number
  selectedTeacherId: number
  timeIntervals: string[]
  redirectParams: SchedulerMutationRedirectParams
  prefill?: { dayName: string; time: string; date: string } | null
  enrollments?: Enrollment[]
}): ReactElement {
  const [bookingMode, setBookingMode] = useState<'new' | 'existing'>('new')
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('')
  const [sessionsToAdd, setSessionsToAdd] = useState<string>('2')

  const [form, setForm] = useState<BookingForm>(() =>
    initialForm(selectedTeacherId, timeIntervals, redirectParams, prefill)
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setBookingMode('new')
      setSelectedEnrollmentId('')
      setSessionsToAdd('2')
      setForm(initialForm(selectedTeacherId, timeIntervals, redirectParams, prefill))
      setErrorMessage(null)
    }
  }, [open, selectedTeacherId, timeIntervals, redirectParams, prefill])

  const selectedEnrollment = enrollments.find((e) => String(e.id) === selectedEnrollmentId)
  const existingDays = selectedEnrollment
    ? (selectedEnrollment.totalSessions > 0 ? selectedEnrollment.totalSessions : (selectedEnrollment.existingSessionsCount || 0))
    : 0
  const existingSessionsCount = selectedEnrollment
    ? (selectedEnrollment.sessions?.length || selectedEnrollment.existingSessionsCount || 0)
    : 0

  const handleSelectExisting = (enrId: string) => {
    setSelectedEnrollmentId(enrId)
    const enr = enrollments.find((e) => String(e.id) === enrId)
    if (enr) {
      let cName = enr.courseName
      let cSkill = 'Speaking'
      if (cName.includes(' - ')) {
        const parts = cName.split(' - ')
        cName = parts[0]
        cSkill = parts.slice(1).join(' - ')
      }

      const isDouble = Number(enr.durationMinutes) >= 80 || (enr.sessions && enr.sessions.some((s) => s.dayLabel.includes('&') || s.dayLabel.includes('-'))) || cName.startsWith('W') || cSkill === 'Writing'

      setForm((prev) => ({
        ...prev,
        teacherId: String(enr.teacherId),
        studentName: enr.student.name,
        studentCode: enr.student.code,
        courseName: cName,
        courseSkill: cSkill,
        durationMinutes: String(enr.durationMinutes || (isDouble ? 50 : 40)),
        doubleSession: isDouble,
        meetLink: enr.meetLink,
        paymentStatus: enr.paymentStatus,
        tuitionNote: enr.tuitionNote ?? '',
        baseline: enr.student.baseline ?? '',
        aim: enr.student.aim ?? '',
        examDate: enr.student.examDate ?? '',
        studentNote: enr.student.studentNote ?? '',
      }))
    }
  }

  const frequency = Number(form.frequencyPerWeek)
  const totalSessions = Number(form.totalSessions) || 1
  const startDay = Math.max(1, Math.min(Number(form.startDayNumber) || 1, totalSessions))
  const isMidCourse = totalSessions > 1
  const sessionsToGenerate =
    form.direction === 'both'
      ? totalSessions
      : form.direction === 'backward'
        ? startDay
        : totalSessions - startDay + 1
  const sessionsToCreate = form.doubleSession ? Math.ceil(sessionsToGenerate / 2) : sessionsToGenerate
  const dayRangeLabel =
    form.direction === 'both'
      ? `Toàn Khóa: Day 1 ↔ Day ${totalSessions} (${sessionsToCreate} buổi${form.doubleSession ? ' kép 80p' : ''})`
      : form.direction === 'backward'
        ? `Day ${startDay} → Day 1 (${sessionsToCreate} buổi${form.doubleSession ? ' kép 80p' : ''})`
        : startDay === 1
          ? `Day 1 → Day ${totalSessions} (${sessionsToCreate} buổi${form.doubleSession ? ' kép 80p' : ''})`
          : `Day ${startDay} → Day ${totalSessions} (${sessionsToCreate} buổi${form.doubleSession ? ' kép 80p' : ''})`

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    if (bookingMode === 'existing') {
      if (!selectedEnrollmentId) {
        setErrorMessage('Vui lòng chọn học viên / khóa học cần bổ sung lịch.')
        return
      }

      router.post(
        enrollmentsPath(),
        {
          enrollment: {
            enrollment_id: Number(selectedEnrollmentId),
            sessions_to_add: Number(sessionsToAdd),
            duration_minutes: Number(form.durationMinutes),
            start_date: form.startDate,
            frequency_per_week: frequency,
            double_session: form.doubleSession,
            schedule_patterns: form.schedulePatterns.map(({ day, time }) => ({ day, time })),
            payment_status: form.paymentStatus,
            tuition_note:
              form.paymentReminderDays.length > 0
                ? `[Hẹn đóng: Day ${form.paymentReminderDays.sort((a, b) => a - b).join(', Day ')}] ${form.tuitionNote}`.trim()
                : form.tuitionNote,
            student_note: form.studentNote,
            aim: form.aim,
            baseline: form.baseline,
            exam_date: form.examDate,
          },
          ...redirectParams,
          teacher_id: Number(form.teacherId),
        },
        {
          onSuccess: () => onOpenChange(false),
          onError: (errors) => setErrorMessage(firstError(errors)),
        }
      )
      return
    }

    router.post(
      enrollmentsPath(),
      {
        enrollment: {
          teacher_id: Number(form.teacherId),
          sales_id: salesId,
          student_name: form.studentName,
          student_code: form.studentCode,
          course_name: `${form.courseName} - ${form.courseSkill}`,
          meet_link: form.meetLink,
          duration_minutes: Number(form.durationMinutes),
          start_date: form.startDate,
          total_sessions: Number(form.totalSessions),
          frequency_per_week: frequency,
          double_session: form.doubleSession,
          baseline: form.baseline,
          aim: form.aim,
          exam_date: form.examDate,
          student_note: form.studentNote,
          payment_status: form.paymentStatus,
          tuition_note:
            form.paymentReminderDays.length > 0
              ? `[Hẹn đóng: Day ${form.paymentReminderDays.sort((a, b) => a - b).join(', Day ')}] ${form.tuitionNote}`.trim()
              : form.tuitionNote,
          schedule_patterns: form.schedulePatterns.map(({ day, time }) => ({ day, time })),
          start_day_number: Number(form.startDayNumber),
          direction: form.direction,
        },
        ...redirectParams,
        teacher_id: Number(form.teacherId),
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (errors) => setErrorMessage(firstError(errors)),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-800">
            {bookingMode === 'new' ? (
              <>
                <Sparkles className="size-5 text-emerald-600" />
                <span>Sales Xếp Lớp Học Mới & Track Học Phí</span>
              </>
            ) : (
              <>
                <PlusCircle className="size-5 text-emerald-600" />
                <span>Bổ Sung Buổi Học Cho Học Viên Hiện Có</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Mode Selector */}
        <div className="flex rounded-2xl bg-slate-100 p-1 font-bold text-xs">
          <button
            type="button"
            onClick={() => setBookingMode('new')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all',
              bookingMode === 'new'
                ? 'bg-white text-emerald-800 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Sparkles className="size-4" />
            <span>Tạo Khóa Mới</span>
          </button>
          <button
            type="button"
            onClick={() => setBookingMode('existing')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all',
              bookingMode === 'existing'
                ? 'bg-white text-emerald-800 shadow-sm font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <UserCheck className="size-4" />
            <span>Bổ Sung Lịch Cho Học Viên Hiện Có</span>
          </button>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 rounded-xl"
          >
            {errorMessage}
          </p>
        )}

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {bookingMode === 'existing' ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3 shadow-inner">
                <div className="grid gap-1.5 text-xs font-bold text-slate-800">
                  <span>Chọn Học Viên & Khóa Học Cần Bổ Sung Lịch *</span>
                  <Select
                    value={selectedEnrollmentId}
                    onValueChange={handleSelectExisting}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="-- Chọn học viên đang học --" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrollments.map((enr) => (
                        <SelectItem key={enr.id} value={String(enr.id)}>
                          {enr.student.name} ({enr.student.code}) - {enr.courseName} • (Đang có {enr.existingSessionsCount ?? enr.totalSessions} buổi)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedEnrollment && (
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-emerald-200/60">
                    <div className="rounded-xl bg-white p-3 border border-emerald-100 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Học viên & Khóa</span>
                      <strong className="text-emerald-900 text-sm block">
                        {selectedEnrollment.student.name} ({selectedEnrollment.student.code})
                      </strong>
                      <p className="text-[11px] text-slate-600 font-semibold">{selectedEnrollment.courseName}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-emerald-100 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Tiến độ lộ trình hiện tại</span>
                      <strong className="text-emerald-800 text-sm block">
                        Đang có {existingDays} bài ({existingSessionsCount} ca học)
                      </strong>
                      <p className="text-[11px] text-emerald-700 font-bold">
                        👉 Bài thêm mới sẽ tự động đánh số từ: <span className="underline">Day {existingDays + 1}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selectedEnrollment && (
                <div className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-inner">
                  <div className="grid gap-1 text-sm font-semibold">
                    <span>Số bài lộ trình bổ sung (Day) *</span>
                    <Input
                      type="number"
                      min="1"
                      value={sessionsToAdd}
                      onChange={(e) => setSessionsToAdd(e.target.value)}
                      required
                      className="bg-white font-bold h-9"
                    />
                    <span className="text-[10px] text-slate-500 italic">
                      💡 Khóa sẽ thành {existingDays + (Number(sessionsToAdd) || 0)} bài lộ trình.
                      {form.doubleSession && Number(sessionsToAdd) > 0 && (
                        <span className="block text-indigo-700 font-bold not-italic">
                          ⚡ Dạy kép: Tạo đúng {Math.ceil(Number(sessionsToAdd) / 2)} ca trên lịch (chỉ cần tạo 1 lần).
                        </span>
                      )}
                    </span>
                  </div>

                  <TextField
                    label="Ngày bắt đầu bổ sung"
                    type="date"
                    value={form.startDate}
                    onChange={(startDate) => updateForm(setForm, { startDate })}
                    required
                  />

                  <div className="grid gap-1 text-sm font-semibold">
                    <span>Thời Lượng Ca (phút) *</span>
                    <div className="flex gap-1.5">
                      <Select
                        value={['20', '30', '40', '45', '50', '60', '70', '75', '80', '90', '100', '120'].includes(form.durationMinutes) ? form.durationMinutes : ''}
                        onValueChange={(val) => updateForm(setForm, { durationMinutes: val })}
                      >
                        <SelectTrigger aria-label="Thời lượng ca bổ sung" className="bg-white font-bold h-9 w-32">
                          <SelectValue placeholder="Chọn nhanh..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="20">20 phút</SelectItem>
                          <SelectItem value="30">30 phút</SelectItem>
                          <SelectItem value="40">40 phút (Chuẩn)</SelectItem>
                          <SelectItem value="45">45 phút</SelectItem>
                          <SelectItem value="50">50 phút (Writing 2 bài)</SelectItem>
                          <SelectItem value="60">60 phút (1 tiếng)</SelectItem>
                          <SelectItem value="70">70 phút</SelectItem>
                          <SelectItem value="75">75 phút</SelectItem>
                          <SelectItem value="80">80 phút (2 ca)</SelectItem>
                          <SelectItem value="90">90 phút (1.5 tiếng)</SelectItem>
                          <SelectItem value="100">100 phút</SelectItem>
                          <SelectItem value="120">120 phút (2 tiếng)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="10"
                        max="240"
                        value={form.durationMinutes}
                        onChange={(e) => updateForm(setForm, { durationMinutes: e.target.value })}
                        placeholder="Số phút..."
                        className="bg-white h-9 flex-1 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Giáo Viên"
                requiredMarker
                value={form.teacherId}
                onChange={(teacherId) => updateForm(setForm, { teacherId })}
              >
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={String(teacher.id)}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectField>
              <div className="grid gap-1 text-sm font-semibold">
                <span>Thời Lượng Ca (phút) *</span>
                <div className="flex gap-1.5">
                  <Select
                    value={['20', '30', '40', '45', '50', '60', '70', '75', '80', '90', '100', '120'].includes(form.durationMinutes) ? form.durationMinutes : ''}
                    onValueChange={(val) => updateForm(setForm, { durationMinutes: val })}
                  >
                    <SelectTrigger aria-label="Thời lượng ca" className="bg-white font-bold h-9 w-36">
                      <SelectValue placeholder="Chọn nhanh..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 phút</SelectItem>
                      <SelectItem value="30">30 phút</SelectItem>
                      <SelectItem value="40">40 phút (Chuẩn)</SelectItem>
                      <SelectItem value="45">45 phút</SelectItem>
                      <SelectItem value="50">50 phút (Writing 2 bài)</SelectItem>
                      <SelectItem value="60">60 phút (1 tiếng)</SelectItem>
                      <SelectItem value="70">70 phút</SelectItem>
                      <SelectItem value="75">75 phút</SelectItem>
                      <SelectItem value="80">80 phút (2 ca)</SelectItem>
                      <SelectItem value="90">90 phút (1.5 tiếng)</SelectItem>
                      <SelectItem value="100">100 phút</SelectItem>
                      <SelectItem value="120">120 phút (2 tiếng)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="10"
                    max="240"
                    value={form.durationMinutes}
                    onChange={(e) => updateForm(setForm, { durationMinutes: e.target.value })}
                    placeholder="Số phút..."
                    className="bg-white h-9 flex-1 text-xs font-bold"
                  />
                </div>
              </div>
              {/* Quick selector to create next course for existing student */}
              {enrollments.length > 0 && (
                <div className="col-span-full rounded-xl bg-slate-100/90 p-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    💡 Tạo khóa tiếp theo cho HV cũ (VD: Speaking Foundation ➔ Intermediate):
                  </span>
                  <Select
                    onValueChange={(enrId) => {
                      const enr = enrollments.find((e) => String(e.id) === enrId)
                      if (enr) {
                        updateForm(setForm, {
                          studentName: enr.student.name,
                          studentCode: enr.student.code,
                          baseline: enr.student.baseline ?? '',
                          aim: enr.student.aim ?? '',
                          examDate: enr.student.examDate ?? '',
                          studentNote: enr.student.studentNote ?? '',
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-64 bg-white text-xs font-semibold">
                      <SelectValue placeholder="-- Chọn học viên có sẵn --" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Map(enrollments.map((e) => [e.student.code, e])).values()).map((enr) => (
                        <SelectItem key={enr.id} value={String(enr.id)}>
                          {enr.student.name} ({enr.student.code}) - {enr.courseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <TextField
                label="Tên Học Viên"
                requiredMarker
                value={form.studentName}
                onChange={(studentName) => updateForm(setForm, { studentName })}
                required
              />
              <TextField
                label="Mã HV"
                requiredMarker
                value={form.studentCode}
                onChange={(studentCode) => updateForm(setForm, { studentCode })}
                required
              />
              <div className="space-y-1">
                <SelectField
                  label="Khóa Học"
                  requiredMarker
                  value={['Speaking Foundation', 'Speaking Intermediate', 'Speaking Advanced', 'Writing Foundation', 'Writing Intermediate', 'Writing Advanced', 'SF1', 'SF2', 'SF3', 'S1', 'S1 - 6 buổi', 'S2', 'S3', 'W1', 'W2', 'W3'].includes(form.courseName) ? form.courseName : 'custom'}
                  onChange={(val) => {
                    const courseName = val === 'custom' ? '' : val
                    const isWriting = courseName.includes('Writing') || courseName.startsWith('W') || form.courseSkill === 'Writing'
                    updateForm(setForm, {
                      courseName,
                      ...(isWriting ? { doubleSession: true, durationMinutes: form.durationMinutes === '40' ? '50' : form.durationMinutes } : {}),
                    })
                  }}
                >
                  <SelectItem value="Speaking Foundation">Speaking Foundation</SelectItem>
                  <SelectItem value="Speaking Intermediate">Speaking Intermediate</SelectItem>
                  <SelectItem value="Speaking Advanced">Speaking Advanced</SelectItem>
                  <SelectItem value="Writing Foundation">Writing Foundation</SelectItem>
                  <SelectItem value="Writing Intermediate">Writing Intermediate</SelectItem>
                  <SelectItem value="Writing Advanced">Writing Advanced</SelectItem>
                  <SelectItem value="SF1">SF1</SelectItem>
                  <SelectItem value="SF2">SF2</SelectItem>
                  <SelectItem value="SF3">SF3</SelectItem>
                  <SelectItem value="S1">S1</SelectItem>
                  <SelectItem value="S1 - 6 buổi">S1 - 6 buổi</SelectItem>
                  <SelectItem value="S2">S2</SelectItem>
                  <SelectItem value="S3">S3</SelectItem>
                  <SelectItem value="W1">W1</SelectItem>
                  <SelectItem value="W2">W2</SelectItem>
                  <SelectItem value="W3">W3</SelectItem>
                  <SelectItem value="custom">✏️ Khóa học khác (tự nhập)...</SelectItem>
                </SelectField>

                {!['Speaking Foundation', 'Speaking Intermediate', 'Speaking Advanced', 'Writing Foundation', 'Writing Intermediate', 'Writing Advanced', 'SF1', 'SF2', 'SF3', 'S1', 'S1 - 6 buổi', 'S2', 'S3', 'W1', 'W2', 'W3'].includes(form.courseName) && (
                  <Input
                    placeholder="Nhập tên khóa học tùy chỉnh..."
                    value={form.courseName}
                    onChange={(e) => updateForm(setForm, { courseName: e.target.value })}
                    className="h-8 text-xs font-bold bg-white mt-1 border-emerald-300"
                    required
                  />
                )}
              </div>
              <SelectField
                label="Skills"
                requiredMarker
                value={form.courseSkill}
                onChange={(courseSkill) => {
                  const isWriting = courseSkill === 'Writing'
                  updateForm(setForm, {
                    courseSkill,
                    ...(isWriting ? { doubleSession: true, durationMinutes: form.durationMinutes === '40' ? '50' : form.durationMinutes } : {}),
                  })
                }}
              >
                {['Speaking', 'Writing'].map((skill) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectField>
            </div>
          )}

          {/* Option Học Kép (Double Session - 2 bài / buổi) */}
          {(bookingMode === 'new' || selectedEnrollment) && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                    ⚡ Buổi Dạy Kép (Học 2 bài lộ trình / 1 ca - VD: Day 1 & 2, Day 3 & 4)
                  </span>
                  <span className="text-[10px] font-extrabold bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full">
                    Writing & Tùy Chỉnh
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.doubleSession}
                  onChange={(e) => {
                    const checked = e.target.checked
                    updateForm(setForm, {
                      doubleSession: checked,
                      durationMinutes: checked && form.durationMinutes === '40' ? '50' : form.durationMinutes,
                    })
                  }}
                  className="size-4.5 rounded border-indigo-300 text-indigo-700 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                1 ca dạy trên lịch học nội dung 2 bài lộ trình (hiển thị cho GV dạng <strong>{form.studentName ? `${form.studentName} - Day 1 & 2` : 'Day 1 & 2'}</strong>, <strong>Day 3 & 4</strong>...). Bạn chỉ cần tạo ca 1 lần, hệ thống sẽ tự động tạo đúng số ca thực tế trên lịch và tính tiến độ theo lộ trình bài học.
              </p>
            </div>
          )}

          {/* Tần suất & Khung lịch áp dụng cho cả 2 mode */}
          {(bookingMode === 'new' || selectedEnrollment) && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-inner">
                <div className="mb-2 text-[11px] font-bold uppercase text-slate-700">
                  Tần Suất Ca / Tuần
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {[1, 2].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        updateForm(setForm, {
                          frequencyPerWeek: String(count),
                          schedulePatterns: resizePatterns(form.schedulePatterns, count, timeIntervals),
                        })
                      }}
                      className={`rounded-xl py-2 text-xs font-bold transition ${
                        frequency === count
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {count} Ca/Tuần
                    </button>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {form.schedulePatterns.slice(0, frequency).map((pattern, index) => (
                    <div
                      key={pattern.id}
                      className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3"
                    >
                      <SelectField
                        label={`Ca ${index + 1} Thứ`}
                        value={pattern.day}
                        onChange={(day) => updatePattern(setForm, index, { day })}
                      >
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectField>
                      <SelectField
                        label={`Ca ${index + 1} Giờ`}
                        value={pattern.time}
                        onChange={(time) => updatePattern(setForm, index, { time })}
                      >
                        {timeIntervals.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectField>
                    </div>
                  ))}
                </div>
              </div>

              {bookingMode === 'new' && (
                <>
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-inner sm:grid-cols-2">
                    <TextField
                      label="Ngày Nhập Lịch (ngày của Day đã chọn)"
                      type="date"
                      value={form.startDate}
                      onChange={(startDate) => updateForm(setForm, { startDate })}
                      required
                    />
                    <div className="grid gap-1 text-sm font-semibold">
                      <span>Tổng Số Bài / Buổi Lộ Trình (Day) *</span>
                      <Input
                        type="number"
                        min="1"
                        value={form.totalSessions}
                        onChange={(e) =>
                          updateForm(setForm, {
                            totalSessions: e.target.value,
                            startDayNumber: '1',
                            direction: 'forward',
                          })
                        }
                        required
                        className="bg-white font-bold h-9"
                      />
                      {form.doubleSession && totalSessions > 0 && (
                        <span className="text-[11px] text-indigo-700 font-bold block">
                          ⚡ Dạy kép (2 bài/ca): Nhập {totalSessions} bài -&gt; Sẽ tạo {Math.ceil(totalSessions / 2)} ca học trên lịch (Day 1 &amp; 2, Day 3 &amp; 4...).
                        </span>
                      )}
                    </div>
                  </div>

                  {isMidCourse && (
                    <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-3.5 shadow-inner">
                      <div className="text-[11px] font-extrabold uppercase text-violet-800">
                        📅 Cài Đặt Mid-Course
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <SelectField
                          label="Ngày nhập lịch là Day thứ mấy?"
                          value={form.startDayNumber}
                          onChange={(startDayNumber) => updateForm(setForm, { startDayNumber })}
                        >
                          {Array.from({ length: totalSessions }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              Day {n}
                            </SelectItem>
                          ))}
                        </SelectField>

                        <div className="grid gap-1 text-sm font-semibold">
                          Hướng tạo lịch
                          <div className="grid grid-cols-3 gap-2">
                            {(['forward', 'backward', 'both'] as const).map((dir) => (
                              <button
                                key={dir}
                                type="button"
                                onClick={() => updateForm(setForm, { direction: dir })}
                                className={`rounded-xl py-2 text-[10px] font-bold transition ${
                                  form.direction === dir
                                    ? 'bg-violet-700 text-white shadow-sm'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {dir === 'forward' ? '▶ Tới Day N' : dir === 'backward' ? '◀ Về Day 1' : '◀ Cả 2 chiều ▶'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-900">
                        <span>✨ Sẽ tạo:</span>
                        <span className="font-extrabold">{dayRangeLabel}</span>
                        {startDay !== 1 && form.direction === 'forward' && (
                          <span className="ml-auto text-[10px] font-medium text-slate-500">
                            (Day 1–{startDay - 1} tạo riêng/đã có)
                          </span>
                        )}
                        {startDay !== totalSessions && form.direction === 'backward' && (
                          <span className="ml-auto text-[10px] font-medium text-slate-500">
                            (Day {startDay + 1}–{totalSessions} tạo riêng/đã có)
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Preview cho existing mode */}
              {bookingMode === 'existing' && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold">✨ Kết quả bổ sung:</span>
                    <span>
                      Sẽ tạo thêm <strong>{form.doubleSession ? Math.ceil(Number(sessionsToAdd || 0) / 2) : Number(sessionsToAdd || 0)} ca học ({form.durationMinutes}p)</strong>{' '}
                      {form.doubleSession ? (
                        <>
                          (dạy các bài <strong>Day {existingDays + 1} &amp; {existingDays + 2}</strong> đến <strong>Day {existingDays + Number(sessionsToAdd || 0) - 1} &amp; {existingDays + Number(sessionsToAdd || 0)}</strong>)
                        </>
                      ) : (
                        <>
                          (từ <strong>Day {existingDays + 1}</strong> đến <strong>Day {existingDays + Number(sessionsToAdd || 0)}</strong>)
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Tổng số bài lộ trình của khóa học sẽ tự động cập nhật từ <strong>{existingDays}</strong> lên <strong>{existingDays + Number(sessionsToAdd || 0)}</strong> bài.
                  </p>
                </div>
              )}

              {/* Thông tin học phí & note */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 shadow-inner">
                <div className="mb-2 text-[11px] font-extrabold uppercase text-emerald-800">
                  💰 Thông tin Học phí
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <SelectField
                    label="Trạng thái đóng tiền"
                    value={form.paymentStatus}
                    onChange={(paymentStatus) => updateForm(setForm, { paymentStatus })}
                  >
                    {['Đã đóng Full', 'Đã đóng Đợt 1', 'Đã đóng Đợt 2', 'Chưa đóng'].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectField>
                  <div className="grid gap-1 text-sm font-semibold">
                    <span className="truncate">Hẹn đóng (Ngày/Day)</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-9 w-full justify-start rounded-md border border-input bg-white px-3 py-2 text-left text-sm font-normal shadow-sm"
                        >
                          {form.paymentReminderDays.length > 0
                            ? `Đã chọn ${form.paymentReminderDays.length} ngày`
                            : 'Chọn ngày hẹn...'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-60 w-56 overflow-y-auto">
                        {Array.from(
                          { length: bookingMode === 'existing' ? existingDays + Number(sessionsToAdd || 0) : totalSessions },
                          (_, i) => i + 1
                        ).map((dayNumber) => {
                          const checked = form.paymentReminderDays.includes(dayNumber)
                          return (
                            <DropdownMenuCheckboxItem
                              key={dayNumber}
                              checked={checked}
                              onCheckedChange={(c) => {
                                const next = c
                                  ? [...form.paymentReminderDays, dayNumber]
                                  : form.paymentReminderDays.filter((d) => d !== dayNumber)
                                updateForm(setForm, { paymentReminderDays: next })
                              }}
                            >
                              Day {dayNumber}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <TextField
                    label="Ghi chú thêm"
                    value={form.tuitionNote}
                    onChange={(tuitionNote) => updateForm(setForm, { tuitionNote })}
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-inner sm:grid-cols-3">
                <div className="grid gap-1 text-sm font-semibold">
                  <span>Đầu vào (Baseline)</span>
                  <div className="flex gap-1.5">
                    <Select
                      value={['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'].includes(form.baseline) ? form.baseline : ''}
                      onValueChange={(val) => updateForm(setForm, { baseline: val })}
                    >
                      <SelectTrigger aria-label="Band đầu vào" className="bg-white font-bold h-9 w-28">
                        <SelectValue placeholder="Band..." />
                      </SelectTrigger>
                      <SelectContent>
                        {['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'].map((band) => (
                          <SelectItem key={band} value={band}>Band {band}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={form.baseline}
                      onChange={(e) => updateForm(setForm, { baseline: e.target.value })}
                      placeholder="hoặc tự nhập..."
                      className="bg-white h-9 flex-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-1 text-sm font-semibold">
                  <span>Aim (Target)</span>
                  <div className="flex gap-1.5">
                    <Select
                      value={['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'].includes(form.aim) ? form.aim : ''}
                      onValueChange={(val) => updateForm(setForm, { aim: val })}
                    >
                      <SelectTrigger aria-label="Band mục tiêu" className="bg-white font-bold h-9 w-28">
                        <SelectValue placeholder="Band..." />
                      </SelectTrigger>
                      <SelectContent>
                        {['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'].map((band) => (
                          <SelectItem key={band} value={band}>Band {band}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={form.aim}
                      onChange={(e) => updateForm(setForm, { aim: e.target.value })}
                      placeholder="hoặc tự nhập..."
                      className="bg-white h-9 flex-1 text-xs font-bold text-emerald-800"
                    />
                  </div>
                </div>

                <TextField
                  label="Ngày thi"
                  type="date"
                  value={form.examDate}
                  onChange={(examDate) => updateForm(setForm, { examDate })}
                />
              </div>

              <div className="grid gap-1 text-sm font-semibold">
                Note từ Sales (Cho GV xem)
                <Textarea
                  aria-label="Note từ Sales (Cho GV xem)"
                  value={form.studentNote}
                  onChange={(event) => updateForm(setForm, { studentNote: event.target.value })}
                />
              </div>

              {bookingMode === 'new' && (
                <TextField
                  label="Link Google Meet Thật"
                  requiredMarker
                  type="url"
                  value={form.meetLink}
                  onChange={(meetLink) => updateForm(setForm, { meetLink })}
                  required
                />
              )}
            </>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold">
              <Save data-icon />
              {bookingMode === 'existing' ? 'Xác Nhận Bổ Sung Buổi Học' : 'Xác Nhận Xếp Lớp'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function initialForm(
  selectedTeacherId: number,
  timeIntervals: string[],
  redirectParams: SchedulerMutationRedirectParams,
  prefill?: { dayName: string; time: string; date: string } | null
): BookingForm {
  const monthKey = String(redirectParams.month_key)
  const firstTime = timeIntervals[0] ?? '07:00'

  return {
    teacherId: String(selectedTeacherId),
    studentName: '',
    studentCode: '',
    courseName: 'S3',
    courseSkill: 'Speaking',
    meetLink: 'https://meet.google.com/new',
    durationMinutes: '40',
    startDate: prefill?.date || `${monthKey}-01`,
    totalSessions: '1',
    frequencyPerWeek: '1',
    baseline: '',
    aim: '',
    examDate: '',
    studentNote: '',
    paymentStatus: 'Đã đóng Full',
    tuitionNote: '',
    schedulePatterns: [{ id: 'schedule-1', day: prefill?.dayName || DAYS[0], time: prefill?.time || firstTime }],
    startDayNumber: '1',
    direction: 'forward' as const,
    paymentReminderDays: [],
    doubleSession: false,
  }
}

function resizePatterns(patterns: SchedulePattern[], frequency: number, timeIntervals: string[]) {
  const next = patterns.slice(0, frequency)
  const firstTime = timeIntervals[0] ?? '07:00'

  while (next.length < frequency) {
    next.push({ id: `schedule-${next.length + 1}`, day: DAYS[next.length], time: firstTime })
  }

  return next
}

function updateForm(setForm: Dispatch<SetStateAction<BookingForm>>, values: Partial<BookingForm>) {
  setForm((current) => ({ ...current, ...values }))
}

function updatePattern(
  setForm: Dispatch<SetStateAction<BookingForm>>,
  index: number,
  values: Partial<SchedulePattern>
) {
  setForm((current) => ({
    ...current,
    schedulePatterns: current.schedulePatterns.map((pattern, patternIndex) =>
      patternIndex === index ? { ...pattern, ...values } : pattern
    ),
  }))
}

function firstError(errors: Record<string, string[]>) {
  return (
    Object.values(errors)
      .flat()
      .find((message) => message.length > 0) ?? 'Không thể xếp lịch học.'
  )
}

function TextField({
  label,
  requiredMarker = false,
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, 'onChange'> & {
  label: string
  requiredMarker?: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-1 text-sm font-semibold">
      {label}
      {requiredMarker && ' *'}
      <Input {...props} aria-label={label} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function SelectField({
  label,
  requiredMarker = false,
  value,
  onChange,
  children,
}: {
  label: string
  requiredMarker?: boolean
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="grid gap-1 text-sm font-semibold">
      {label}
      {requiredMarker && ' *'}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}
