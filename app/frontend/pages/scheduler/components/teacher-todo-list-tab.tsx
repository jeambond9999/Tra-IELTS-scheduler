import { router } from '@inertiajs/react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  GraduationCap,
  ListTodo,
  Search,
  Sparkles,
  User,
  Users,
} from 'lucide-react'
import { useMemo, useState, type ReactElement } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type {
  Enrollment,
  LessonSession,
  PersonRole,
  SchedulerMutationRedirectParams,
  SchedulerProps,
  StudentSessionItem,
} from '../types'
import {
  extractTakeNotesInfo,
  markTakeNotesCompleted,
  unmarkTakeNotesCompleted,
  TakeNotesDeadlineDialog,
  type TakeNotesInfo,
} from './take-notes-deadline-dialog'
import { TagBadges } from './note-tags'

export type TakeNotesTask = {
  sessionId: number
  studentName: string
  studentCode: string
  course: string
  dayLabel: string
  scheduledOn: string
  startTime: string
  endTime: string
  teacherId?: number
  teacherName?: string
  lessonNotes: string
  info: TakeNotesInfo
  fullLesson?: LessonSession | null
}

type Props = {
  role: PersonRole
  studentTracking: SchedulerProps['studentTracking']
  monthLessonSessions?: LessonSession[]
  lessonSessions?: LessonSession[]
  selectedTeacherId?: number | 'all' | string
  redirectParams: SchedulerMutationRedirectParams
  onOpenLessonDetail: (lesson: LessonSession) => void
  onOpenStudentSessions: (studentCode: string) => void
}

type FilterTab = 'pending' | 'all' | 'urgent' | 'completed'
type SortOrder = 'deadline_asc' | 'deadline_desc' | 'scheduled_desc' | 'scheduled_asc' | 'student_name'

