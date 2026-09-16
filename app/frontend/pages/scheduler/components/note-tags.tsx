import {
  AlertTriangle,
  BookOpen,
  CalendarOff,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  PauseCircle,
  RefreshCw,
  Sparkles,
  Tag,
  XCircle,
} from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { cn } from '@/lib/utils'
import {
  extractTakeNotesInfo,
  TakeNotesDeadlineDialog,
  removeTakeNotesTag,
} from './take-notes-deadline-dialog'

export type NoteTagPreset = {
  id: string
  label: string
  tag: string
  color: 'amber' | 'rose' | 'sky' | 'indigo' | 'purple' | 'orange' | 'emerald' | 'teal' | 'yellow' | 'slate'
  icon: typeof Tag
}

export const NOTE_TAG_PRESETS: NoteTagPreset[] = [
  {
    id: 'reserved',
    label: 'Đã bảo lưu',
    tag: '[Đã bảo lưu]',
    color: 'amber',
    icon: PauseCircle,
  },
  {
    id: 'excused_absence',
    label: 'Nghỉ có phép',
    tag: '[Nghỉ có phép]',
    color: 'rose',
    icon: CalendarOff,
  },
  {
    id: 'unexcused_absence',
    label: 'Nghỉ không phép',
    tag: '[Nghỉ không phép]',
    color: 'rose',
    icon: XCircle,
  },
  {
    id: 'makeup',
    label: 'Học bù',
    tag: '[Học bù]',
    color: 'sky',
    icon: RefreshCw,
  },
  {
    id: 'rescheduled_time',
    label: 'Đổi giờ',
    tag: '[Đổi giờ]',
    color: 'indigo',
    icon: Clock,
  },
  {
    id: 'take_notes',
    label: 'Take notes',
    tag: '[Take notes]',
    color: 'purple',
    icon: FileText,
  },
  {
    id: 'homework_missing',
    label: 'Chưa làm BTVN',
    tag: '[Chưa làm BTVN]',
    color: 'orange',
    icon: BookOpen,
  },
  {
    id: 'homework_done',
    label: 'Đã nộp BTVN',
    tag: '[Đã nộp BTVN]',
    color: 'emerald',
    icon: CheckCircle2,
  },
  {
    id: 'practice_more',
    label: 'Cần luyện thêm',
    tag: '[Cần luyện thêm]',
    color: 'teal',
    icon: Sparkles,
  },
  {
    id: 'tuition_reminder',
    label: 'Hẹn đóng phí',
    tag: '[Hẹn đóng phí]',
    color: 'yellow',
    icon: CreditCard,
  },
]

/**
 * Toggles a bracketed tag in a note string.
 * If the tag exists, remove it. If not, prepend it.
 */
export function toggleNoteTag(currentText: string, tag: string): string {
  const trimmed = (currentText || '').trim()
  if (trimmed.includes(tag)) {
    return trimmed
      .replace(tag, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }
  return trimmed ? `${tag} ${trimmed}` : tag
}

/**
 * Checks if a note string currently contains a tag.
 */
export function hasNoteTag(currentText: string, tag: string): boolean {
  return (currentText || '').includes(tag)
}

/**
 * Extracts all bracketed tags `[...]` from a text string.
 */
export function extractTagsFromText(text: string | null | undefined): {
  tags: string[]
  cleanText: string
} {
  if (!text) return { tags: [], cleanText: '' }
  const tagMatches = text.match(/\[([^\]]+)\]/g) || []
  let cleanText = text
  for (const match of tagMatches) {
    cleanText = cleanText.replace(match, '')
  }
  return {
    tags: tagMatches,
    cleanText: cleanText.replace(/\s{2,}/g, ' ').trim(),
  }
}

/**
 * Returns Tailwind color styling classes for a given tag.
 */
