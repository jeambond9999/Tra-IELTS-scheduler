import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type TakeNotesInfo = {
  hasTakeNotes: boolean
  deadline: string | null // normalized YYYY-MM-DD for <Input type="date">
  deadlineFormatted: string | null // DD/MM/YYYY for display
  deadlineDate: Date | null
  instruction: string
  isCompleted: boolean
  rawTag: string | null
  urgency: 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'no_deadline' | 'completed'
  daysRemaining: number | null
}

/**
 * Parses any [Take notes...] tag from a note string.
 * Supports:
 * - [Take notes: Hạn 15/09/2026 - Dặn dò]
 * - [Take notes: 2026-09-15]
 * - [Take notes: Đã hoàn thành (Hạn 15/09/2026) - Dặn dò]
 * - [Take notes]
 */
export function extractTakeNotesInfo(note: string | null | undefined): TakeNotesInfo {
  if (!note) {
    return {
      hasTakeNotes: false,
      deadline: null,
      deadlineFormatted: null,
      deadlineDate: null,
      instruction: '',
      isCompleted: false,
      rawTag: null,
      urgency: 'no_deadline',
      daysRemaining: null,
    }
  }

  const match = note.match(
    /\[Take notes(?::\s*Hạn\s*|\s*-\s*Hạn\s*|:\s*|(?:\s*Deadline\s*[:\s]*))?([^\]]*)\]/i
  )
  if (!match) {
    return {
      hasTakeNotes: false,
      deadline: null,
      deadlineFormatted: null,
      deadlineDate: null,
      instruction: '',
      isCompleted: false,
      rawTag: null,
      urgency: 'no_deadline',
      daysRemaining: null,
    }
  }

  const rawTag = match[0]
  const rawContent = (match[1] || '').trim()
  const lowerTag = rawTag.toLowerCase()
  const isCompleted =
    lowerTag.includes('hoàn thành') ||
    lowerTag.includes('đã chữa') ||
    lowerTag.includes('done') ||
    lowerTag.includes('completed')

  // Extract deadline date if present (DD/MM/YYYY or YYYY-MM-DD)
  const dateMatch = rawContent.match(
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
  )
  let deadline: string | null = null
  let deadlineFormatted: string | null = null
  let deadlineDate: Date | null = null

  if (dateMatch) {
    const rawDateStr = dateMatch[1]
    if (rawDateStr.includes('-') && rawDateStr.split('-')[0].length === 4) {
      const [y, m, d] = rawDateStr.split('-')
      deadline = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      deadlineFormatted = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
      deadlineDate = new Date(Number(y), Number(m) - 1, Number(d))
    } else {
      const parts = rawDateStr.split(/[\/\-\.]/)
      if (parts.length === 3) {
        let d = parts[0]
        let m = parts[1]
        let y = parts[2]
        if (y.length === 2) y = '20' + y
        deadline = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
        deadlineFormatted = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
        deadlineDate = new Date(Number(y), Number(m) - 1, Number(d))
      }
    }
  }

  // Extract custom instruction / note
  let instruction = ''
  let cleaned = rawContent
  if (dateMatch) {
    cleaned = cleaned.replace(dateMatch[0], '')
  }
  cleaned = cleaned
    .replace(/^(?:Hạn|Deadline|Đã hoàn thành|\(|\)|\-|\:|\s)+/gi, '')
    .replace(/(?:Đã hoàn thành|\(|\)|\-|\:|\s)+$/gi, '')
    .trim()
  if (cleaned) {
    instruction = cleaned
  }

  let urgency: TakeNotesInfo['urgency'] = 'upcoming'
  let daysRemaining: number | null = null

  if (isCompleted) {
    urgency = 'completed'
  } else if (deadlineDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(deadlineDate)
    target.setHours(0, 0, 0, 0)
    const diffTime = target.getTime() - today.getTime()
    daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (daysRemaining < 0) {
      urgency = 'overdue'
    } else if (daysRemaining === 0) {
      urgency = 'due_today'
    } else if (daysRemaining <= 2) {
      urgency = 'due_soon'
    } else {
      urgency = 'upcoming'
    }
  } else {
    urgency = 'no_deadline'
  }

  return {
    hasTakeNotes: true,
    deadline,
    deadlineFormatted,
    deadlineDate,
    instruction,
    isCompleted,
    rawTag,
    urgency,
    daysRemaining,
  }
}

/**
 * Builds a Take Notes tag string and applies it to the note text.
 */