export function TeacherTodoListTab({
  role,
  studentTracking,
  monthLessonSessions = [],
  lessonSessions = [],
  selectedTeacherId,
  redirectParams,
  onOpenLessonDetail,
  onOpenStudentSessions,
}: Props): ReactElement {
  const [filterTab, setFilterTab] = useState<FilterTab>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('deadline_asc')

  // Optimistic updates map: sessionId -> newLessonNotes
  const [optimisticNotes, setOptimisticNotes] = useState<Record<number, string>>({})

  // Dialog state for editing deadline from within to-do list
  const [editingTask, setEditingTask] = useState<TakeNotesTask | null>(null)

  // Map of all available full lesson sessions by ID for quick access
  const lessonSessionsMap = useMemo(() => {
    const map = new Map<number, LessonSession>()
    for (const ls of monthLessonSessions) {
      map.set(ls.id, ls)
    }
    for (const ls of lessonSessions) {
      if (!map.has(ls.id)) {
        map.set(ls.id, ls)
      }
    }
    return map
  }, [monthLessonSessions, lessonSessions])

  // Extract all Take Notes tasks
  const allTasks = useMemo(() => {
    const tasks: TakeNotesTask[] = []
    const seenSessionIds = new Set<number>()

    // 1. Traverse studentTracking
    for (const student of studentTracking || []) {
      const sessions = student.sessions || []
      for (const s of sessions) {
        if (seenSessionIds.has(s.id)) continue

        const effectiveNote = optimisticNotes[s.id] !== undefined
          ? optimisticNotes[s.id]
          : (s.lessonNotes || s.lesson_notes || '')

        const info = extractTakeNotesInfo(effectiveNote)
        if (info.hasTakeNotes) {
          seenSessionIds.add(s.id)
          tasks.push({
            sessionId: s.id,
            studentName: student.studentName,
            studentCode: student.studentCode,
            course: student.course,
            dayLabel: s.dayLabel || s.day_label || 'Buổi học',
            scheduledOn: s.scheduledOn || s.scheduled_on || '',
            startTime: s.startTime || s.start_time || '',
            endTime: s.endTime || s.end_time || '',
            teacherId: s.teacherId || s.teacher_id || student.teacherId,
            teacherName: s.teacherName || s.teacher_name || student.teacherName,
            lessonNotes: effectiveNote,
            info,
            fullLesson: lessonSessionsMap.get(s.id) || null,
          })
        }
      }
    }

    // 2. Also check monthLessonSessions in case any session is not in studentTracking
    for (const ls of monthLessonSessions) {
      if (seenSessionIds.has(ls.id)) continue

      const effectiveNote = optimisticNotes[ls.id] !== undefined
        ? optimisticNotes[ls.id]
        : (ls.lessonNotes || '')

      const info = extractTakeNotesInfo(effectiveNote)
      if (info.hasTakeNotes) {
        seenSessionIds.add(ls.id)
        tasks.push({
          sessionId: ls.id,
          studentName: ls.enrollment?.student?.name || 'Học viên',
          studentCode: ls.enrollment?.student?.code || '',
          course: ls.enrollment?.courseName || '',
          dayLabel: ls.dayLabel || 'Buổi học',
          scheduledOn: ls.scheduledOn || '',
          startTime: ls.startTime || '',
          endTime: ls.endTime || '',
          teacherId: ls.teacherId,
          teacherName: ls.teacherName,
          lessonNotes: effectiveNote,
          info,
          fullLesson: ls,
        })
      }
    }

    return tasks
  }, [studentTracking, monthLessonSessions, lessonSessionsMap, optimisticNotes])

  // Summary Metrics
  const stats = useMemo(() => {
    let total = 0
    let pending = 0
    let urgent = 0
    let completed = 0

    for (const t of allTasks) {
      total++
      if (t.info.isCompleted) {
        completed++
      } else {
        pending++
        if (
          t.info.urgency === 'overdue' ||
          t.info.urgency === 'due_today' ||
          t.info.urgency === 'due_soon'
        ) {
          urgent++
        }
      }
    }

    return { total, pending, urgent, completed }
  }, [allTasks])

  // Filtered and Sorted tasks
  const displayedTasks = useMemo(() => {
    let result = allTasks.filter((t) => {
      // Tab filter
      if (filterTab === 'pending' && t.info.isCompleted) return false
      if (filterTab === 'completed' && !t.info.isCompleted) return false
      if (filterTab === 'urgent') {
        if (t.info.isCompleted) return false
        if (
          t.info.urgency !== 'overdue' &&
          t.info.urgency !== 'due_today' &&
          t.info.urgency !== 'due_soon'
        ) {
          return false
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = t.studentName.toLowerCase().includes(q)
        const matchCode = t.studentCode.toLowerCase().includes(q)
        const matchCourse = t.course.toLowerCase().includes(q)
        const matchDay = t.dayLabel.toLowerCase().includes(q)
        const matchInstruction = t.info.instruction.toLowerCase().includes(q)
        const matchNotes = t.lessonNotes.toLowerCase().includes(q)
        return matchName || matchCode || matchCourse || matchDay || matchInstruction || matchNotes
      }

      return true
    })

    // Sort order
    result.sort((a, b) => {
      // Put pending before completed if in 'all' view
      if (filterTab === 'all' && a.info.isCompleted !== b.info.isCompleted) {
        return a.info.isCompleted ? 1 : -1
      }

      if (sortOrder === 'deadline_asc') {
        // Overdue & earliest deadline first; no_deadline at the end
        if (!a.info.deadline && !b.info.deadline) return 0
        if (!a.info.deadline) return 1
        if (!b.info.deadline) return -1
        return a.info.deadline.localeCompare(b.info.deadline)
      }
      if (sortOrder === 'deadline_desc') {
        if (!a.info.deadline && !b.info.deadline) return 0
        if (!a.info.deadline) return 1
        if (!b.info.deadline) return -1
        return b.info.deadline.localeCompare(a.info.deadline)
      }
      if (sortOrder === 'scheduled_desc') {
        return (b.scheduledOn || '').localeCompare(a.scheduledOn || '')
      }
      if (sortOrder === 'scheduled_asc') {
        return (a.scheduledOn || '').localeCompare(b.scheduledOn || '')
      }
      if (sortOrder === 'student_name') {
        return a.studentName.localeCompare(b.studentName)
      }
      return 0
    })

    return result
  }, [allTasks, filterTab, searchQuery, sortOrder])

  // Handle toggling completed status
  const handleToggleComplete = (task: TakeNotesTask) => {
    const isNowCompleted = !task.info.isCompleted
    const newNote = isNowCompleted
      ? markTakeNotesCompleted(task.lessonNotes)
      : unmarkTakeNotesCompleted(task.lessonNotes)

    // Optimistic UI update
    setOptimisticNotes((prev) => ({ ...prev, [task.sessionId]: newNote }))

    router.patch(
      lessonSessionPath(task.sessionId),
      {
        lesson_session: { lesson_notes: newNote },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          if (isNowCompleted) {
            toast.success(`🎉 Đã hoàn thành Take Notes cho học viên ${task.studentName}!`)
          } else {
            toast.info(`Đã chuyển task về Cần chữa cho ${task.studentName}.`)
          }
        },
        onError: () => {
          // Rollback optimistic update
          setOptimisticNotes((prev) => {
            const next = { ...prev }
            delete next[task.sessionId]
            return next
          })
          toast.error('Lỗi khi cập nhật trạng thái Take Notes.')
        },
      }
    )
  }

  // Handle opening lesson detail dialog
  const handleOpenDetail = (task: TakeNotesTask) => {
    if (task.fullLesson) {
      onOpenLessonDetail(task.fullLesson)
    } else {
      // Synthesize a safe minimal LessonSession
      const syntheticLesson: LessonSession = {
        id: task.sessionId,
        teacherId: task.teacherId || 0,
        teacherName: task.teacherName || '',
        scheduledOn: task.scheduledOn,
        startTime: task.startTime,
        endTime: task.endTime,
        durationMinutes: 40,
        dayLabel: task.dayLabel,
        lessonStatus: 'scheduled',
        lessonNotes: task.lessonNotes,
        csForm: 'take_notes',
        csStatus: 'completed',
        enrollment: {
          id: 0,
          courseName: task.course,
          paymentStatus: 'paid',
          meetLink: '',
          startDate: task.scheduledOn,
          totalSessions: 10,
          frequencyPerWeek: 2,
          durationMinutes: 40,
          active: true,
          teacherId: task.teacherId || 0,
          salesId: 0,
          student: {
            id: 0,
            code: task.studentCode,
            name: task.studentName,
          },
        } as Enrollment,
      }
      onOpenLessonDetail(syntheticLesson)
    }
  }

  // Handle saving new deadline from dialog
  const handleSaveDeadline = (newNote: string) => {
    if (!editingTask) return
    const sessionId = editingTask.sessionId

    setOptimisticNotes((prev) => ({ ...prev, [sessionId]: newNote }))
    setEditingTask(null)

    router.patch(
      lessonSessionPath(sessionId),
      {
        lesson_session: { lesson_notes: newNote },
        ...redirectParams,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success('✅ Đã cập nhật hạn chót Take Notes.')
        },
        onError: () => {
          setOptimisticNotes((prev) => {
            const next = { ...prev }
            delete next[sessionId]
            return next
          })
          toast.error('Lỗi khi cập nhật hạn chót.')
        },
      }
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Metrics */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-200">
              <ListTodo className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>To-do List: Nhiệm Vụ Take Notes Cần Chữa</span>
                <span className="text-xs font-extrabold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                  Dành cho Giáo viên
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Theo dõi tiến độ chữa bài, kiểm tra deadline và đánh dấu hoàn thành các buổi học có Take Notes
              </p>
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Tổng task */}
          <div
            onClick={() => setFilterTab('all')}
            className={cn(
              'rounded-2xl p-4 border transition cursor-pointer select-none',
              filterTab === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100/80 text-slate-800'
            )}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span>Tổng Task Take Notes</span>
              <BookOpen className="size-4" />
            </div>
            <div className="text-2xl font-black">{stats.total}</div>
            <div className="text-[11px] font-medium opacity-75 mt-0.5">Tất cả các buổi được giao</div>
          </div>

          {/* Card 2: Cần chữa */}
          <div
            onClick={() => setFilterTab('pending')}
            className={cn(
              'rounded-2xl p-4 border transition cursor-pointer select-none',
              filterTab === 'pending'
                ? 'bg-purple-700 text-white border-purple-700 shadow-sm ring-2 ring-purple-600/20'
                : 'bg-purple-50/70 border-purple-200/80 hover:bg-purple-100/70 text-purple-950'
            )}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span>Cần Chữa</span>
              <Clock className="size-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-700">{stats.pending}</div>
            <div className="text-[11px] font-medium text-purple-600/90 mt-0.5">Đang chờ hoàn thành</div>
          </div>

          {/* Card 3: Quá hạn / Gấp */}
          <div
            onClick={() => setFilterTab('urgent')}
            className={cn(
              'rounded-2xl p-4 border transition cursor-pointer select-none',
              filterTab === 'urgent'
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm ring-2 ring-rose-600/20'
                : 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-100/70 text-rose-950'
            )}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span>Quá Hạn & Gấp</span>
              <AlertTriangle className="size-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700">{stats.urgent}</div>
            <div className="text-[11px] font-medium text-rose-600/90 mt-0.5">Hạn chót hôm nay hoặc đã trễ</div>
          </div>

          {/* Card 4: Đã chữa xong */}
          <div
            onClick={() => setFilterTab('completed')}
            className={cn(
              'rounded-2xl p-4 border transition cursor-pointer select-none',
              filterTab === 'completed'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-600/20'
                : 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/70 text-emerald-950'
            )}
          >
            <div className="flex items-center justify-between text-xs font-bold opacity-80 mb-1">
              <span>Đã Xong</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{stats.completed}</div>
            <div className="text-[11px] font-medium text-emerald-600/90 mt-0.5">Đã đánh dấu hoàn thành</div>
          </div>
        </div>

        {/* Filter Toolbar & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                filterTab === 'pending'
                  ? 'bg-purple-700 text-white font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>⏳ Cần chữa ({stats.pending})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('urgent')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                filterTab === 'urgent'
                  ? 'bg-rose-700 text-white font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>⚠️ Quá hạn / Gấp ({stats.urgent})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('completed')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                filterTab === 'completed'
                  ? 'bg-emerald-700 text-white font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>✅ Đã xong ({stats.completed})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5',
                filterTab === 'all'
                  ? 'bg-slate-900 text-white font-black shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>Tất cả ({stats.total})</span>
            </button>
          </div>

          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative min-w-[220px]">
              <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                type="text"
                placeholder="Tìm học viên, khóa học, ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-200 focus-visible:ring-purple-500 rounded-xl"
              />
            </div>

            <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as SortOrder)}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-white border-slate-200 rounded-xl w-auto min-w-[170px]">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="size-3.5 text-slate-400" />
                  <SelectValue placeholder="Sắp xếp" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline_asc">Hạn chót gần nhất</SelectItem>
                <SelectItem value="deadline_desc">Hạn chót xa nhất</SelectItem>
                <SelectItem value="scheduled_desc">Ngày học mới nhất</SelectItem>
                <SelectItem value="scheduled_asc">Ngày học cũ nhất</SelectItem>
                <SelectItem value="student_name">Tên học viên A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Task List */}
      {displayedTasks.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="size-16 mx-auto rounded-3xl bg-purple-50 flex items-center justify-center text-3xl">
            {filterTab === 'completed' ? '📝' : '🎉'}
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            {filterTab === 'completed'
              ? 'Chưa có task nào được đánh dấu hoàn thành'
              : filterTab === 'urgent'
              ? 'Tuyệt vời! Không có task Take Notes nào bị quá hạn'
              : filterTab === 'pending'
              ? 'Tuyệt vời! Bạn không còn task Take Notes nào cần chữa'
              : 'Không tìm thấy task Take Notes nào phù hợp'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterTab === 'pending'
              ? 'Tất cả các buổi học yêu cầu Take Notes đã được hoàn thành hoặc chưa có task mới được giao.'
              : 'Hãy thử đổi bộ lọc hoặc xóa từ khóa tìm kiếm để xem các task khác.'}
          </p>
          {(filterTab !== 'all' || searchQuery) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterTab('all')
                setSearchQuery('')
              }}
              className="mt-2 text-xs font-bold rounded-xl"
            >
              Xem tất cả task Take Notes
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTasks.map((task) => {
            const isDone = task.info.isCompleted
            const urgency = task.info.urgency

            return (
              <div
                key={task.sessionId}
                className={cn(
                  'group bg-white rounded-2xl p-4 border transition-all shadow-xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4',
                  isDone
                    ? 'border-emerald-200/70 bg-emerald-50/15 opacity-80 hover:opacity-100'
                    : urgency === 'overdue'
                    ? 'border-rose-300 bg-rose-50/20'
                    : urgency === 'due_today'
                    ? 'border-orange-300 bg-orange-50/20'
                    : urgency === 'due_soon'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200/80 hover:border-purple-300'
                )}
              >
                {/* Left Side: Checkbox & Main Info */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(task)}
                      className={cn(
                        'size-6 rounded-lg border-2 flex items-center justify-center transition cursor-pointer',
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-purple-600 bg-white'
                      )}
                      title={isDone ? 'Bấm để chuyển về Cần chữa' : 'Bấm để đánh dấu Hoàn thành'}
                    >
                      {isDone && <CheckCircle2 className="size-4" />}
                    </button>
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Header Row: Student name, code, badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-black transition',
                          isDone ? 'text-slate-500 line-through' : 'text-slate-900'
                        )}
                      >
                        {task.studentName}
                      </span>
                      {task.studentCode && (
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {task.studentCode}
                        </span>
                      )}

                      {/* Urgency / Deadline Badge */}
                      {isDone ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <CheckCircle2 className="size-3" />
                          <span>Đã hoàn thành</span>
                        </span>
                      ) : urgency === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800 animate-pulse">
                          <AlertCircle className="size-3" />
                          <span>
                            Quá hạn{' '}
                            {task.info.daysRemaining !== null
                              ? Math.abs(task.info.daysRemaining) + ' ngày'
                              : ''}{' '}
                            (Hạn: {task.info.deadlineFormatted})
                          </span>
                        </span>
                      ) : urgency === 'due_today' ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-orange-900">
                          <Clock className="size-3" />
                          <span>Hạn chót HÔM NAY ({task.info.deadlineFormatted})</span>
                        </span>
                      ) : urgency === 'due_soon' ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                          <Clock className="size-3" />
                          <span>
                            Sắp tới hạn (còn {task.info.daysRemaining} ngày - Hạn: {task.info.deadlineFormatted})
                          </span>
                        </span>
                      ) : task.info.deadlineFormatted ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-extrabold text-purple-800">
                          <Calendar className="size-3" />
                          <span>
                            Hạn: {task.info.deadlineFormatted}
                            {task.info.daysRemaining !== null ? ` (còn ${task.info.daysRemaining}d)` : ''}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          <span>Chưa có deadline cụ thể</span>
                        </span>
                      )}
                    </div>

                    {/* Meta info: Course, Day, Scheduled time */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-bold">
                        <GraduationCap className="size-3.5 text-purple-600" />
                        <span>{task.course || 'Khóa học'}</span>
                      </span>
                      <span>•</span>
                      <span className="font-extrabold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                        {task.dayLabel}
                      </span>
                      {task.scheduledOn && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3 text-slate-400" />
                            <span>{task.scheduledOn}</span>
                            {task.startTime && <span>({task.startTime} - {task.endTime})</span>}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Instruction / Note */}
                    {task.info.instruction ? (
                      <div className="text-xs bg-purple-50/60 border border-purple-100 rounded-xl px-3 py-1.5 text-purple-950 font-medium flex items-center gap-2">
                        <span className="text-[11px] font-extrabold text-purple-700 uppercase shrink-0">
                          📌 Dặn dò:
                        </span>
                        <span>{task.info.instruction}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        {task.lessonNotes ? (
                          <div className="line-clamp-1 text-slate-600">
                            {task.lessonNotes.replace(/\[Take notes[^\]]*\]/gi, '').trim() || 'Yêu cầu Take Notes'}
                          </div>
                        ) : (
                          'Yêu cầu chữa Take Notes cho buổi học này'
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Edit Deadline Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTask(task)}
                    className="h-8 text-xs font-semibold text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl cursor-pointer"
                    title="Đổi hạn chót hoặc dặn dò"
                  >
                    <Clock className="size-3.5 mr-1" />
                    <span>Hạn chót</span>
                  </Button>

                  {/* Student Sessions History */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenStudentSessions(task.studentCode)}
                    className="h-8 text-xs font-bold text-slate-700 hover:text-slate-950 rounded-xl cursor-pointer"
                    title="Xem toàn bộ lịch sử học của học viên này"
                  >
                    <Users className="size-3.5 mr-1" />
                    <span>Học viên</span>
                  </Button>

                  {/* Detail / Grade button */}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenDetail(task)}
                    className="h-8 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="size-3.5 mr-1" />
                    <span>Chữa bài / Chi tiết</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Deadline Dialog */}
      {editingTask && (
        <TakeNotesDeadlineDialog
          open={Boolean(editingTask)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingTask(null)
          }}
          currentNote={editingTask.lessonNotes}
          sessionTitle={`${editingTask.dayLabel} - ${editingTask.studentName} (${editingTask.course})`}
          onSave={handleSaveDeadline}
        />
      )}
    </div>
  )
}
