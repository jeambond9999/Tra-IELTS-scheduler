import { router } from '@inertiajs/react'
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  FileCheck,
  Filter,
  Info,
  Layers,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { lessonSessionPath } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type { LessonSession, PersonRole, SchedulerMutationRedirectParams } from '../types'

export type ReconciliationSession = {
  id: number
  scheduledOn: string
  startTime: string
  endTime: string
  durationMinutes: number
  dayLabel: string
  lessonStatus: string
  csStatus: string
  lessonNotes?: string | null
  studentName: string
  studentCode: string
  courseName: string
  teacherId?: number
  teacherName?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherId: number
  teacherName: string
  monthKey: string
  displayMonth: string
  sessions: LessonSession[] | ReconciliationSession[]
  role: PersonRole
  redirectParams?: SchedulerMutationRedirectParams
}

export function getSessionCa(durationMinutes: number, dayLabel?: string, _courseName?: string): number {
  // Writing mà học 2 day (tick vào ô học 2 day) thì dù thời lượng là 60 phút (thay vì 80 phút),
  // vẫn tính là 2 ca. Day label sẽ có dạng "Day 1 & 2/20" → caught by "&" check.
  const dayPart = (dayLabel || '').split('/')[0] || ''
  const isDouble =
    durationMinutes >= 50 ||
    dayPart.includes('&') ||
    dayPart.includes('-') ||
    (dayPart.match(/\d+/g)?.length || 0) >= 2

  if (isDouble) return 2

  if (durationMinutes > 0) {
    const ca = Math.round((durationMinutes / 40) * 10) / 10
    return ca % 1 === 0 ? Math.round(ca) : ca
  }
  return 1
}

