import { router } from '@inertiajs/react'
import { AlertTriangle, Loader2, Save, User, X } from 'lucide-react'
import { type FormEvent, type ReactElement, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { SchedulerMutationRedirectParams } from '../types'

export type EditStudentTarget = {
  studentId?: number
  enrollmentId?: number
  studentName?: string
  studentCode?: string
  name?: string
  code?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: EditStudentTarget | null
  redirectParams: SchedulerMutationRedirectParams
  onSuccess?: () => void
}

export function EditStudentDialog({
  open,
  onOpenChange,
  student,
  redirectParams,
  onSuccess,
}: Props): ReactElement {
  const initialName = student?.studentName || student?.name || ''
  const initialCode = student?.studentCode || student?.code || ''

  const [name, setName] = useState(initialName)
  const [code, setCode] = useState(initialCode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (student) {
      setName(student.studentName || student.name || '')
      setCode(student.studentCode || student.code || '')
      setErrorMessage(null)
    }
  }, [student])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanName = name.trim()
    const cleanCode = code.trim()

    if (!cleanName) {
      setErrorMessage('Vui lòng nhập tên học viên.')
      return
    }

    if (!cleanCode) {
      setErrorMessage('Vui lòng nhập mã học viên.')
      return
    }

    setIsSubmitting(true)

    const targetUrl = student?.studentId
      ? `/students/${student.studentId}`
      : student?.enrollmentId
        ? `/enrollments/${student.enrollmentId}`
        : null

    if (!targetUrl) {
      setIsSubmitting(false)
      setErrorMessage('Không tìm thấy thông tin định danh học viên.')
      return
    }

    const payload = student?.studentId
      ? {
          student: {
            name: cleanName,
            code: cleanCode,
          },
          ...redirectParams,
        }
      : {
          enrollment: {
            student_name: cleanName,
            student_code: cleanCode,
          },
          ...redirectParams,
        }

    router.patch(targetUrl, payload, {
      preserveScroll: true,
      onSuccess: () => {
        setIsSubmitting(false)
        onOpenChange(false)
        onSuccess?.()
      },
      onError: (errors) => {
        setIsSubmitting(false)
        const firstError = Object.values(errors).flat()[0]
        setErrorMessage(firstError ? String(firstError) : 'Có lỗi xảy ra khi cập nhật học viên.')
      },
      onFinish: () => {
        setIsSubmitting(false)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 rounded-2xl border border-slate-200 shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-5 text-white">
          <DialogTitle className="text-base font-black text-white flex items-center gap-2">
            <User className="size-5 text-emerald-200" />
            <span>Sửa Tên & Mã Học Viên</span>
          </DialogTitle>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            Dành cho phân quyền <strong>Sales</strong> và <strong>CS</strong>
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2 border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 rounded-xl"
            >
              <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            {/* Tên học viên */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Tên học viên *</span>
                <span className="text-[10px] text-slate-400 font-normal">Họ và tên</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="bg-white font-bold h-9 text-xs"
                required
                autoFocus
              />
            </div>

            {/* Mã học viên */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Mã học viên *</span>
                <span className="text-[10px] text-slate-400 font-normal">Duy nhất trên hệ thống</span>
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: HV123"
                className="bg-white font-mono font-bold h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Hint info */}
          <div className="text-[11px] text-slate-500 bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 leading-relaxed">
            💡 Khi bạn thay đổi <strong>Tên</strong> hoặc <strong>Mã học viên</strong>, toàn bộ các khóa học và lịch học liên quan sẽ được tự động đồng bộ.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 text-xs font-bold text-slate-600"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
