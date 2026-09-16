import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Info, Lock, Target } from 'lucide-react'

export interface TeacherKpiConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetWeekly: number
  monthKey: string
  changeCount: number
  onConfirm: () => void
}

function formatMonthDisplay(mKey: string) {
  if (!mKey) return ''
  const [y, m] = mKey.split('-')
  return `Tháng ${m}/${y}`
}

export function TeacherKpiConfirmDialog({
  open,
  onOpenChange,
  targetWeekly,
  monthKey,
  changeCount,
  onConfirm,
}: TeacherKpiConfirmDialogProps) {
  const targetMonthly = targetWeekly * 4
  const isBelowBase = targetWeekly < 10
  const isProfessional = targetWeekly >= 27.5
  const isChange = changeCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs">
              <Target className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                {isChange
                  ? 'Xác Nhận Thay Đổi Mục Tiêu Ca Rảnh'
                  : 'Xác Nhận Thiết Lập Mục Tiêu Ca Rảnh'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                {formatMonthDisplay(monthKey)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                Mục tiêu mỗi tuần
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-emerald-900 font-mono">
                  {targetWeekly}
                </span>
                <span className="text-xs font-bold text-emerald-700">ca/tuần</span>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 text-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block mb-1">
                Quy đổi cả tháng (×4)
              </span>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-blue-900 font-mono">
                  {targetMonthly}
                </span>
                <span className="text-xs font-bold text-blue-700">ca/tháng</span>
              </div>
            </div>
          </div>

          {/* Minimum Slots Notification (Quy định số ca tối thiểu) */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 block">
              📋 Quy định số ca mở tối thiểu:
            </span>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700">
                <span>• Mốc khởi điểm tối thiểu (Mức gốc):</span>
                <strong className="font-mono font-bold text-slate-900">10 ca/tuần (40 ca/tháng)</strong>
              </div>
              <div className="flex items-center justify-between text-emerald-800">
                <span>• Mốc cam kết chuẩn (Chuyên nghiệp 🌟):</span>
                <strong className="font-mono font-bold text-emerald-900">27.5 ca/tuần (110 ca/tháng)</strong>
              </div>
            </div>

            {/* Threshold Notice Alert */}
            {isBelowBase ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-black block">CẢNH BÁO: DƯỚI MỐC TỐI THIỂU</span>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Mục tiêu <strong>{targetWeekly} ca/tuần</strong> ({targetMonthly} ca/tháng) đang thấp hơn mốc khởi điểm tối thiểu <strong>10 ca/tuần</strong> (40 ca/tháng). Bạn có thể không đạt định mức cam kết giảng dạy cơ bản.
                  </p>
                </div>
              </div>
            ) : isProfessional ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-black block">MỤC TIÊU ĐẠT CHUẨN CHUYÊN NGHIỆP</span>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Đạt mốc cam kết chuẩn <strong>≥ 110 ca/tháng</strong> (Mức rate Chuyên nghiệp).
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Đạt mốc khởi điểm</span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Mục tiêu đạt trên định mức gốc. Để đạt mốc thù lao Chuyên nghiệp bạn cần từ 27.5 ca/tuần (110 ca/tháng).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Change Limitation Notice (1 tháng chọn 1 lần, đổi 1 lần) */}
          <div className="pt-1">
            {!isChange ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-950 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 font-black text-blue-900">
                  <Info className="size-4 text-blue-600 shrink-0" />
                  <span>Quy định thiết lập mục tiêu hàng tháng:</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Trong mỗi tháng, giáo viên được <strong>chọn mục tiêu 1 lần ban đầu</strong> và <strong>chỉ được thay đổi tối đa 1 lần</strong> duy nhất.
                </p>
                <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-blue-900">
                  <span>Sau khi xác nhận lần này, bạn còn:</span>
                  <span className="rounded-md bg-blue-200/80 px-1.5 py-0.2 text-blue-900">1 lượt thay đổi</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-3.5 text-xs text-rose-950 space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-black text-rose-900">
                  <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                  <span>CẢNH BÁO: ĐÂY LÀ LẦN THAY ĐỔI DUY NHẤT & CUỐI CÙNG</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                  Mỗi tháng chỉ được thay đổi mục tiêu đúng <strong>1 lần duy nhất</strong>. Sau khi bấm xác nhận, mục tiêu cho {formatMonthDisplay(monthKey)} sẽ được <strong>chốt cố định (khóa)</strong> và bạn sẽ không thể thay đổi thêm lần nào nữa trong tháng này.
                </p>
                <div className="flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded-lg inline-flex">
                  <Lock className="size-3" />
                  <span>Mục tiêu sẽ bị khóa sau khi xác nhận</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold cursor-pointer"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md cursor-pointer transition-all active:scale-95"
          >
            {isChange ? 'Xác Nhận Thay Đổi Mục Tiêu' : 'Xác Nhận Đặt Mục Tiêu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
