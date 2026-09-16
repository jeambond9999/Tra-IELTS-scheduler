import { BookOpen, CheckCircle2, History, Loader2, Save, Sparkles, Tag, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { StudentSessionItem } from '../types'
import { QuickTagChips, TagBadges } from './note-tags'

export interface StructuredNoteData {
  strengths: string
  improvements: string
  otherNotes: string
  tags: string[]
  isStructured: boolean
}

export function parseStructuredNote(raw: string | null | undefined): StructuredNoteData {
  if (!raw || !raw.trim()) {
    return { strengths: '', improvements: '', otherNotes: '', tags: [], isStructured: false }
  }

  const tags: string[] = []
  const textWithoutTags = raw.replace(/\[([^\]]+)\]/g, (_, tag) => {
    tags.push(tag.trim())
    return ''
  }).trim()

  const strengthsMatch = textWithoutTags.match(
    /(?:🌟\s*)?(?:Điểm tốt|Strengths)\s*:\s*([\s\S]*?)(?=(?:⚡\s*)?(?:Cần cải thiện|Điểm cần cải thiện|Improvements)|(?:📝\s*)?(?:Lưu ý khác|Lưu ý|Other notes|Dặn dò)|$)/i
  )
  const improvementsMatch = textWithoutTags.match(
    /(?:⚡\s*)?(?:Cần cải thiện|Điểm cần cải thiện|Improvements)\s*:\s*([\s\S]*?)(?=(?:📝\s*)?(?:Lưu ý khác|Lưu ý|Dặn dò|Other notes)|$)/i
  )
  const otherNotesMatch = textWithoutTags.match(
    /(?:📝\s*)?(?:Lưu ý khác|Lưu ý|Dặn dò|Other notes)\s*:\s*([\s\S]*?)$/i
  )

  if (strengthsMatch || improvementsMatch || otherNotesMatch) {
    return {
      strengths: strengthsMatch ? strengthsMatch[1].trim() : '',
      improvements: improvementsMatch ? improvementsMatch[1].trim() : '',
      otherNotes: otherNotesMatch ? otherNotesMatch[1].trim() : '',
      tags,
      isStructured: true,
    }
  }

  return {
    strengths: '',
    improvements: '',
    otherNotes: textWithoutTags,
    tags,
    isStructured: false,
  }
}

export function serializeStructuredNote(data: {
  strengths?: string
  improvements?: string
  otherNotes?: string
  tags?: string[]
}): string {
  const parts: string[] = []
  if (data.tags && data.tags.length > 0) {
    parts.push(data.tags.map((t) => `[${t}]`).join(' '))
  }
  const s = data.strengths?.trim()
  const i = data.improvements?.trim()
  const o = data.otherNotes?.trim()

  if (s) parts.push(`🌟 Điểm tốt: ${s}`)
  if (i) parts.push(`⚡ Cần cải thiện: ${i}`)
  if (o) parts.push(`📝 Lưu ý khác: ${o}`)

  return parts.join('\n')
}

/**
 * Hiển thị ghi chú buổi học thống nhất
 */
