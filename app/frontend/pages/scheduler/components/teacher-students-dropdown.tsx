import { useMemo, useState } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  RotateCcw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { lessonSessionPath } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type { AdminTeacherStat, StudentSessionItem } from '../types'

type Props = {
  stat: AdminTeacherStat
  monthKey: string
  displayMonth: string
  redirectParams?: Record<string, unknown>
  onSelectStudentCode?: (studentCode: string) => void
  triggerVariant?: 'badge' | 'button' | 'shortcut'
}

function formatSessionDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const d = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10)
      )
      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      const dayName = dayNames[d.getDay()] || ''
      return `${dayName}, ${parts[2]}/${parts[1]}`
    }
  } catch {}
  return dateStr
}

export function TeacherStudentsDropdown({
  stat,
  monthKey,
  displayMonth,
  redirectParams = {},
  onSelectStudentCode,
  triggerVariant = 'badge',
}: Props) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [optimisticStatus, setOptimisticStatus] = useState<Record<number, string>>({})
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set())

  const students = useMemo(() => stat.studentTracking || [], [stat.studentTracking])

  // Extract month sessions for each student and overall counts
  const studentData = useMemo(() => {
    return students.map((student) => {
      const allSessions = student.sessions || []
      const monthSessions = allSessions.filter((s) =>
        s.scheduledOn ? s.scheduledOn.startsWith(monthKey) : false
      ).sort((a, b) => {
        const dateDiff = a.scheduledOn.localeCompare(b.scheduledOn)
        if (dateDiff !== 0) return dateDiff
        return (a.startTime || '').localeCompare(b.startTime || '')
      })

      const completedInMonth = monthSessions.filter((s) => {
        const status = optimisticStatus[s.id] ?? s.csStatus
        return status === 'completed' || s.lessonStatus === 'completed'
      }).length

      const isAllCompleted =
        monthSessions.length > 0 && completedInMonth === monthSessions.length

      return {
        ...student,
        monthSessions,
        completedInMonth,
        isAllCompleted,
      }
    })
  }, [students, monthKey, optimisticStatus])

  // Summary counts
  const totalMonthSessions = useMemo(() => {
    return studentData.reduce((sum, s) => sum + s.monthSessions.length, 0)
  }, [studentData])

  const totalCompletedMonthSessions = useMemo(() => {
    return studentData.reduce((sum, s) => sum + s.completedInMonth, 0)
  }, [studentData])

  const upcomingMonthSessionsCount = totalMonthSessions - totalCompletedMonthSessions

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentData
    const q = searchQuery.toLowerCase().trim()
    return studentData.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q)
    )
  }, [studentData, searchQuery])

  // Separate into students with month sessions and students without
  const studentsWithMonthSessions = useMemo(() => {
    return filteredStudents.filter((s) => s.monthSessions.length > 0)
  }, [filteredStudents])

  const studentsWithoutMonthSessions = useMemo(() => {
    return filteredStudents.filter((s) => s.monthSessions.length === 0)
  }, [filteredStudents])

  // Single session toggle
  const handleToggleSession = (sessionId: number, currentStatus: string) => {
    const isCompleted = currentStatus === 'completed'
    const nextStatus = isCompleted ? 'upcoming' : 'completed'
    const nextLessonStatus = nextStatus === 'completed' ? 'completed' : 'scheduled'

    setOptimisticStatus((prev) => ({ ...prev, [sessionId]: nextStatus }))
    setUpdatingIds((prev) => new Set(prev).add(sessionId))

    router.patch(
      lessonSessionPath(sessionId),
      {
        lesson_session: {
          lesson_status: nextLessonStatus,
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          setUpdatingIds((prev) => {
            const next = new Set(prev)
            next.delete(sessionId)
            return next
          })
          toast.success(
            nextStatus === 'completed'
              ? '✅ GV: Đã điểm danh hoàn thành ca học!'
              : 'GV: Đã chuyển ca học về chưa học.'
          )
        },
        onError: () => {
          setUpdatingIds((prev) => {
            const next = new Set(prev)
            next.delete(sessionId)
            return next
          })
          setOptimisticStatus((prev) => {
            const copy = { ...prev }
            delete copy[sessionId]
            return copy
          })
          toast.error('Lỗi khi cập nhật trạng thái ca học.')
        },
      }
    )
  }

  // Toggle all month sessions for a specific student
  const handleToggleStudentSessions = (
    monthSessions: StudentSessionItem[],
    targetStatus: 'completed' | 'upcoming'
  ) => {
    const sessionIds = monthSessions.map((s) => s.id)
    if (sessionIds.length === 0) return

    setOptimisticStatus((prev) => {
      const next = { ...prev }
      sessionIds.forEach((id) => {
        next[id] = targetStatus
      })
      return next
    })

    router.post(
      '/lesson_sessions/batch_update',
      {
        session_ids: sessionIds,
        updates: {
          lesson_status: targetStatus === 'completed' ? 'completed' : 'scheduled',
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          toast.success(
            `✅ GV: Đã điểm danh ${sessionIds.length} ca thành ${
              targetStatus === 'completed' ? 'hoàn thành' : 'chưa học'
            }!`
          )
        },
        onError: () => {
          toast.error('Lỗi khi cập nhật hàng loạt.')
        },
      }
    )
  }

  // Global toggle all month sessions for this teacher
  const handleTickAllTeacherMonthSessions = () => {
    const upcomingIds: number[] = []
    studentData.forEach((student) => {
      student.monthSessions.forEach((s) => {
        const isDone = (optimisticStatus[s.id] ?? s.lessonStatus) === 'completed'
        if (!isDone) {
          upcomingIds.push(s.id)
        }
      })
    })

    if (upcomingIds.length === 0) {
      toast.info('Tất cả các ca trong tháng này đã hoàn thành rồi!')
      return
    }

    setOptimisticStatus((prev) => {
      const next = { ...prev }
      upcomingIds.forEach((id) => {
        next[id] = 'completed'
      })
      return next
    })

    router.post(
      '/lesson_sessions/batch_update',
      {
        session_ids: upcomingIds,
        updates: {
          lesson_status: 'completed',
        },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          toast.success(
            `✅ GV: Đã điểm danh hoàn thành toàn bộ ${upcomingIds.length} ca trong tháng cho GV ${stat.teacherName}!`
          )
        },
        onError: () => {
          toast.error('Lỗi khi cập nhật hàng loạt.')
        },
      }
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerVariant === 'shortcut' ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition cursor-pointer shadow-2xs"
            title="Bấm để mở danh sách học viên và tick hoàn thành ca"
          >
            <CheckCircle2 className="size-3 text-purple-600" />
            <span>Tick completed ▾</span>
          </button>
        ) : (
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer shadow-2xs',
              stat.studentCount > 0
                ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-300'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
            )}
            title="Bấm để xem danh sách học viên và tick ca hoàn thành"
          >
            <Users className="size-3.5 text-blue-600" />
            <span>{stat.studentCount} học viên</span>
            <ChevronDown className="size-3 text-blue-500" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[380px] sm:w-[440px] p-0 rounded-2xl shadow-xl border border-slate-200 bg-white overflow-hidden text-xs z-50"
      >
        {/* ── Dropdown Header ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-blue-300 font-bold text-[11px] uppercase tracking-wider">
                <Users className="size-3.5" />
                <span>Học Viên Của Giảng Viên</span>
              </div>
              <h4 className="text-base font-black text-white mt-0.5">
                {stat.teacherName}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Kỳ tính lương: <strong className="text-emerald-300">{displayMonth}</strong>
                {' • '}
                <span>
                  {totalCompletedMonthSessions}/{totalMonthSessions} ca xong
                </span>
              </p>
            </div>

            {upcomingMonthSessionsCount > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleTickAllTeacherMonthSessions}
                className="h-7 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1 shrink-0 cursor-pointer shadow-sm"
                title="Tick hoàn tất tất cả các ca trong tháng này của giáo viên"
              >
                <Sparkles className="size-3" />
                Xong tất cả ({upcomingMonthSessionsCount})
              </Button>
            )}
          </div>

          {/* Search bar */}
          <div className="mt-3 relative">
            <Search className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm học viên theo tên, mã hoặc khóa học..."
              className="h-7 pl-8 pr-2.5 text-xs bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* ── Students List ───────────────────────────────────────────── */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 p-2">
          {students.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <Users className="size-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-xs">Chưa có học viên nào được gán</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              <Search className="size-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-xs">Không tìm thấy học viên phù hợp</p>
            </div>
          ) : (
            <>
              {/* Group 1: Students with month sessions */}
              {studentsWithMonthSessions.length > 0 && (
                <div className="space-y-2 pb-2">
                  <div className="px-2 pt-1 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Học viên có ca học trong {displayMonth}</span>
                    <span className="text-blue-600 font-mono">
                      {studentsWithMonthSessions.length} HV
                    </span>
                  </div>

                  {studentsWithMonthSessions.map((student) => (
                    <div
                      key={student.studentCode || student.enrollmentId}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 transition hover:border-blue-200 hover:bg-blue-50/20"
                    >
                      {/* Student info header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => onSelectStudentCode?.(student.studentCode)}
                            className="font-black text-slate-900 text-xs hover:text-blue-600 truncate cursor-pointer text-left"
                            title="Bấm để xem lịch sử chi tiết"
                          >
                            {student.studentName}
                          </button>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            ({student.studentCode})
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-blue-200 bg-blue-50 text-blue-700 font-bold"
                          >
                            {student.course}
                          </Badge>

                          {student.isAllCompleted ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleStudentSessions(student.monthSessions, 'upcoming')
                              }
                              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 cursor-pointer transition flex items-center gap-1"
                              title="Bấm để chuyển tất cả ca tháng này về chưa hoàn thành"
                            >
                              <RotateCcw className="size-2.5" />
                              Hủy tick
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleStudentSessions(student.monthSessions, 'completed')
                              }
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded px-1.5 py-0.5 cursor-pointer transition flex items-center gap-1"
                              title="Bấm để tick hoàn thành tất cả ca tháng này của HV này"
                            >
                              <Check className="size-2.5" />
                              Xong cả tháng
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Month sessions check list */}
                      <div className="mt-2 space-y-1.5 pt-1.5 border-t border-slate-200/60">
                        {student.monthSessions.map((session) => {
                          const status =
                            optimisticStatus[session.id] ?? session.csStatus
                          const isDone =
                            status === 'completed' || session.lessonStatus === 'completed'
                          const isBusy = updatingIds.has(session.id)

                          return (
                            <label
                              key={session.id}
                              className={cn(
                                'flex items-center justify-between gap-2 rounded-lg p-1.5 transition cursor-pointer select-none border',
                                isDone
                                  ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950'
                                  : 'bg-white border-slate-200/80 hover:bg-slate-100/80 text-slate-700'
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                  checked={isDone}
                                  disabled={isBusy}
                                  onCheckedChange={() =>
                                    handleToggleSession(session.id, status)
                                  }
                                  className={cn(
                                    'size-4 cursor-pointer',
                                    isDone
                                      ? 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                                      : ''
                                  )}
                                />
                                <div className="text-xs">
                                  <span className="font-extrabold">
                                    {formatSessionDate(session.scheduledOn)}
                                  </span>
                                  <span className="text-slate-400 font-normal ml-1">
                                    • {session.startTime}
                                    {session.endTime ? ` - ${session.endTime}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {session.dayLabel && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {session.dayLabel}
                                  </span>
                                )}
                                <div className="flex items-center gap-1">
                                  <span
                                    className={cn(
                                      'text-[10px] font-black rounded-md px-1.5 py-0.5 border',
                                      isDone
                                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    )}
                                  >
                                    GV: {isDone ? '✅' : '⏳'}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[10px] font-black rounded-md px-1.5 py-0.5 border',
                                      session.csStatus === 'completed'
                                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    )}
                                  >
                                    CS: {session.csStatus === 'completed' ? '✅' : '⏳'}
                                  </span>
                                  {isDone && session.csStatus === 'completed' && (
                                    <span className="text-[9px] font-black rounded-full px-1.5 py-0.5 bg-emerald-700 text-white shadow-2xs">
                                      🎉 Khớp
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Group 2: Students without sessions in this month */}
              {studentsWithoutMonthSessions.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="px-2 pt-1 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Học viên khác của GV (Chưa có lịch tháng {displayMonth})</span>
                    <span className="font-mono">
                      {studentsWithoutMonthSessions.length} HV
                    </span>
                  </div>

                  {studentsWithoutMonthSessions.map((student) => (
                    <div
                      key={student.studentCode || student.enrollmentId}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/40 p-2 text-slate-600"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectStudentCode?.(student.studentCode)}
                          className="font-bold text-slate-700 text-xs hover:text-blue-600 truncate cursor-pointer text-left"
                        >
                          {student.studentName}
                        </button>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          ({student.studentCode})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          Tổng khóa: {student.completed}/{student.total}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectStudentCode?.(student.studentCode)}
                          className="h-6 px-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <ExternalLink className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Dropdown Footer ─────────────────────────────────────────── */}
        <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            💡 Tick chọn sẽ <strong>tự động lưu</strong> và tính lương ngay.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-6 px-2 text-[10px] font-bold rounded-lg border-slate-300"
          >
            Đóng
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