export function CompletedSessionsReconciliationDialog({
  open,
  onOpenChange,
  teacherId,
  teacherName,
  monthKey,
  displayMonth,
  sessions: rawSessions = [],
  role,
  redirectParams,
}: Props) {
  // Normalize sessions
  const normalizedSessions: ReconciliationSession[] = useMemo(() => {
    return rawSessions.map((s: any) => {
      const studentName =
        s.enrollment?.student?.name ||
        s.studentName ||
        'Học viên'
      const studentCode =
        s.enrollment?.student?.code ||
        s.studentCode ||
        ''
      const courseName =
        s.enrollment?.courseName ||
        s.courseName ||
        s.course ||
        'IELTS'

      return {
        id: s.id,
        scheduledOn: s.scheduledOn || s.scheduled_on || '',
        startTime: s.startTime || s.start_time || '',
        endTime: s.endTime || s.end_time || '',
        durationMinutes: Number(s.durationMinutes || s.duration_minutes || 40),
        dayLabel: s.dayLabel || s.day_label || '',
        lessonStatus: s.lessonStatus || s.lesson_status || 'scheduled',
        csStatus: s.csStatus || s.cs_status || 'upcoming',
        lessonNotes: s.lessonNotes || s.lesson_notes || null,
        studentName,
        studentCode,
        courseName,
        teacherId: s.teacherId || s.teacher_id,
        teacherName: s.teacherName || s.teacher_name || teacherName,
      }
    })
    .sort((a, b) => {
      if (a.scheduledOn !== b.scheduledOn) {
        return a.scheduledOn.localeCompare(b.scheduledOn)
      }
      return a.startTime.localeCompare(b.startTime)
    })
  }, [rawSessions, teacherName])

  // Filter state
  // User asked for 2 buttons: "các ca đã xác nhận completed", "các ca trong tháng chưa completed"
  const [filterMode, setFilterMode] = useState<'all' | 'gv_completed' | 'gv_uncompleted' | 'reconciled'>('gv_completed')
  const [searchKeyword, setSearchKeyword] = useState<string>('')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  // Calculations
  const metrics = useMemo(() => {
    let totalCa = 0
    let gvCompletedCa = 0
    let csConfirmedCa = 0
    let reconciledCa = 0
    let pendingCsCa = 0

    let gvCompletedCount = 0
    let gvUncompletedCount = 0
    let csConfirmedCount = 0
    let reconciledCount = 0
    let pendingCsCount = 0

    normalizedSessions.forEach((s) => {
      const ca = getSessionCa(s.durationMinutes, s.dayLabel, s.courseName)
      totalCa += ca

      const isGvDone = s.lessonStatus === 'completed'
      const isCsDone = s.csStatus === 'completed'
      const isReconciled = isGvDone && isCsDone

      if (isGvDone) {
        gvCompletedCa += ca
        gvCompletedCount += 1
      } else {
        gvUncompletedCount += 1
      }

      if (isCsDone) {
        csConfirmedCa += ca
        csConfirmedCount += 1
      }

      if (isReconciled) {
        reconciledCa += ca
        reconciledCount += 1
      }

      if (isGvDone && !isCsDone) {
        pendingCsCa += ca
        pendingCsCount += 1
      }
    })

    const roundCa = (v: number) => Math.round(v * 10) / 10
    const roundedTotalCa = roundCa(totalCa)
    const roundedGvCompletedCa = roundCa(gvCompletedCa)
    const roundedGvUncompletedCa = Math.max(0, roundCa(totalCa - gvCompletedCa))

    return {
      totalCa: roundedTotalCa,
      totalCount: normalizedSessions.length,
      gvCompletedCa: roundedGvCompletedCa,
      gvUncompletedCa: roundedGvUncompletedCa,
      gvCompletedCount,
      gvUncompletedCount,
      csConfirmedCa: roundCa(csConfirmedCa),
      csConfirmedCount,
      reconciledCa: roundCa(reconciledCa),
      reconciledCount,
      pendingCsCa: roundCa(pendingCsCa),
      pendingCsCount,
    }
  }, [normalizedSessions])

  // Filtered list
  const displayedSessions = useMemo(() => {
    return normalizedSessions.filter((s) => {
      // Status filter
      if (filterMode === 'gv_completed' && s.lessonStatus !== 'completed') {
        return false
      }
      if (filterMode === 'gv_uncompleted' && s.lessonStatus === 'completed') {
        return false
      }
      if (filterMode === 'reconciled' && (s.lessonStatus !== 'completed' || s.csStatus !== 'completed')) {
        return false
      }

      // Keyword search
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase()
        const matchName = s.studentName.toLowerCase().includes(q)
        const matchCode = s.studentCode.toLowerCase().includes(q)
        const matchCourse = s.courseName.toLowerCase().includes(q)
        const matchDate = s.scheduledOn.includes(q)
        if (!matchName && !matchCode && !matchCourse && !matchDate) {
          return false
        }
      }

      return true
    })
  }, [normalizedSessions, filterMode, searchKeyword])

  const displayedCa = useMemo(() => {
    let sum = 0
    displayedSessions.forEach((s) => {
      sum += getSessionCa(s.durationMinutes, s.dayLabel, s.courseName)
    })
    return Math.round(sum * 10) / 10
  }, [displayedSessions])

  // Actions
  const handleToggleGvStatus = (session: ReconciliationSession, newStatus: string) => {
    setUpdatingId(session.id)
    router.patch(
      lessonSessionPath(session.id),
      {
        lesson_session: { lesson_status: newStatus },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onFinish: () => setUpdatingId(null),
      }
    )
  }

  const handleToggleCsStatus = (session: ReconciliationSession, newStatus: string) => {
    setUpdatingId(session.id)
    router.patch(
      lessonSessionPath(session.id),
      {
        lesson_session: { cs_status: newStatus },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onFinish: () => setUpdatingId(null),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 rounded-2xl sm:rounded-3xl border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-5 py-3.5 sm:px-6 sm:py-4 text-white shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black tracking-wide text-emerald-300 backdrop-blur-md border border-emerald-500/30">
                <ShieldCheck className="size-3.5" /> ĐỐI SOÁT CA DẠY & KHỚP LỆNH TÍNH LƯƠNG
              </span>
              <span className="text-xs font-semibold text-emerald-200/80">
                • {displayMonth}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <DialogTitle className="text-sm sm:text-base font-black text-white">
                Gia sư: <span className="text-emerald-300">{teacherName}</span>
              </DialogTitle>
              <DialogDescription className="sr-only">
                Đối soát các ca hoàn thành và khớp lệnh tính lương giữa Giáo Viên và CS
              </DialogDescription>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* ── BANNER KHỚP LỆNH CHÍNH (Chỉ ghi ca, không ghi buổi, bỏ dòng nhắn tin cá nhân) ── */}
          <div className="mt-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3.5 text-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-200">
                <span>GV <strong>{teacherName}</strong> xác nhận đã hoàn thành:</span>
                <span className="rounded-lg bg-emerald-500 px-2.5 py-0.5 text-white font-extrabold text-sm shadow-xs">
                  {metrics.gvCompletedCa} ca
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-teal-200 text-sm">Đã được CS confirm:</span>
                <span className="rounded-lg bg-teal-500 px-2.5 py-0.5 text-white font-extrabold text-sm shadow-xs">
                  {metrics.csConfirmedCa} ca
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-amber-300 font-bold text-sm">Số ca chờ CS confirm:</span>
                <span className="rounded-lg bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 text-sm shadow-xs">
                  {metrics.pendingCsCa} ca
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-black text-white bg-emerald-600/80 px-3 py-1 rounded-xl border border-emerald-400/50 shadow-xs">
                <Coins className="size-4 text-amber-300" />
                <span className="text-sm">Số ca khớp lệnh tính lương:</span>
                <span className="text-base font-black text-amber-300">{metrics.reconciledCa} ca</span>
              </div>
            </div>

            {/* Quy tắc tính lương */}
            <div className="rounded-xl bg-black/25 px-3 py-1.5 text-[11px] text-emerald-100 flex items-center gap-2 border border-white/10">
              <Info className="size-3.5 text-emerald-300 shrink-0" />
              <span>
                <strong>💡 Quy tắc tính lương:</strong> 1 ca hoàn thành và tính lương = số ca CS và GV đều tick, nếu 1 trong 2 không tick thì không tính.
              </span>
            </div>
          </div>
        </div>

        {/* Controls & Filter Buttons */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 sm:px-6 shrink-0 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
          {/* 2 Main Filter Buttons as requested by user + 2 helper filters */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Xem danh sách:
            </span>

            <Button
              type="button"
              size="sm"
              variant={filterMode === 'gv_completed' ? 'default' : 'outline'}
              onClick={() => setFilterMode('gv_completed')}
              className={cn(
                'h-8 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs',
                filterMode === 'gv_completed'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <CheckCircle2 className="size-3.5 mr-1 text-emerald-300" />
              Các ca đã xác nhận completed ({metrics.gvCompletedCa} ca)
            </Button>

            <Button
              type="button"
              size="sm"
              variant={filterMode === 'gv_uncompleted' ? 'default' : 'outline'}
              onClick={() => setFilterMode('gv_uncompleted')}
              className={cn(
                'h-8 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs',
                filterMode === 'gv_uncompleted'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              <Clock className="size-3.5 mr-1 text-amber-300" />
              Các ca trong tháng chưa completed ({metrics.gvUncompletedCa} ca)
            </Button>

            <Button
              type="button"
              size="sm"
              variant={filterMode === 'reconciled' ? 'default' : 'ghost'}
              onClick={() => setFilterMode('reconciled')}
              className={cn(
                'h-8 rounded-xl text-xs font-bold cursor-pointer transition',
                filterMode === 'reconciled'
                  ? 'bg-teal-700 hover:bg-teal-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Coins className="size-3.5 mr-1 text-amber-500" />
              Đã khớp lệnh ({metrics.reconciledCa} ca)
            </Button>

            <Button
              type="button"
              size="sm"
              variant={filterMode === 'all' ? 'default' : 'ghost'}
              onClick={() => setFilterMode('all')}
              className={cn(
                'h-8 rounded-xl text-xs font-bold cursor-pointer transition',
                filterMode === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              Tất cả ({metrics.totalCa} ca)
            </Button>
          </div>

          {/* Search box */}
          <div className="relative w-44 sm:w-60">
            <Search className="size-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm học viên, mã HV..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-slate-50 border-slate-200 rounded-xl"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sessions Table Container - ALWAYS SCROLLABLE with fixed sticky header */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 bg-slate-50/50">
          {displayedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
              <Calendar className="size-10 text-slate-300 mb-2" />
              <div className="text-sm font-extrabold text-slate-700">
                Không tìm thấy ca học nào
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {filterMode === 'gv_completed'
                  ? 'Gia sư chưa xác nhận hoàn thành ca nào trong tháng này.'
                  : filterMode === 'gv_uncompleted'
                  ? 'Tất cả các ca trong tháng đều đã được xác nhận completed!'
                  : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 shadow-2xs">
                    <tr className="text-slate-700 font-extrabold">
                      <th className="py-2.5 px-3 min-w-[140px]">Thời gian & Ca</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Học viên & Khóa</th>
                      <th className="py-2.5 px-3 text-center min-w-[140px]">GV xác nhận</th>
                      <th className="py-2.5 px-3 text-center min-w-[140px]">CS confirm</th>
                      <th className="py-2.5 px-3 text-center min-w-[160px]">Khớp lệnh tính lương</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedSessions.map((session) => {
                      const ca = getSessionCa(session.durationMinutes, session.dayLabel, session.courseName)
                      const isGvDone = session.lessonStatus === 'completed'
                      const isCsDone = session.csStatus === 'completed'
                      const isReconciled = isGvDone && isCsDone
                      const isPendingCs = isGvDone && !isCsDone
                      const isPendingGv = !isGvDone && isCsDone
                      const isUpdating = updatingId === session.id

                      return (
                        <tr
                          key={session.id}
                          className={cn(
                            'hover:bg-slate-50 transition-colors',
                            isReconciled ? 'bg-emerald-50/30' : isPendingCs ? 'bg-amber-50/20' : ''
                          )}
                        >
                          {/* 1. Time & Duration */}
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <CalendarDays className="size-3.5 text-slate-400 shrink-0" />
                              <span>{session.scheduledOn}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="size-3 text-slate-400 shrink-0" />
                              <span>{session.startTime} - {session.endTime}</span>
                              <span className={cn(
                                'ml-1 font-black px-1.5 py-0.2 rounded text-[10px]',
                                ca >= 2 ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                              )}>
                                {ca} ca ({session.durationMinutes}p)
                              </span>
                            </div>
                          </td>

                          {/* 2. Student & Course */}
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                              <span>{session.studentName}</span>
                              {session.studentCode && (
                                <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px] font-mono text-slate-600">
                                  {session.studentCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span className="font-semibold text-emerald-800">{session.courseName}</span>
                              {session.dayLabel && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200">
                                  {session.dayLabel}
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* 3. GV Confirmation */}
                          <td className="py-2.5 px-3 text-center">
                            {role === 'teacher' || role === 'admin' ? (
                              <Select
                                value={session.lessonStatus}
                                onValueChange={(val) => handleToggleGvStatus(session, val)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className={cn(
                                  'h-7 text-xs font-bold rounded-lg px-2 min-w-[130px] cursor-pointer shadow-2xs',
                                  isGvDone
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" className="bg-white rounded-xl shadow-lg border border-slate-200">
                                  <SelectItem value="completed" className="text-xs font-bold text-emerald-800 cursor-pointer">
                                    ✅ Đã hoàn thành
                                  </SelectItem>
                                  <SelectItem value="scheduled" className="text-xs font-semibold text-slate-600 cursor-pointer">
                                    ⏳ Chưa hoàn thành
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs font-bold px-2 py-0.5',
                                  isGvDone
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                )}
                              >
                                {isGvDone ? '✅ GV đã hoàn thành' : '⏳ Chưa hoàn thành'}
                              </Badge>
                            )}
                          </td>

                          {/* 4. CS Confirmation */}
                          <td className="py-2.5 px-3 text-center">
                            {role === 'cs' || role === 'admin' ? (
                              <Select
                                value={session.csStatus}
                                onValueChange={(val) => handleToggleCsStatus(session, val)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className={cn(
                                  'h-7 text-xs font-bold rounded-lg px-2 min-w-[130px] cursor-pointer shadow-2xs',
                                  isCsDone
                                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" className="bg-white rounded-xl shadow-lg border border-slate-200">
                                  <SelectItem value="completed" className="text-xs font-bold text-teal-800 cursor-pointer">
                                    ✅ CS đã confirm
                                  </SelectItem>
                                  <SelectItem value="upcoming" className="text-xs font-semibold text-slate-600 cursor-pointer">
                                    ⏳ CS chưa confirm
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs font-bold px-2 py-0.5',
                                  isCsDone
                                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                                    : 'bg-amber-50 text-amber-900 border-amber-300'
                                )}
                              >
                                {isCsDone ? '✅ CS đã confirm' : '⏳ CS chưa tick'}
                              </Badge>
                            )}
                          </td>

                          {/* 5. Khớp lệnh tính lương */}
                          <td className="py-2.5 px-3 text-center">
                            {isReconciled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-black text-emerald-900 shadow-2xs">
                                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                <span>Đạt chuẩn (+{ca} ca)</span>
                              </span>
                            ) : isPendingCs ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                                <Clock className="size-3 text-amber-700 shrink-0" />
                                <span>Chờ CS confirm</span>
                              </span>
                            ) : isPendingGv ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-300 px-2 py-0.5 text-[11px] font-bold text-blue-900">
                                <Clock className="size-3 text-blue-700 shrink-0" />
                                <span>Chờ GV hoàn thành</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                Chưa tính lương
                              </span>
                            )}
                          </td>

                          {/* 6. Notes */}
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[160px] truncate" title={session.lessonNotes || ''}>
                            {session.lessonNotes ? (
                              <span className="italic">📝 {session.lessonNotes}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary - ALWAYS PINNED AT BOTTOM */}
        <div className="bg-white border-t border-slate-200 px-5 py-2.5 sm:px-6 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-600 font-medium">
            <span>Hiển thị: <strong className="text-slate-900">{displayedCa}</strong> / {metrics.totalCa} ca</span>
            <span className="hidden sm:inline">•</span>
            <span>GV xác nhận: <strong className="text-emerald-700">{metrics.gvCompletedCa} ca</strong></span>
            <span className="hidden sm:inline">•</span>
            <span>CS confirm: <strong className="text-teal-700">{metrics.csConfirmedCa} ca</strong></span>
            <span className="hidden sm:inline">•</span>
            <span>Chờ CS: <strong className="text-amber-700">{metrics.pendingCsCa} ca</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-700 hidden sm:inline">Tổng ca tính vào lương:</span>
              <span className="font-extrabold text-slate-700 sm:hidden">Lương:</span>
              <span className="rounded-xl bg-emerald-600 px-3 py-1 text-sm font-black text-white shadow-xs">
                {metrics.reconciledCa} ca
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-xl font-bold cursor-pointer hover:bg-slate-100"
            >
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
