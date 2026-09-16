import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PersonRole, SchedulerProps } from '../types'

export function RoleScheduleSummary({
  role,
  teacherName,
  weekSummary,
  onEditSchedule,
}: {
  role: PersonRole
  teacherName: string
  weekSummary: SchedulerProps['weekSummary']
  onEditSchedule?: () => void
}) {
  const availableCa = weekSummary.availableCa
  const bookedCa = weekSummary.bookedCa
  const completedCa = weekSummary.completedCa ?? 0
  const totalCa = weekSummary.totalCa ?? availableCa
  const fillRate =
    weekSummary.fillRatePercentage ??
    (totalCa > 0 ? Math.round((bookedCa / totalCa) * 100) : 0)
  const doneRate =
    weekSummary.doneRatePercentage ??
    (bookedCa > 0 ? Math.round((completedCa / bookedCa) * 100) : 0)

  const isAllTeachers = !teacherName || teacherName.includes('Toàn Trung Tâm')

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 shadow-inner">
        <span>
          {isAllTeachers ? 'Phạm vi: ' : 'Giáo Viên: '}
          <strong className="text-sm font-black text-emerald-800">
            {teacherName || 'Toàn Trung Tâm (Tất cả Giảng Viên)'}
          </strong>
        </span>
        {role === 'cs' && (
          <span className="text-slate-500">
            (💡 <strong>Click ca học</strong> xem chi tiết hoặc <strong>Kéo thả</strong> để dời lịch)
          </span>
        )}
      </div>
      {role === 'sales' ? (
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span
            className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 font-bold text-emerald-800 shadow-2xs"
            title="Số ca mở tính ở tab Đăng Ký Lịch của GV tuần này"
          >
            🎯 Ca Mở (Đăng Ký): <strong>{totalCa}</strong> ca{' '}
            <span className="text-[11px] font-normal text-emerald-600">(Rảnh: {availableCa} ca)</span>
          </span>
          <span
            className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 font-bold text-blue-800 shadow-2xs"
            title="Số ca book tính ở Lịch Sales tuần này"
          >
            📚 Ca Book (Sales): <strong>{bookedCa}</strong> ca{' '}
            <span className="text-[11px] font-normal text-blue-600">(Đã Book: {bookedCa} ca)</span>
          </span>
          <span
            className="rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 font-bold text-indigo-800 shadow-2xs"
            title="Fill Rate = (Ca Book Sales ÷ Ca Mở Đăng Ký) × 100%"
          >
            📈 Fill Rate: <strong>{fillRate}%</strong>
          </span>
          {onEditSchedule && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditSchedule}
              className="h-8 rounded-xl border-rose-300 bg-rose-50/90 text-rose-800 hover:bg-rose-100 hover:text-rose-900 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
              title="Sửa đổi lịch đăng ký của GV này (Xóa các ca rảnh - Quyền Sales: Không giới hạn)"
            >
              <Trash2 className="size-3.5 text-rose-600" />
              <span>Sửa Lịch GV</span>
            </Button>
          )}
        </div>
      ) : role === 'cs' ? (
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span
            className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 font-bold text-blue-800 shadow-2xs"
            title="Số ca book ở Lịch Sales tuần này"
          >
            📚 Ca Book (Sales): <strong>{bookedCa}</strong> ca{' '}
            <span className="text-[11px] font-normal text-blue-600">(Đã Book tuần này: {bookedCa} ca)</span>
          </span>
          <span
            className="rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-1.5 font-bold text-purple-800 shadow-2xs"
            title="Số ca hoàn thành (điểm danh CS/GV)"
          >
            ✅ Hoàn Thành: <strong>{completedCa}</strong> ca
          </span>
          <span
            className="rounded-xl border border-purple-200 bg-purple-50/80 px-3 py-1.5 font-bold text-purple-800 shadow-2xs"
            title="Done Rate = (Ca Hoàn Thành ÷ Ca Book Sales) × 100%"
          >
            🎯 Done Rate: <strong>{doneRate}%</strong>
          </span>
          <span
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 shadow-2xs"
            title="Tổng ca GV mở ở tab Đăng Ký Lịch"
          >
            Ca Mở (Đăng Ký): <strong>{totalCa}</strong> ca (Fill: {fillRate}%)
          </span>
        </div>
      ) : (
        <div className="text-xs font-bold text-blue-600">Đã Book tuần này: {bookedCa} ca</div>
      )}
    </div>
  )
}
