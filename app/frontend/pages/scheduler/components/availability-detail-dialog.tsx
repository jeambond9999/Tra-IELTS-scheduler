import { router } from '@inertiajs/react'
import { AlertTriangle, Lock, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { type ReactElement, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { teacherAvailabilityPath } from '@/lib/routes'
import type { SchedulerMutationRedirectParams, TeacherAvailability } from '../types'

export function AvailabilityDetailDialog({
  availability,
  open,
  onOpenChange,
  redirectParams,
  quotaCount,
  maxQuota = 2,
  isUnlimited = true,
  role = 'teacher',
  onDeleteSuccess,
  onOpenEditDialog,
}: {
  availability: TeacherAvailability | null
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectParams: SchedulerMutationRedirectParams
  quotaCount?: number
  maxQuota?: number
  isUnlimited?: boolean
  role?: string
  onDeleteSuccess?: () => void
  onOpenEditDialog?: () => void
}): ReactElement {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isQuotaControlled = !isUnlimited && quotaCount !== undefined
  const isQuotaExceeded = isQuotaControlled && quotaCount >= maxQuota

  if (!availability) {
    return <Dialog open={open} onOpenChange={onOpenChange} />
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setErrorMessage(null)
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-black text-slate-900">Chi tiết ca rảnh</DialogTitle>
            {isUnlimited ? (
              <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black border ${
                role === 'sales'
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300'
              }`}>
                <Sparkles className={`size-3 ${role === 'sales' ? 'text-amber-600' : 'text-emerald-600'}`} />
                {role === 'sales' ? '👑 Quyền Sales: Không giới hạn' : '✨ Không giới hạn'}
              </span>
            ) : isQuotaControlled ? (
              <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black border ${
                isQuotaExceeded
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : quotaCount === 1
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {isQuotaExceeded ? (
                  <>
                    <Lock className="size-3" /> Đã dùng 2/2 lần sửa
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-3" /> Còn {maxQuota - quotaCount}/{maxQuota} lần sửa
                  </>
                )}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {availability.availableOn} · {availability.startTime} - {availability.endTime}
          </p>
        </DialogHeader>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800"
          >
            {errorMessage}
          </p>
        )}

        <div className="grid gap-3 border-y border-slate-100 py-3 text-sm sm:grid-cols-2">
          <Detail label="Ngày" value={availability.availableOn} />
          <Detail label="Giờ" value={`${availability.startTime} - ${availability.endTime}`} />
          <Detail label="Thời lượng" value={`${availability.durationMinutes} phút`} />
          <Detail label="Trạng thái" value="Đang mở (chưa có HV)" />
        </div>

        {/* Quota notices */}
        {isUnlimited ? (
          <div className={`rounded-2xl border p-3 text-xs flex items-start gap-2 shadow-2xs ${
            role === 'sales'
              ? 'border-amber-200 bg-amber-50/80 text-amber-950'
              : 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
          }`}>
            <Sparkles className={`size-4 shrink-0 mt-0.5 ${role === 'sales' ? 'text-amber-600' : 'text-emerald-600'}`} />
            <div className="space-y-0.5">
              <span className="font-bold block">
                {role === 'sales' ? 'Chế độ quản lý Sales (Không giới hạn)' : 'Tự do điều chỉnh lịch'}
              </span>
              <p className={`text-[11px] leading-relaxed ${role === 'sales' ? 'text-amber-800' : 'text-emerald-800'}`}>
                {role === 'sales'
                  ? 'Bạn có thể xóa ca rảnh này theo nhu cầu điều phối. Thao tác không bị giới hạn số lần.'
                  : 'Bạn có thể xóa ca rảnh này bất kỳ lúc nào mà không bị giới hạn số lần.'}
                {onOpenEditDialog && (
                  <span className="block mt-1 font-semibold">
                    💡 Nếu có nhiều ca cần xóa, hãy dùng{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false)
                        onOpenEditDialog()
                      }}
                      className="underline font-bold cursor-pointer"
                    >
                      Sửa đổi lịch đăng ký
                    </button>{' '}
                    để chọn xóa hàng loạt!
                  </span>
                )}
              </p>
            </div>
          </div>
        ) : isQuotaControlled && (
          isQuotaExceeded ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-950 flex items-start gap-2 shadow-2xs">
              <Lock className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Đã hết số lần sửa đổi trong tháng</span>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Bạn đã dùng hết <strong>2/2 lần sửa đổi lịch</strong> cho tháng này. Không thể xóa thêm ca rảnh. Vui lòng liên hệ Admin nếu cần hỗ trợ khẩn cấp.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 flex items-start gap-2 shadow-2xs">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Lưu ý về lượt sửa đổi (1 tháng 2 lần)</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Xóa ca rảnh này sẽ tính là <strong>Lần sửa thứ {quotaCount + 1}/{maxQuota}</strong> trong tháng.
                  {onOpenEditDialog && (
                    <span className="block mt-1 font-semibold text-amber-900">
                      💡 Nếu bạn có nhiều ca lỡ đăng ký cần xóa, hãy dùng{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onOpenChange(false)
                          onOpenEditDialog()
                        }}
                        className="underline hover:text-amber-950 font-bold cursor-pointer"
                      >
                        Sửa đổi lịch đăng ký
                      </button>{' '}
                      để xóa cùng lúc mà chỉ tốn 1 lượt!
                    </span>
                  )}
                </p>
              </div>
            </div>
          )
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold cursor-pointer"
          >
            Đóng
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isQuotaExceeded}
            className="rounded-xl font-bold shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              setErrorMessage(null)
              router.delete(teacherAvailabilityPath(availability.id), {
                data: redirectParams,
                onSuccess: () => {
                  onDeleteSuccess?.()
                  onOpenChange(false)
                },
                onError: (errors) => setErrorMessage(firstError(errors)),
              })
            }}
          >
            <Trash2 className="size-3.5 mr-1" />
            {isQuotaExceeded ? 'Không thể xóa (Đã khóa)' : 'Xóa ca rảnh này'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

function firstError(errors: Record<string, string[]>) {
  return (
    Object.values(errors)
      .flat()
      .find((message) => message.length > 0) ?? 'Không thể xóa ca rảnh.'
  )
}
