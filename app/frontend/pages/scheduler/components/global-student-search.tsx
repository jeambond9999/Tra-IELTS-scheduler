import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Search,
  Sparkles,
  TriangleAlert,
  User,
  Users,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AdminTeacherStat, SchedulerProps } from '../types'

type StudentItem = {
  studentName: string
  studentCode: string
  course: string
  teacherName?: string
  aim?: string
  studentNote?: string
  total: number
  completed: number
  remaining: number
  almostEnd: boolean
}

type Props = {
  students: SchedulerProps['studentTracking']
  adminStats?: AdminTeacherStat[]
  onSelectStudent: (studentCode: string) => void
}

export function GlobalStudentSearch({ students, adminStats, onSelectStudent }: Props) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Aggregate all students across adminStats (all teachers) or current students list
  const allStudents = useMemo(() => {
    const map = new Map<string, StudentItem>()

    if (adminStats && adminStats.length > 0) {
      adminStats.forEach((stat) => {
        stat.studentTracking.forEach((s) => {
          const key = `${s.studentCode}-${s.course}`
          if (!map.has(key)) {
            map.set(key, {
              studentName: s.studentName,
              studentCode: s.studentCode,
              course: s.course,
              teacherName: stat.teacherName,
              aim: s.aim,
              studentNote: s.studentNote,
              total: s.total,
              completed: s.completed,
              remaining: s.remaining,
              almostEnd: s.almostEnd,
            })
          }
        })
      })
    }

    students.forEach((s) => {
      const key = `${s.studentCode}-${s.course}`
      if (!map.has(key)) {
        map.set(key, {
          studentName: s.studentName,
          studentCode: s.studentCode,
          course: s.course,
          aim: s.aim,
          studentNote: s.studentNote,
          total: s.total,
          completed: s.completed,
          remaining: s.remaining,
          almostEnd: s.almostEnd,
        })
      }
    })

    return Array.from(map.values())
  }, [students, adminStats])

  // Filter students based on query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allStudents.filter((s) => {
      return (
        s.studentName?.toLowerCase().includes(q) ||
        s.studentCode?.toLowerCase().includes(q) ||
        s.course?.toLowerCase().includes(q) ||
        s.teacherName?.toLowerCase().includes(q) ||
        s.aim?.toLowerCase().includes(q) ||
        s.studentNote?.toLowerCase().includes(q)
      )
    })
  }, [allStudents, query])

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (studentCode: string) => {
    setIsOpen(false)
    setQuery('')
    onSelectStudent(studentCode)
  }

  return (
    <div ref={containerRef} className="relative w-full sm:w-72 md:w-80">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Tìm nhanh học viên, mã HV..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          className="h-10 pl-10 pr-14 rounded-2xl text-xs bg-slate-50 border-slate-200 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs placeholder:text-slate-400 placeholder:font-medium transition-all"
        />
        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-none">
          {query ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setQuery('')
                inputRef.current?.focus()
              }}
              className="pointer-events-auto text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="size-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400 shadow-2xs">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Live Dropdown Results */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl overflow-hidden max-h-96 overflow-y-auto w-[320px] sm:w-[380px]">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 text-[11px] font-extrabold text-slate-500">
            <span>
              Kết quả tìm kiếm ({filtered.length} học viên)
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Click để xem toàn bộ lộ trình
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400">
              Không tìm thấy học viên nào khớp với "{query}".
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 pt-2">
              {filtered.map((s) => (
                <div
                  key={`${s.studentCode}-${s.course}`}
                  onClick={() => handleSelect(s.studentCode)}
                  className="flex items-center justify-between gap-3 rounded-2xl p-2.5 transition hover:bg-emerald-50/60 hover:border-emerald-200 border border-transparent cursor-pointer group"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-800 transition truncate">
                        {s.studentName}
                      </span>
                      {s.almostEnd && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded-md shrink-0">
                          ⚠️ Sắp end
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">
                        {s.studentCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                      <span className="font-semibold text-slate-700 truncate">{s.course}</span>
                      {s.aim && (
                        <span className="text-emerald-700 font-bold shrink-0">
                          • Aim {s.aim}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.teacherName && (
                      <Badge variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-700 max-w-[100px] truncate">
                        {s.teacherName}
                      </Badge>
                    )}
                    <div className="text-right">
                      <span className="font-mono text-[11px] font-extrabold text-slate-700 block">
                        {s.completed}/{s.total}b
                      </span>
                    </div>
                    <ArrowRight className="size-3.5 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
