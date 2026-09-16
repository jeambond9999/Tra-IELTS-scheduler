import { router } from '@inertiajs/react'
import { Calendar, CreditCard, GraduationCap, Save, Sparkles, Target, Trash2 } from 'lucide-react'
import { type ReactElement, useEffect, useState } from 'react'
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
import type { Enrollment, SchedulerMutationRedirectParams } from '../types'

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

type EditForm = {
  studentName: string
  studentCode: string
  courseName: string
  courseSkill: string
  totalSessions: string
  paymentStatus: string
  paymentReminderDays: number[]
  tuitionNoteExtra: string
  baseline: string
  aim: string
  examDate: string
  studentNote: string
}

export function EditEnrollmentDialog({
  enrollment,
  open,
  onOpenChange,
  redirectParams,
}: {
  enrollment: Enrollment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectParams: SchedulerMutationRedirectParams
}): ReactElement {
  const [form, setForm] = useState<EditForm>({
    studentName: '',
    studentCode: '',
    courseName: 'S3',
    courseSkill: 'Speaking',
    totalSessions: '8',
    paymentStatus: 'Đã đóng Full',
    paymentReminderDays: [],
    tuitionNoteExtra: '',
    baseline: '',
    aim: '',
    examDate: '',
    studentNote: '',
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (enrollment) {
      setDeleteConfirm(false)
      let cName = enrollment.courseName
      let cSkill = 'Speaking'
      if (cName.includes(' - ')) {
        const parts = cName.split(' - ')
        cName = parts[0]
        cSkill = parts.slice(1).join(' - ')
      }

      const { reminderDays, extraNote } = parseTuitionNote(enrollment.tuitionNote)

      setForm({
        studentName: enrollment.student?.name ?? '',
        studentCode: enrollment.student?.code ?? '',
        courseName: cName,
        courseSkill: cSkill || 'Speaking',
        totalSessions: enrollment.totalSessions.toString(),
        paymentStatus: enrollment.paymentStatus || 'Đã đóng Full',
        paymentReminderDays: reminderDays,
        tuitionNoteExtra: extraNote,
        baseline: enrollment.student.baseline ?? '',
        aim: enrollment.student.aim ?? '',
        examDate: enrollment.student.examDate ?? '',
        studentNote: enrollment.student.studentNote ?? '',
      })
      setErrorMessage(null)
    }
  }, [enrollment])

  if (!enrollment) {
    return <Dialog open={open} onOpenChange={onOpenChange} />
  }

  const totalSessionsNum = Number(form.totalSessions) || enrollment.totalSessions || 1

  const handleDeleteEnrollment = () => {
    router.delete(`/enrollments/${enrollment.id}`, {
      data: redirectParams,
      onSuccess: () => onOpenChange(false),
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)

    const fullTuitionNote = formatTuitionNote(form.paymentReminderDays, form.tuitionNoteExtra)

    router.patch(
      `/enrollments/${enrollment.id}`,
      {
        enrollment: {
          student_name: form.studentName.trim(),
          student_code: form.studentCode.trim(),
          course_name: form.courseSkill
            ? `${form.courseName} - ${form.courseSkill}`
            : form.courseName,
          total_sessions: Number(form.totalSessions),
          payment_status: form.paymentStatus,
          tuition_note: fullTuitionNote,
          baseline: form.baseline,
          aim: form.aim,
          exam_date: form.examDate,
          student_note: form.studentNote,
        },
        ...redirectParams,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (errors) => setErrorMessage(firstError(errors)),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl p-0 gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-5 text-white">
          <DialogTitle className="text-base font-black text-white flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-200" />
            <span>Sửa Thông Tin Khóa Học & Học Viên</span>
          </DialogTitle>
          <p className="text-xs font-semibold text-emerald-100 mt-1">
            Học viên: <strong className="text-white">{enrollment.student.name}</strong> ({enrollment.student.code})
          </p>
        </div>

        {/* Body */}
        <form className="p-5 space-y-4 text-xs" onSubmit={handleSubmit}>
          {errorMessage && (
            <p
              role="alert"
              className="border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 rounded-xl"
            >
              {errorMessage}
            </p>
          )}

          {/* Thông tin học viên (Tên & Mã HV) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-inner">
            <div className="grid gap-1 font-bold text-slate-700">
              <span>Tên học viên *</span>
              <Input
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                required
                placeholder="VD: Nguyễn Văn A"
                className="bg-white font-bold h-9"
              />
            </div>
            <div className="grid gap-1 font-bold text-slate-700">
              <span>Mã học viên *</span>
              <Input
                value={form.studentCode}
                onChange={(e) => setForm({ ...form, studentCode: e.target.value })}
                required
                placeholder="VD: HV123"
                className="bg-white font-mono font-bold h-9"
              />
            </div>
          </div>

          {/* Khóa học & Tổng số buổi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-inner">
            <div className="grid gap-1 font-bold text-slate-700">
              <span>Khóa Học & Skills *</span>
              <div className="flex gap-2">
                <Select
                  value={COURSES.includes(form.courseName) ? form.courseName : 'custom'}
                  onValueChange={(val) => setForm({ ...form, courseName: val === 'custom' ? '' : val })}
                  required
                >
                  <SelectTrigger aria-label="Chọn khóa học" className="bg-white font-bold h-9">
                    <SelectValue placeholder="Khóa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">✏️ Khóa học khác (tự nhập)...</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={form.courseSkill}
                  onValueChange={(val) => setForm({ ...form, courseSkill: val })}
                >
                  <SelectTrigger aria-label="Skills" className="bg-white font-bold h-9">
                    <SelectValue placeholder="Skills..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILLS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!COURSES.includes(form.courseName) && (
                <Input
                  placeholder="Nhập tên khóa học tùy chỉnh..."
                  value={form.courseName}
                  onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                  className="h-8 text-xs font-bold bg-white mt-1 border-emerald-300"
                  required
                />
              )}
            </div>

            <div className="grid gap-1 font-bold text-slate-700">
              <span>Tổng Số Buổi Khóa Này *</span>
              <Input
                type="number"
                min="1"
                value={form.totalSessions}
                onChange={(e) => setForm({ ...form, totalSessions: e.target.value })}
                required
                className="bg-white font-bold h-9"
              />
            </div>
          </div>

          {/* Thông tin học phí */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-3 shadow-inner">
            <div className="text-[11px] font-extrabold uppercase text-emerald-900 flex items-center gap-1.5">
              <CreditCard className="size-4 text-emerald-700" />
              <span>Thông tin Học phí & Đóng tiền</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Trạng thái đóng tiền dropdown */}
              <div className="grid gap-1 font-bold text-slate-700">
                <span>Trạng thái đóng tiền</span>
                <Select
                  value={form.paymentStatus}
                  onValueChange={(val) => setForm({ ...form, paymentStatus: val })}
                >
                  <SelectTrigger aria-label="Trạng thái đóng tiền" className="bg-white font-bold h-9">
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

              {/* Hẹn đóng Ngày/Day Checklist */}
              <div className="grid gap-1 font-bold text-slate-700">
                <span className="truncate">Hẹn đóng (Ngày/Day)</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 w-full justify-start rounded-md border border-input bg-white px-3 py-2 text-left text-xs font-semibold shadow-sm"
                    >
                      {form.paymentReminderDays.length > 0
                        ? `Đã chọn ${form.paymentReminderDays.length} ngày (Day ${form.paymentReminderDays.sort((a, b) => a - b).join(', ')})`
                        : 'Chọn ngày hẹn...'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="max-h-60 w-56 overflow-y-auto">
                    {Array.from({ length: totalSessionsNum }, (_, i) => i + 1).map((dayNumber) => {
                      const checked = form.paymentReminderDays.includes(dayNumber)
                      return (
                        <DropdownMenuCheckboxItem
                          key={dayNumber}
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c
                              ? [...form.paymentReminderDays, dayNumber]
                              : form.paymentReminderDays.filter((d) => d !== dayNumber)
                            setForm({ ...form, paymentReminderDays: next })
                          }}
                        >
                          Day {dayNumber}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Ghi chú thêm học phí */}
              <div className="grid gap-1 font-bold text-slate-700">
                <span>Ghi chú thêm học phí</span>
                <Input
                  value={form.tuitionNoteExtra}
                  onChange={(e) => setForm({ ...form, tuitionNoteExtra: e.target.value })}
                  placeholder="VD: Bổ sung 3tr..."
                  className="bg-white h-9"
                />
              </div>
            </div>
          </div>

          {/* Baseline, Aim, Exam Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 shadow-inner">
            {/* Baseline */}
            <div className="grid gap-1 font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <GraduationCap className="size-3.5 text-slate-500" /> Đầu vào (Baseline)
              </span>
              <div className="flex gap-1.5">
                <Select
                  value={IELTS_BANDS.includes(form.baseline) ? form.baseline : ''}
                  onValueChange={(val) => setForm({ ...form, baseline: val })}
                >
                  <SelectTrigger aria-label="Band đầu vào" className="bg-white font-bold h-9 w-28">
                    <SelectValue placeholder="Band..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IELTS_BANDS.map((band) => (
                      <SelectItem key={band} value={band}>
                        Band {band}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={form.baseline}
                  onChange={(e) => setForm({ ...form, baseline: e.target.value })}
                  placeholder="hoặc tự nhập..."
                  className="bg-white h-9 flex-1 text-xs"
                />
              </div>
            </div>

            {/* Aim */}
            <div className="grid gap-1 font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Target className="size-3.5 text-emerald-600" /> Aim (Target)
              </span>
              <div className="flex gap-1.5">
                <Select
                  value={IELTS_BANDS.includes(form.aim) ? form.aim : ''}
                  onValueChange={(val) => setForm({ ...form, aim: val })}
                >
                  <SelectTrigger aria-label="Band mục tiêu" className="bg-white font-bold h-9 w-28">
                    <SelectValue placeholder="Band..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IELTS_BANDS.map((band) => (
                      <SelectItem key={band} value={band}>
                        Band {band}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={form.aim}
                  onChange={(e) => setForm({ ...form, aim: e.target.value })}
                  placeholder="hoặc tự nhập..."
                  className="bg-white h-9 flex-1 text-xs font-bold text-emerald-800"
                />
              </div>
            </div>

            {/* Exam Date */}
            <div className="grid gap-1 font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-slate-500" /> Ngày Thi (Dự kiến)
              </span>
              <Input
                type="date"
                value={form.examDate}
                onChange={(e) => setForm({ ...form, examDate: e.target.value })}
                className="bg-white h-9 font-semibold"
              />
            </div>
          </div>

          {/* Student Note */}
          <div className="grid gap-1 font-bold text-slate-700">
            <span>📌 Note từ Sales (Cho GV xem)</span>
            <Textarea
              className="resize-none bg-slate-50 focus:bg-white"
              rows={2}
              placeholder="Ghi chú về học viên, phong cách học, lưu ý đặc biệt..."
              value={form.studentNote}
              onChange={(e) => setForm({ ...form, studentNote: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
            <div>
              {!deleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteConfirm(true)}
                  className="gap-1 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold h-9"
                >
                  <Trash2 className="size-3.5" /> Xóa Toàn Bộ Khóa ({enrollment.totalSessions} buổi)
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-1.5 text-xs">
                  <span className="font-bold text-rose-800 text-[11px]">Xóa hết tất cả {enrollment.totalSessions} buổi?</span>
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
                    onClick={handleDeleteEnrollment}
                    className="h-7 rounded-lg bg-rose-600 px-2.5 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    Xác nhận xóa
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                Hủy
              </Button>
              <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-9 px-4">
                <Save data-icon /> Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </form>
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