export function getTagColorClass(tag: string): string {
  const lower = tag.toLowerCase()
  if (lower.includes('bảo lưu') || lower.includes('reserve')) {
    return 'bg-amber-100 text-amber-900 border-amber-300'
  }
  if (lower.includes('nghỉ') || lower.includes('vắng') || lower.includes('absent')) {
    return 'bg-rose-100 text-rose-800 border-rose-300'
  }
  if (lower.includes('học bù') || lower.includes('bù') || lower.includes('makeup')) {
    return 'bg-sky-100 text-sky-800 border-sky-300'
  }
  if (lower.includes('đổi giờ') || lower.includes('đổi lịch') || lower.includes('reschedule')) {
    return 'bg-indigo-100 text-indigo-800 border-indigo-300'
  }
  if (lower.includes('take note') || lower.includes('ghi chú')) {
    if (
      lower.includes('hoàn thành') ||
      lower.includes('đã chữa') ||
      lower.includes('done') ||
      lower.includes('completed')
    ) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300'
    }
    if (lower.includes('quá hạn') || lower.includes('trễ')) {
      return 'bg-rose-100 text-rose-800 border-rose-300'
    }
    return 'bg-purple-100 text-purple-800 border-purple-300'
  }
  if (lower.includes('đã nộp') || lower.includes('hoàn thành') || lower.includes('xong')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-300'
  }
  if (lower.includes('chưa làm') || lower.includes('chưa nộp') || lower.includes('quên')) {
    return 'bg-orange-100 text-orange-800 border-orange-300'
  }
  if (lower.includes('hẹn đóng') || lower.includes('học phí') || lower.includes('tuition')) {
    return 'bg-yellow-100 text-yellow-900 border-yellow-300'
  }
  if (lower.includes('luyện thêm') || lower.includes('cần luyện')) {
    return 'bg-teal-100 text-teal-800 border-teal-300'
  }
  return 'bg-slate-100 text-slate-800 border-slate-300'
}

/**
 * Component to render colored badges for any `[Tag]` inside a note string.
 */
export function TagBadges({
  text,
  className,
  showCleanText = false,
}: {
  text?: string | null
  className?: string
  showCleanText?: boolean
}): ReactElement | null {
  if (!text) return null
  const { tags, cleanText } = extractTagsFromText(text)
  if (tags.length === 0 && !showCleanText) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {tags.map((tag, idx) => (
        <span
          key={idx}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold shadow-2xs transition-colors',
            getTagColorClass(tag)
          )}
        >
          {tag.replace(/^\[|\]$/g, '')}
        </span>
      ))}
      {showCleanText && cleanText && (
        <span className="text-xs text-slate-700 font-medium">{cleanText}</span>
      )}
    </div>
  )
}

/**
 * Interactive Chip Toolbar to quickly toggle tags into a note input.
 */
export function QuickTagChips({
  currentNote,
  onToggleTag,
  presets = NOTE_TAG_PRESETS,
  className,
  sessionTitle,
}: {
  currentNote: string
  onToggleTag: (newNote: string) => void
  presets?: NoteTagPreset[]
  className?: string
  sessionTitle?: string
}): ReactElement {
  const [takeNotesOpen, setTakeNotesOpen] = useState(false)
  const takeNotesInfo = extractTakeNotesInfo(currentNote)

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        <span className="text-[10px] font-bold text-slate-600 mr-0.5 flex items-center gap-1">
          <Tag className="size-3 text-slate-500" /> Gắn tag:
        </span>
        {presets.map((item) => {
          const isTakeNotes = item.id === 'take_notes'
          const active = isTakeNotes ? takeNotesInfo.hasTakeNotes : hasNoteTag(currentNote, item.tag)
          const Icon = item.icon

          const handleClick = () => {
            if (isTakeNotes) {
              setTakeNotesOpen(true)
            } else {
              onToggleTag(toggleNoteTag(currentNote, item.tag))
            }
          }

          let labelText = item.label
          if (isTakeNotes && active) {
            if (takeNotesInfo.isCompleted) {
              labelText = 'Take notes (Đã xong)'
            } else if (takeNotesInfo.deadlineFormatted) {
              labelText = `Take notes (${takeNotesInfo.deadlineFormatted})`
            }
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={handleClick}
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all border shadow-2xs cursor-pointer select-none',
                active
                  ? isTakeNotes && takeNotesInfo.isCompleted
                    ? 'bg-emerald-700 text-white border-emerald-700 font-extrabold ring-1 ring-emerald-700'
                    : isTakeNotes
                    ? 'bg-purple-700 text-white border-purple-700 font-extrabold ring-1 ring-purple-700'
                    : 'bg-slate-900 text-white border-slate-900 font-extrabold ring-1 ring-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              )}
              title={
                isTakeNotes
                  ? active
                    ? 'Bấm để chỉnh sửa hạn chót hoặc xóa tag Take notes'
                    : 'Bấm để đặt hạn chót Take notes'
                  : `Bấm để ${active ? 'bỏ' : 'thêm'} tag ${item.tag}`
              }
            >
              <Icon
                className={cn(
                  'size-3',
                  active ? (isTakeNotes ? 'text-purple-200' : 'text-amber-300') : 'text-slate-500'
                )}
              />
              <span>{labelText}</span>
            </button>
          )
        })}
      </div>

      <TakeNotesDeadlineDialog
        open={takeNotesOpen}
        onOpenChange={setTakeNotesOpen}
        currentNote={currentNote}
        sessionTitle={sessionTitle}
        onSave={(newNote) => {
          onToggleTag(newNote)
        }}
        onRemove={() => {
          onToggleTag(removeTakeNotesTag(currentNote))
        }}
      />
    </>
  )
}