export function applyTakeNotesTag(
  currentText: string,
  deadlineFormatted?: string | null,
  instruction?: string | null,
  isCompleted: boolean = false
): string {
  const cleaned = (currentText || '')
    .replace(/\[Take notes[^\]]*\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  let tagContent = ''
  const trimmedInstr = (instruction || '').trim()

  if (isCompleted) {
    tagContent = 'Take notes: Đã hoàn thành'
    if (deadlineFormatted) tagContent += ` (Hạn ${deadlineFormatted})`
    if (trimmedInstr) tagContent += ` - ${trimmedInstr}`
  } else {
    tagContent = 'Take notes'
    if (deadlineFormatted) tagContent += `: Hạn ${deadlineFormatted}`
    if (trimmedInstr) tagContent += `${deadlineFormatted ? ' - ' : ': '}${trimmedInstr}`
  }

  const fullTag = `[${tagContent}]`
  return cleaned ? `${fullTag} ${cleaned}` : fullTag
}

/**
 * Toggles or marks Take Notes tag as completed.
 */
export function markTakeNotesCompleted(text: string): string {
  const info = extractTakeNotesInfo(text)
  if (!info.hasTakeNotes) return text
  const newTag = info.deadlineFormatted
    ? `[Take notes: Đã hoàn thành (Hạn ${info.deadlineFormatted})${info.instruction ? ` - ${info.instruction}` : ''}]`
    : `[Take notes: Đã hoàn thành${info.instruction ? ` - ${info.instruction}` : ''}]`
  return info.rawTag ? text.replace(info.rawTag, newTag) : text
}

/**
 * Restores Take Notes tag from completed back to active pending.
 */
export function unmarkTakeNotesCompleted(text: string): string {
  const info = extractTakeNotesInfo(text)
  if (!info.hasTakeNotes) return text
  const newTag = info.deadlineFormatted
    ? `[Take notes: Hạn ${info.deadlineFormatted}${info.instruction ? ` - ${info.instruction}` : ''}]`
    : `[Take notes${info.instruction ? `: ${info.instruction}` : ''}]`
  return info.rawTag ? text.replace(info.rawTag, newTag) : text
}

/**
 * Completely removes any Take notes tag from text.
 */
export function removeTakeNotesTag(text: string): string {
  return (text || '')
    .replace(/\[Take notes[^\]]*\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toDisplayDate(iso: string): string {
  if (!iso) return ''
  const parts = iso.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return iso
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export type TakeNotesDeadlineDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentNote: string
  sessionTitle?: string
  onSave: (newNote: string, tagOnly?: string) => void
  onRemove?: () => void
}

export function TakeNotesDeadlineDialog({
  open,
  onOpenChange,
  currentNote,
  sessionTitle,
  onSave,
  onRemove,
}: TakeNotesDeadlineDialogProps): ReactElement {
  const existingInfo = extractTakeNotesInfo(currentNote)

  const [dateVal, setDateVal] = useState<string>('')
  const [instructionVal, setInstructionVal] = useState<string>('')
  const [isCompletedVal, setIsCompletedVal] = useState<boolean>(false)

  useEffect(() => {
    if (open) {
      const info = extractTakeNotesInfo(currentNote)
      if (info.hasTakeNotes && info.deadline) {
        setDateVal(info.deadline)
      } else {
        // Default to +2 days from today
        setDateVal(addDays(2))
      }
      setInstructionVal(info.instruction || '')
      setIsCompletedVal(info.isCompleted)
    }
  }, [open, currentNote])

  const formattedDisplayDate = dateVal ? toDisplayDate(dateVal) : ''
  const previewTag = applyTakeNotesTag('', formattedDisplayDate, instructionVal, isCompletedVal)

  const handleApply = () => {
    const newNote = applyTakeNotesTag(currentNote, formattedDisplayDate, instructionVal, isCompletedVal)
    onSave(newNote, previewTag)
    onOpenChange(false)
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    } else {
      onSave(removeTakeNotesTag(currentNote))
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-lg">
              📝
            </span>
            <div>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Thiết Lập Deadline Take Notes
              </DialogTitle>
              <p className="text-xs text-slate-500">
                {sessionTitle || 'Gắn hạn chót để giáo viên chữa bài đúng hạn'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Chọn ngày hạn chót */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-purple-600" />
                <span>Hạn chót hoàn thành (Ngày / Tháng / Năm):</span>
              </span>
              {formattedDisplayDate && (
                <span className="text-[11px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  {formattedDisplayDate}
                </span>
              )}
            </label>

            <Input
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
              className="h-10 text-sm font-semibold bg-white border-slate-200 focus-visible:ring-purple-500"
            />

            {/* Quick shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-semibold text-slate-600 mr-0.5">Chọn nhanh:</span>
              {[
                { label: 'Hôm nay', days: 0 },
                { label: 'Ngày mai (+1d)', days: 1 },
                { label: '+2 ngày', days: 2 },
                { label: '+3 ngày', days: 3 },
                { label: '+5 ngày', days: 5 },
                { label: '+1 tuần', days: 7 },
              ].map((btn) => {
                const targetIso = addDays(btn.days)
                const isSelected = dateVal === targetIso
                return (
                  <button
                    key={btn.days}
                    type="button"
                    onClick={() => setDateVal(targetIso)}
                    className={cn(
                      'px-2 py-0.5 rounded-lg text-[10px] font-bold transition border cursor-pointer select-none',
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {btn.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dặn dò / Ghi chú thêm cho GV */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="size-3.5 text-slate-500" />
              <span>Dặn dò / Yêu cầu chữa (tùy chọn):</span>
            </label>
            <Input
              type="text"
              placeholder="VD: Chữa Speaking Part 2, Chữa Writing task 1..."
              value={instructionVal}
              onChange={(e) => setInstructionVal(e.target.value)}
              className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-purple-500"
            />
          </div>

          {/* Đã hoàn thành checkbox */}
          {existingInfo.hasTakeNotes && (
            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isCompletedVal}
                  onChange={(e) => setIsCompletedVal(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 size-4 cursor-pointer"
                />
                <span className={cn(isCompletedVal ? 'text-emerald-700 font-bold' : 'text-slate-600')}>
                  {isCompletedVal ? '✅ Đã hoàn thành (Đã chữa xong)' : 'Chưa hoàn thành (Cần chữa)'}
                </span>
              </label>
            </div>
          )}

          {/* Tag Preview */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3 space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1">
              <Sparkles className="size-3" /> Xem trước Tag:
            </span>
            <div className="font-mono text-xs font-bold text-purple-950 break-all">
              {previewTag}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div>
            {existingInfo.hasTakeNotes && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold h-9 cursor-pointer"
              >
                <Trash2 className="size-3.5 mr-1" />
                Xóa Task Take Notes
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold h-9 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="size-3.5 mr-1" />
              Lưu Deadline Take Notes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