export function StructuredNoteDisplay({
  note,
  compact = false,
  className,
}: {
  note: string | null | undefined
  compact?: boolean
  className?: string
}) {
  if (!note || !note.trim()) return null

  const parsed = parseStructuredNote(note)

  if (!parsed.isStructured && !parsed.tags.length && !parsed.otherNotes) {
    return null
  }

  if (compact) {
    return (
      <div className={cn('flex flex-col gap-1 text-[11px]', className)}>
        {parsed.tags.length > 0 && <TagBadges text={parsed.tags.map((t) => `[${t}]`).join(' ')} />}
        {parsed.isStructured ? (
          <div className="flex flex-col gap-1">
            {parsed.strengths && (
              <div className="flex items-start gap-1 text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-2 py-0.5 rounded-md leading-tight">
                <span className="font-extrabold shrink-0">🌟 Tốt:</span>
                <span>{parsed.strengths}</span>
              </div>
            )}
            {parsed.improvements && (
              <div className="flex items-start gap-1 text-amber-900 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-md leading-tight">
                <span className="font-extrabold shrink-0">⚡ Cải thiện:</span>
                <span>{parsed.improvements}</span>
              </div>
            )}
            {parsed.otherNotes && (
              <div className="flex items-start gap-1 text-slate-700 bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 rounded-md leading-tight">
                <span className="font-extrabold shrink-0">📝 Lưu ý:</span>
                <span>{parsed.otherNotes}</span>
              </div>
            )}
          </div>
        ) : (
          parsed.otherNotes && (
            <div className="text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md italic">
              📝 {parsed.otherNotes}
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2 rounded-xl p-3 text-xs', className)}>
      {parsed.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mb-0.5">
          <TagBadges text={parsed.tags.map((t) => `[${t}]`).join(' ')} />
        </div>
      )}

      {parsed.isStructured ? (
        <div className="flex flex-col gap-2">
          {parsed.strengths && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-emerald-950">
              <span className="font-black text-emerald-800 flex items-center gap-1 mb-0.5 uppercase text-[10px] tracking-wider">
                <span>🌟</span> Điểm tốt:
              </span>
              <p className="font-medium whitespace-pre-line text-xs">{parsed.strengths}</p>
            </div>
          )}

          {parsed.improvements && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-amber-950">
              <span className="font-black text-amber-800 flex items-center gap-1 mb-0.5 uppercase text-[10px] tracking-wider">
                <span>⚡</span> Điểm cần cải thiện:
              </span>
              <p className="font-medium whitespace-pre-line text-xs">{parsed.improvements}</p>
            </div>
          )}

          {parsed.otherNotes && (
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800">
              <span className="font-black text-slate-700 flex items-center gap-1 mb-0.5 uppercase text-[10px] tracking-wider">
                <span>📝</span> Lưu ý khác / Dặn dò:
              </span>
              <p className="font-medium whitespace-pre-line text-xs">{parsed.otherNotes}</p>
            </div>
          )}
        </div>
      ) : (
        parsed.otherNotes && (
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800">
            <span className="font-black text-slate-700 flex items-center gap-1 mb-0.5 uppercase text-[10px] tracking-wider">
              <span>📝</span> Ghi chú:
            </span>
            <p className="font-medium whitespace-pre-line text-xs">{parsed.otherNotes}</p>
          </div>
        )
      )}
    </div>
  )
}

/**
 * Thẻ hiển thị gợi nhớ ghi chú buổi học trước
 */
export function PreviousSessionNoteCard({
  previousSession,
  currentLessonDayLabel,
  className,
}: {
  previousSession: StudentSessionItem | null | undefined
  currentLessonDayLabel?: string
  className?: string
}) {
  const prevDayLabel =
    previousSession?.dayLabel || previousSession?.day_label || 'Buổi trước'
  const prevScheduledOn =
    previousSession?.scheduledOn || previousSession?.scheduled_on || ''
  const prevNotes =
    previousSession?.lessonNotes ?? previousSession?.lesson_notes ?? ''

  return (
    <div
      className={cn(
        'rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-2 flex flex-col justify-between shadow-2xs',
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-indigo-100/80">
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
            <History className="size-3.5 text-indigo-600" />
            <span>Ghi chú từ buổi học trước</span>
          </span>
          {previousSession ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
              {prevDayLabel} {prevScheduledOn ? `• ${prevScheduledOn}` : ''}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
              Chưa có
            </span>
          )}
        </div>

        <div className="pt-2">
          {previousSession ? (
            prevNotes && prevNotes.trim() ? (
              <StructuredNoteDisplay
                note={prevNotes}
                className="bg-white/90 border border-indigo-200/60 p-2.5"
              />
            ) : (
              <div className="p-3 rounded-xl bg-white/70 border border-dashed border-indigo-200 text-center">
                <p className="text-xs font-bold text-slate-500">
                  Buổi học trước ({prevDayLabel}) chưa có ghi chú nào.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  GV có thể bắt đầu điền ghi chú cho buổi học này ở cột bên cạnh.
                </p>
              </div>
            )
          ) : (
            <div className="p-3 rounded-xl bg-white/70 border border-dashed border-indigo-200 text-center">
              <p className="text-xs font-bold text-indigo-950">
                🎉 Đây là buổi học đầu tiên ({currentLessonDayLabel || 'Day 1'}).
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chưa có buổi học trước đó. Ghi chú của bạn hôm nay sẽ hiển thị làm gợi nhớ cho buổi Day 2!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Trình soạn thảo ghi chú buổi học theo format chuẩn 3 phần: Điểm tốt, Cải thiện, Lưu ý khác
 */
export function StructuredNoteEditor({
  initialNote,
  role,
  onSave,
  isSaving = false,
  currentDayLabel,
  previousSession,
  className,
}: {
  initialNote: string
  role: 'teacher' | 'sales' | 'cs' | 'admin'
  onSave: (serializedNote: string) => Promise<void> | void
  isSaving?: boolean
  currentDayLabel?: string
  previousSession?: StudentSessionItem | null
  className?: string
}) {
  const isTeacher = role === 'teacher'
  const parsed = parseStructuredNote(initialNote)

  const [strengths, setStrengths] = useState(parsed.strengths)
  const [improvements, setImprovements] = useState(parsed.improvements)
  const [otherNotes, setOtherNotes] = useState(parsed.otherNotes)
  const [tags, setTags] = useState<string[]>(parsed.tags)

  // Reset when initialNote changes
  useEffect(() => {
    const next = parseStructuredNote(initialNote)
    setStrengths(next.strengths)
    setImprovements(next.improvements)
    setOtherNotes(next.otherNotes)
    setTags(next.tags)
  }, [initialNote])

  const handleToggleTag = (updatedNoteWithTag: string) => {
    const next = parseStructuredNote(updatedNoteWithTag)
    setTags(next.tags)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const serialized = serializeStructuredNote({
      strengths,
      improvements,
      otherNotes,
      tags: isTeacher ? (parsed.tags.length > 0 ? parsed.tags : tags) : tags, // Preserve existing CS tags when teacher saves
    })
    onSave(serialized)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Cột 1: Gợi nhớ lại thông tin từ buổi trước */}
        <PreviousSessionNoteCard
          previousSession={previousSession}
          currentLessonDayLabel={currentDayLabel}
          className="h-full"
        />

        {/* Cột 2: Ghi chú cho buổi học này */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-emerald-200/80">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <span>✏️</span>
              <span>Ghi chú buổi này ({currentDayLabel || 'Hôm nay'})</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
              Format 3 phần
            </span>
          </div>

          {/* Tag chips: chỉ hiển thị cho CS / Sales / Admin, ẨN HOÀN TOÀN với GV */}
          {!isTeacher && (
            <div className="space-y-1.5 pb-2 border-b border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Tag className="size-3 text-slate-400" />
                <span>Gắn tag nhanh (chỉ CSKH quản lý):</span>
              </span>
              <QuickTagChips
                currentNote={tags.map((t) => `[${t}]`).join(' ')}
                onToggleTag={handleToggleTag}
              />
            </div>
          )}

          {/* Ô 1: Điểm tốt */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-emerald-900 flex items-center gap-1">
              <span>🌟</span>
              <span>Điểm tốt:</span>
            </label>
            <Textarea
              rows={2}
              placeholder="VD: Phát âm rõ, nắm từ vựng bài 2 nhanh, tương tác tự tin..."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="bg-white text-xs border-emerald-200 focus:border-emerald-500 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Ô 2: Điểm cần cải thiện */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
              <span>⚡</span>
              <span>Điểm cần cải thiện:</span>
            </label>
            <Textarea
              rows={2}
              placeholder="VD: Chú ý thì quá khứ đơn, phát âm đuôi /s/ và /ed/, phản xạ Part 2 còn chậm..."
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="bg-white text-xs border-amber-200 focus:border-amber-500 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Ô 3: Lưu ý khác / Dặn dò */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
              <span>📝</span>
              <span>Lưu ý khác / Dặn dò:</span>
            </label>
            <Textarea
              rows={2}
              placeholder="VD: BTVN bài 3 & 4 sách Foundation, buổi tới chuẩn bị chủ đề Family..."
              value={otherNotes}
              onChange={(e) => setOtherNotes(e.target.value)}
              className="bg-white text-xs border-slate-200 focus:border-slate-400 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs h-9 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Lưu ghi chú buổi học</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
