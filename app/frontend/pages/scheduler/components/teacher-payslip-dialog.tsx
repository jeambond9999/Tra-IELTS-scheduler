import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  Edit2,
  Eye,
  GraduationCap,
  Info,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export type TeacherSalaryExtras = {
  demoCa?: number
  aimBonusAmount?: number
  aimBonusCount?: number
  aimBonusNote?: string
  upsaleAmount?: number
  upsaleNote?: string
  customAdjustment?: number
  customNote?: string
}

export const DEMO_SESSION_RATE = 100_000
export const AIM_BONUS_DEFAULT_RATE = 300_000

export function formatVND(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export type TeacherPayslipData = {
  paymentDate: string
  employerName: string
  employeeName: string
  completedCa: number
  rate: number
  demoCa: number
  demoRate: number
  aimBonusAmount: number
  aimBonusNote: string
  upsaleAmount: number
  upsaleNote: string
  customAdjustment: number
  customNote: string
}

type Props = {
  teacherId: number
  teacherName: string
  monthKey: string
  displayMonth: string
  rank: 'standard' | 'expert'
  milestoneName: string
  rate: number
  completedCa: number
  bookedCa?: number
  openCa?: number
  extras?: TeacherSalaryExtras
  canEdit?: boolean
  onSave?: (data: TeacherPayslipData) => void
  trigger?: React.ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TeacherPayslipDialog({
  teacherId: _teacherId,
  teacherName,
  monthKey,
  displayMonth,
  rank,
  milestoneName,
  rate,
  completedCa,
  bookedCa = 0,
  openCa = 0,
  extras = {},
  canEdit: canEditProp,
  onSave,
  trigger,
  isOpen: controlledOpen,
  onOpenChange: setControlledOpen,
}: Props) {
  const canEdit = canEditProp !== undefined ? canEditProp : Boolean(onSave)
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen

  // Form states initialized from props
  const [paymentDate, setPaymentDate] = useState(`Ngày 05/${monthKey.split('-')[1] || '10'}/${monthKey.split('-')[0] || '2026'}`)
  const [employerName, setEmployerName] = useState('Trung Tâm Trà IELTS')
  const [employeeName, setEmployeeName] = useState(teacherName)

  // Job 1: Ca chính
  const [completedCaInput, setCompletedCaInput] = useState<number>(completedCa)
  const [rateInput, setRateInput] = useState<number>(rate)

  // Job 2: Ca Demo (100k)
  const [demoCaInput, setDemoCaInput] = useState<number>(extras.demoCa ?? 0)
  const [demoRateInput, setDemoRateInput] = useState<number>(DEMO_SESSION_RATE)

  // Job 3: Thưởng Aim
  const defaultAim =
    extras.aimBonusAmount !== undefined
      ? extras.aimBonusAmount
      : (extras.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE
  const [aimAmountInput, setAimAmountInput] = useState<number>(defaultAim)
  const [aimNoteInput, setAimNoteInput] = useState<string>(extras.aimBonusNote || '')

  // Job 4: Thưởng Upsale / Referral
  const [upsaleAmountInput, setUpsaleAmountInput] = useState<number>(extras.upsaleAmount ?? 0)
  const [upsaleNoteInput, setUpsaleNoteInput] = useState<string>(extras.upsaleNote || '')

  // Job 5: Điều chỉnh khác
  const [customAdjustmentInput, setCustomAdjustmentInput] = useState<number>(extras.customAdjustment ?? 0)
  const [customNoteInput, setCustomNoteInput] = useState<string>(extras.customNote || '')

  // Toggle edit vs preview mode (Default to false = pristine view matching template)
  const [rawEditMode, setRawEditMode] = useState<boolean>(false)
  const isEditMode = canEdit && rawEditMode

  // Sync state whenever dialog opens or props change
  useEffect(() => {
    if (open) {
      setRawEditMode(false)
      setEmployeeName(teacherName)
      setCompletedCaInput(completedCa)
      setRateInput(rate)
      setDemoCaInput(extras.demoCa ?? 0)
      setDemoRateInput(DEMO_SESSION_RATE)

      const effAim =
        extras.aimBonusAmount !== undefined
          ? extras.aimBonusAmount
          : (extras.aimBonusCount || 0) * AIM_BONUS_DEFAULT_RATE
      setAimAmountInput(effAim)
      setAimNoteInput(extras.aimBonusNote || '')
      setUpsaleAmountInput(extras.upsaleAmount ?? 0)
      setUpsaleNoteInput(extras.upsaleNote || '')
      setCustomAdjustmentInput(extras.customAdjustment ?? 0)
      setCustomNoteInput(extras.customNote || '')

      const parts = monthKey.split('-')
      if (parts.length === 2) {
        setPaymentDate(`Ngày 05/${parts[1]}/${parts[0]}`)
      }
    }
  }, [open, teacherName, completedCa, rate, extras, monthKey])

  // Calculations
  const mainSalary = useMemo(() => {
    return Math.max(0, completedCaInput) * Math.max(0, rateInput)
  }, [completedCaInput, rateInput])

  const demoSalary = useMemo(() => {
    return Math.max(0, demoCaInput) * Math.max(0, demoRateInput)
  }, [demoCaInput, demoRateInput])

  const aimBonus = useMemo(() => {
    return Math.max(0, aimAmountInput)
  }, [aimAmountInput])

  const upsaleBonus = useMemo(() => {
    return Math.max(0, upsaleAmountInput)
  }, [upsaleAmountInput])

  const customAdjustment = useMemo(() => {
    return customAdjustmentInput || 0
  }, [customAdjustmentInput])

  const totalPayout = useMemo(() => {
    return mainSalary + demoSalary + aimBonus + upsaleBonus + customAdjustment
  }, [mainSalary, demoSalary, aimBonus, upsaleBonus, customAdjustment])

  // Handle Save
  const handleSave = () => {
    const payload: TeacherPayslipData = {
      paymentDate,
      employerName,
      employeeName,
      completedCa: completedCaInput,
      rate: rateInput,
      demoCa: demoCaInput,
      demoRate: demoRateInput,
      aimBonusAmount: aimAmountInput,
      aimBonusNote: aimNoteInput.trim(),
      upsaleAmount: upsaleAmountInput,
      upsaleNote: upsaleNoteInput.trim(),
      customAdjustment: customAdjustmentInput,
      customNote: customNoteInput.trim(),
    }

    if (onSave) {
      onSave(payload)
    }

    toast.success(`Đã lưu phiếu lương cho GV ${employeeName} thành công!`, {
      description: `Tổng thu nhập: ${formatVND(totalPayout)} (${displayMonth})`,
    })
  }

  // Handle Print via dedicated isolated hidden iframe
  const handlePrint = () => {
    const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PAYSLIP - ${employeeName} - ${displayMonth}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #ffffff;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .payslip-box {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 24px;
      border: 1px solid #cbd5e1;
      border-radius: 16px;
      background: #ffffff;
    }
    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .title-group h1 {
      font-size: 38px;
      font-weight: 900;
      color: #0f4c81;
      letter-spacing: -0.5px;
      line-height: 1;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .title-group p {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: #0f4c81 !important;
      color: #ffffff !important;
      padding: 8px 16px;
      border-radius: 10px;
      -webkit-print-color-adjust: exact !important;
    }
    .logo-container .brand-sub {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #bfdbfe !important;
    }
    .logo-container .brand-main {
      font-size: 13px;
      font-weight: 900;
      color: #ffffff !important;
    }
    .metadata-section {
      margin-bottom: 20px;
      max-width: 600px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      font-size: 13px;
    }
    .meta-title {
      width: 155px;
      font-weight: 800;
      color: #0f4c81;
      flex-shrink: 0;
    }
    .meta-field {
      flex: 1;
      background-color: #dbeafe !important;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 800;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
    }
    .jobs-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2.5px solid #0f4c81;
      padding-bottom: 6px;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 900;
      color: #0f4c81;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .jobs-wrapper {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin-bottom: 20px;
    }
    .job-row-item {
      display: flex;
      gap: 12px;
      align-items: stretch;
    }
    .job-content {
      flex: 1;
      background-color: #dbeafe !important;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: center;
      -webkit-print-color-adjust: exact !important;
    }
    .demo-tag {
      font-size: 10px;
      font-weight: 800;
      background-color: #bfdbfe !important;
      color: #1e3a8a !important;
      padding: 2px 7px;
      border-radius: 4px;
      margin-left: 8px;
      white-space: nowrap;
      -webkit-print-color-adjust: exact !important;
    }
    .note-pill {
      font-size: 11px;
      font-weight: 600;
      color: #78350f;
      background-color: #fef3c7 !important;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
      -webkit-print-color-adjust: exact !important;
    }
    .job-calc {
      font-family: monospace;
      font-size: 12px;
      color: #1e3a8a;
      white-space: nowrap;
    }
    .job-rate-val {
      width: 180px;
      background-color: #dbeafe !important;
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 900;
      color: #0f4c81 !important;
      text-align: right;
      font-family: monospace;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      -webkit-print-color-adjust: exact !important;
    }
    .divider-line {
      border-bottom: 2.5px solid #0f4c81;
      margin-bottom: 12px;
    }
    .total-area {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-label-text {
      font-size: 24px;
      font-weight: 900;
      color: #0f4c81;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .total-value-pill {
      background-color: #dbeafe !important;
      padding: 8px 24px;
      border-radius: 6px;
      font-size: 24px;
      font-weight: 900;
      color: #0f4c81 !important;
      font-family: monospace;
      text-align: right;
      min-width: 180px;
      -webkit-print-color-adjust: exact !important;
    }
    .doc-footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="payslip-box">
    <div class="top-header">
      <div class="title-group">
        <h1>PAYSLIP</h1>
        <p>PHIẾU THANH TOÁN THÙ LAO & LƯƠNG GIẢNG DẠY</p>
      </div>
      <div class="logo-container">
        <div style="font-size: 20px;">🎓</div>
        <div>
          <div class="brand-main" style="font-size: 15px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px;">TRÀ IELTS</div>
          <div class="brand-sub" style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #bfdbfe;">English Center</div>
        </div>
      </div>
    </div>

    <div class="metadata-section">
      <div class="meta-item">
        <div class="meta-title">Payment Date:</div>
        <div class="meta-field">${paymentDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-title">Teacher's Name:</div>
        <div class="meta-field">${employeeName} (${rank === 'expert' ? 'Expert ⭐' : 'Standard'} • Mốc ${milestoneName})</div>
      </div>
    </div>

    <div class="jobs-header">
      <div>FOR COMPLETION OF THE FOLLOWING JOBS:</div>
      <div>RATE / AMOUNT:</div>
    </div>

    <div class="jobs-wrapper">
      <div class="job-row-item">
        <div class="job-content">
          <span>1. Ca dạy chính hoàn thành</span>
          <span class="job-calc">${completedCaInput} ca × ${formatVND(rateInput)}</span>
        </div>
        <div class="job-rate-val">${formatVND(mainSalary)}</div>
      </div>

      <div class="job-row-item">
        <div class="job-content">
          <span>2. Ca dạy Demo 1-on-1</span>
          <span class="job-calc">${demoCaInput} ca × ${formatVND(demoRateInput)}</span>
        </div>
        <div class="job-rate-val">${formatVND(demoSalary)}</div>
      </div>

      <div class="job-row-item">
        <div class="job-content">
          <span>3. Thưởng Học viên đạt Aim cao (Speaking / Writing)</span>
          ${aimNoteInput ? `<span class="note-pill">📝 ${aimNoteInput}</span>` : ''}
        </div>
        <div class="job-rate-val">${formatVND(aimBonus)}</div>
      </div>

      <div class="job-row-item">
        <div class="job-content">
          <span>4. Thưởng Upsale / Giới thiệu học viên (Referral)</span>
          ${upsaleNoteInput ? `<span class="note-pill">📝 ${upsaleNoteInput}</span>` : ''}
        </div>
        <div class="job-rate-val">${formatVND(upsaleBonus)}</div>
      </div>

      ${customAdjustment !== 0 || customNoteInput ? `
      <div class="job-row-item">
        <div class="job-content">
          <span>5. Điều chỉnh khác / Phụ cấp / Khấu trừ</span>
          ${customNoteInput ? `<span class="note-pill">📝 ${customNoteInput}</span>` : ''}
        </div>
        <div class="job-rate-val" style="${customAdjustment < 0 ? 'color: #be123c !important;' : ''}">${customAdjustment > 0 ? '+' : ''}${formatVND(customAdjustment)}</div>
      </div>` : ''}
    </div>

    <div class="divider-line"></div>

    <div class="total-area">
      <div class="total-label-text">TOTAL</div>
      <div class="total-value-pill">${formatVND(totalPayout)}</div>
    </div>

    <div class="doc-footer">
      Phiếu chi lương được xuất tự động từ Hệ Thống Quản Lý Lịch & Bảng Tính Lương Trà IELTS — ${displayMonth}.
    </div>
  </div>
</body>
</html>
`

    let iframe = document.getElementById('traielts-print-iframe') as HTMLIFrameElement | null
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'traielts-print-iframe'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.style.opacity = '0'
      iframe.style.pointerEvents = 'none'
      document.body.appendChild(iframe)
    }

    try {
      const iframeDoc = iframe.contentWindow?.document
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(printHtml)
        iframeDoc.close()

        setTimeout(() => {
          try {
            iframe?.contentWindow?.focus()
            iframe?.contentWindow?.print()
          } catch {
            window.print()
          }
        }, 250)
      } else {
        window.print()
      }
    } catch {
      window.print()
    }
  }

  // Handle Copy text summary
  const handleCopySummary = () => {
    const lines = [
      `🧾 PHIẾU LƯƠNG GIẢNG VIÊN — TRÀ IELTS`,
      `📅 Kỳ thanh toán: ${displayMonth} (${paymentDate})`,
      `👤 Giảng viên: ${employeeName} (Hạng: ${rank === 'expert' ? 'Expert' : 'Standard'} | Mốc: ${milestoneName})`,
      `────────────────────────────────────`,
      `1. Ca dạy chính: ${completedCaInput} ca × ${formatVND(rateInput)} = ${formatVND(mainSalary)}`,
      `2. Ca dạy Demo (100k/ca): ${demoCaInput} ca × ${formatVND(demoRateInput)} = ${formatVND(demoSalary)}`,
      aimBonus > 0 ? `3. Thưởng HV Aim cao: ${formatVND(aimBonus)}${aimNoteInput ? ` (${aimNoteInput})` : ''}` : null,
      upsaleBonus > 0 ? `4. Thưởng Upsale/Referral: ${formatVND(upsaleBonus)}${upsaleNoteInput ? ` (${upsaleNoteInput})` : ''}` : null,
      customAdjustment !== 0 ? `5. Điều chỉnh khác: ${customAdjustment > 0 ? '+' : ''}${formatVND(customAdjustment)}${customNoteInput ? ` (${customNoteInput})` : ''}` : null,
      `────────────────────────────────────`,
      `💰 TỔNG LƯƠNG THỰC NHẬN: ${formatVND(totalPayout)}`,
    ].filter(Boolean)

    navigator.clipboard.writeText(lines.join('\n'))
    toast.success('Đã sao chép nội dung phiếu lương!', {
      description: 'Bạn có thể dán (paste) trực tiếp gửi cho Giảng viên qua Zalo / Telegram.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-4xl md:max-w-5xl w-[96vw] max-h-[96vh] overflow-y-auto p-3 sm:p-5 bg-slate-100/95 border-slate-300 shadow-2xl">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">
                🧾
              </span>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Phiếu Lương Giảng Viên (Payslip)
              </DialogTitle>
              <Badge variant="outline" className="text-[11px] font-bold border-blue-300 bg-blue-50 text-blue-800">
                {displayMonth}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {canEdit ? (
                <>
                  Bấm <strong>"Chỉnh sửa ô"</strong> để sửa trực tiếp các ô xanh, hoặc bấm <strong>"In / PDF"</strong> để in trọn vẹn A4.
                </>
              ) : (
                <>
                  Bấm <strong>"In / PDF"</strong> để in trọn vẹn A4, hoặc bấm <strong>"Sao chép"</strong> để gửi tóm tắt.
                </>
              )}
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant={isEditMode ? 'default' : 'outline'}
                onClick={() => setRawEditMode(!rawEditMode)}
                className={cn(
                  'h-8 text-xs font-bold gap-1.5 rounded-xl transition cursor-pointer',
                  isEditMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
                )}
              >
                {isEditMode ? (
                  <>
                    <Eye className="size-3.5" />
                    Xem bản in chuẩn
                  </>
                ) : (
                  <>
                    <Edit2 className="size-3.5" />
                    Chỉnh sửa ô
                  </>
                )}
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCopySummary}
              className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-50 border-slate-300 cursor-pointer"
              title="Sao chép tóm tắt gửi GV qua Zalo"
            >
              <Copy className="size-3.5 text-slate-500" />
              Sao chép
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-black gap-1.5 rounded-xl bg-[#0f4c81] hover:bg-[#0c3c66] text-white shadow-xs cursor-pointer"
              title="In hoặc xuất PDF phiếu lương chuẩn A4"
            >
              <Printer className="size-3.5" />
              In / PDF
            </Button>
          </div>
        </div>

        {/* ── THE PAYSLIP CARD (Spacious & Full View, 100% Matching Template) ── */}
        <div
          id="traielts-payslip-card"
          className="my-2 rounded-2xl border border-slate-300 bg-white p-5 sm:p-7 shadow-sm text-slate-900 transition-all"
          style={{ fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
          {/* Header Row: PAYSLIP + Enterprise Logo Box */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0f4c81] uppercase leading-none">
                PAYSLIP
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                PHIẾU THANH TOÁN THÙ LAO & LƯƠNG GIẢNG DẠY
              </p>
            </div>

            {/* Blue Logo Box (Trà IELTS) */}
            <div className="flex items-center gap-2.5 rounded-xl bg-[#0f4c81] text-white px-4 py-2 shadow-xs shrink-0">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/15 border border-white/20">
                <GraduationCap className="size-5 text-white" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs sm:text-sm font-black tracking-wider text-white">TRÀ IELTS</div>
                <div className="text-[9px] uppercase font-bold tracking-wider text-blue-200">English Center</div>
              </div>
            </div>
          </div>

          {/* Metadata Block: 3 Blue Fields */}
          <div className="space-y-1.5 mb-4 max-w-2xl text-xs sm:text-sm">
            {/* Payment Date */}
            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center gap-2">
              <span className="font-extrabold text-[#0f4c81]">Payment Date:</span>
              {isEditMode ? (
                <input
                  type="text"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-md bg-[#dbeafe] px-3 py-1 font-bold text-slate-800 text-xs sm:text-sm border border-blue-400 focus:outline-hidden"
                  placeholder="Ngày 05/..."
                />
              ) : (
                <div className="w-full rounded-md bg-[#dbeafe] px-3 py-1 font-bold text-slate-800 text-xs sm:text-sm">
                  {paymentDate}
                </div>
              )}
            </div>

            {/* Teacher's Name */}
            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr] items-center gap-2">
              <span className="font-extrabold text-[#0f4c81]">Teacher's Name:</span>
              {isEditMode ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="flex-1 rounded-md bg-[#dbeafe] px-3 py-1 font-black text-slate-900 text-xs sm:text-sm border border-blue-400 focus:outline-hidden"
                    placeholder="Tên Giảng Viên..."
                  />
                  <Badge variant="outline" className="text-[10px] font-bold border-blue-300 bg-white text-blue-900 shrink-0">
                    {rank === 'expert' ? 'Expert ⭐' : 'Standard'} • Mốc {milestoneName}
                  </Badge>
                </div>
              ) : (
                <div className="w-full rounded-md bg-[#dbeafe] px-3 py-1 font-black text-slate-900 text-xs sm:text-sm flex items-center justify-between">
                  <span>{employeeName}</span>
                  <span className="text-[11px] font-bold text-blue-900">
                    ({rank === 'expert' ? 'Expert ⭐' : 'Standard'} • Mốc {milestoneName})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Table Header: FOR COMPLETION OF THE FOLLOWING JOBS:          RATE / AMOUNT: */}
          <div className="border-b-2 border-[#0f4c81] pb-1.5 mb-2.5 flex items-center justify-between text-xs sm:text-sm font-black text-[#0f4c81] uppercase tracking-wide">
            <div>FOR COMPLETION OF THE FOLLOWING JOBS:</div>
            <div className="text-right">RATE / AMOUNT:</div>
          </div>

          {/* Jobs List (Spacious rows with light blue background) */}
          <div className="space-y-2 mb-4">
            {/* ── JOB 1: Ca Dạy Chính Hoàn Thành ── */}
            <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_190px] gap-2.5 items-center">
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
                  <span className="font-extrabold">1. Ca dạy chính hoàn thành</span>
                  <span className="text-xs font-mono font-bold text-blue-950 shrink-0">
                    {completedCaInput} ca × {formatVND(rateInput)}
                  </span>
                </div>
                {isEditMode && (
                  <div className="mt-1.5 flex items-center gap-2 pt-1 border-t border-blue-200/80 flex-wrap">
                    <span className="text-[11px] text-slate-600 font-semibold shrink-0">Số ca:</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={completedCaInput}
                      onChange={(e) => setCompletedCaInput(parseFloat(e.target.value) || 0)}
                      className="w-16 h-6 px-1.5 text-center font-mono font-black text-xs bg-white rounded border border-blue-400"
                    />
                    <span className="text-[11px] text-slate-600 font-semibold shrink-0">Đơn giá:</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={rateInput}
                      onChange={(e) => setRateInput(parseInt(e.target.value, 10) || 0)}
                      className="w-24 h-6 px-1.5 text-center font-mono font-bold text-xs bg-white rounded border border-blue-400"
                    />
                    <span className="text-[10px] text-slate-500 italic ml-auto">
                      (Đã book: {bookedCa} ca | Mở: {openCa} ca)
                    </span>
                  </div>
                )}
              </div>
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-right font-black font-mono text-sm sm:text-base text-[#0f4c81]">
                {formatVND(mainSalary)}
              </div>
            </div>

            {/* ── JOB 2: Ca Dạy Demo (100.000đ/ca) ── */}
            <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_190px] gap-2.5 items-center">
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
                  <span className="font-extrabold">2. Ca dạy Demo 1-on-1</span>
                  <span className="text-xs font-mono font-bold text-blue-950 shrink-0">
                    {demoCaInput} ca × {formatVND(demoRateInput)}
                  </span>
                </div>
                {isEditMode && (
                  <div className="mt-1.5 flex items-center gap-2 pt-1 border-t border-blue-200/80 flex-wrap">
                    <span className="text-[11px] text-slate-600 font-semibold shrink-0">Số ca demo:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={demoCaInput}
                      onChange={(e) => setDemoCaInput(parseInt(e.target.value, 10) || 0)}
                      className="w-16 h-6 px-1.5 text-center font-mono font-black text-xs bg-white rounded border border-blue-400"
                    />
                    <span className="text-[11px] text-slate-600 font-semibold shrink-0">Đơn giá demo:</span>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={demoRateInput}
                      onChange={(e) => setDemoRateInput(parseInt(e.target.value, 10) || 0)}
                      className="w-24 h-6 px-1.5 text-center font-mono font-bold text-xs bg-white rounded border border-blue-400"
                    />
                    <span className="text-[10px] text-blue-900 italic ml-auto font-medium">
                      (Cố định 100k/ca)
                    </span>
                  </div>
                )}
              </div>
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-right font-black font-mono text-sm sm:text-base text-[#0f4c81]">
                {formatVND(demoSalary)}
              </div>
            </div>

            {/* ── JOB 3: Thưởng Học Viên Đạt Aim Cao ── */}
            <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_190px] gap-2.5 items-center">
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold">3. Thưởng HV đạt Aim cao (Speaking / Writing)</span>
                    {aimNoteInput && (
                      <span className="text-[11px] font-medium text-amber-950 bg-amber-100/90 px-2 py-0.5 rounded-md truncate max-w-[260px]">
                        📝 {aimNoteInput}
                      </span>
                    )}
                  </div>
                </div>
                {isEditMode && (
                  <div className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-blue-200/80">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-600 font-semibold shrink-0">Tiền thưởng:</span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={aimAmountInput}
                        onChange={(e) => setAimAmountInput(parseInt(e.target.value, 10) || 0)}
                        className="w-28 h-6 px-1.5 font-mono font-black text-xs bg-white rounded border border-blue-400"
                        placeholder="300000"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-600 font-semibold shrink-0">Ghi chú:</span>
                      <input
                        type="text"
                        value={aimNoteInput}
                        onChange={(e) => setAimNoteInput(e.target.value)}
                        className="flex-1 h-6 px-2 text-xs bg-white rounded border border-blue-400 placeholder:text-slate-400"
                        placeholder="Tên học viên, target đạt..."
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-right font-black font-mono text-sm sm:text-base text-[#0f4c81]">
                {formatVND(aimBonus)}
              </div>
            </div>

            {/* ── JOB 4: Thưởng Upsale & Referral ── */}
            <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_190px] gap-2.5 items-center">
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-xs sm:text-sm">
                <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold">4. Thưởng Upsale / Giới thiệu học viên (Referral)</span>
                    {upsaleNoteInput && (
                      <span className="text-[11px] font-medium text-amber-950 bg-amber-100/90 px-2 py-0.5 rounded-md truncate max-w-[260px]">
                        📝 {upsaleNoteInput}
                      </span>
                    )}
                  </div>
                </div>
                {isEditMode && (
                  <div className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-blue-200/80">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-600 font-semibold shrink-0">Tiền thưởng:</span>
                      <input
                        type="number"
                        min="0"
                        step="50000"
                        value={upsaleAmountInput}
                        onChange={(e) => setUpsaleAmountInput(parseInt(e.target.value, 10) || 0)}
                        className="w-28 h-6 px-1.5 font-mono font-black text-xs bg-white rounded border border-blue-400"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-600 font-semibold shrink-0">Ghi chú:</span>
                      <input
                        type="text"
                        value={upsaleNoteInput}
                        onChange={(e) => setUpsaleNoteInput(e.target.value)}
                        className="flex-1 h-6 px-2 text-xs bg-white rounded border border-blue-400 placeholder:text-slate-400"
                        placeholder="Mã hợp đồng, tên HV upsale..."
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-right font-black font-mono text-sm sm:text-base text-[#0f4c81]">
                {formatVND(upsaleBonus)}
              </div>
            </div>

            {/* ── JOB 5 (Tùy chọn): Phụ cấp / Khấu trừ khác ── */}
            {(isEditMode || customAdjustment !== 0 || customNoteInput) && (
              <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_190px] gap-2.5 items-center">
                <div className="rounded-md bg-[#dbeafe] px-3.5 py-2 text-xs sm:text-sm">
                  <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold">5. Điều chỉnh khác / Phụ cấp / Khấu trừ</span>
                      {customNoteInput && (
                        <span className="text-[11px] font-medium text-slate-800 bg-white/80 px-2 py-0.5 rounded-md truncate max-w-[260px]">
                          📝 {customNoteInput}
                        </span>
                      )}
                    </div>
                  </div>
                  {isEditMode && (
                    <div className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-blue-200/80">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] text-slate-600 font-semibold shrink-0">Số tiền (+ / -):</span>
                        <input
                          type="number"
                          step="10000"
                          value={customAdjustmentInput}
                          onChange={(e) => setCustomAdjustmentInput(parseInt(e.target.value, 10) || 0)}
                          className="w-28 h-6 px-1.5 font-mono font-black text-xs bg-white rounded border border-blue-400"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-600 font-semibold shrink-0">Lý do:</span>
                        <input
                          type="text"
                          value={customNoteInput}
                          onChange={(e) => setCustomNoteInput(e.target.value)}
                          className="flex-1 h-6 px-2 text-xs bg-white rounded border border-blue-400 placeholder:text-slate-400"
                          placeholder="Phụ cấp thêm hoặc khấu trừ..."
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className={cn(
                  'rounded-md bg-[#dbeafe] px-3.5 py-2 text-right font-black font-mono text-sm sm:text-base',
                  customAdjustment < 0 ? 'text-rose-700' : 'text-[#0f4c81]'
                )}>
                  {customAdjustment > 0 ? `+${formatVND(customAdjustment)}` : formatVND(customAdjustment)}
                </div>
              </div>
            )}
          </div>

          {/* Solid Divider Bar above TOTAL */}
          <div className="border-b-2 border-[#0f4c81] mb-2.5" />

          {/* TOTAL ROW (Spacious, bold & matching image) */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-2xl sm:text-3xl font-black text-[#0f4c81] tracking-tight uppercase">
              TOTAL
            </div>
            <div className="rounded-md bg-[#dbeafe] px-6 py-2 text-right font-black font-mono text-2xl sm:text-3xl text-[#0f4c81] shadow-2xs min-w-[190px]">
              {formatVND(totalPayout)}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-2 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-400 font-medium">
            Phiếu chi lương được xuất tự động từ Hệ Thống Quản Lý Lịch & Bảng Tính Lương Trà IELTS — {displayMonth}.
          </div>
        </div>

        {/* Dialog Actions Bottom Bar */}
        <DialogFooter className="mt-2 sm:mt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {canEdit ? (
            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Info className="size-3.5 text-blue-600 shrink-0" />
              <span>Sau khi chỉnh sửa ô, bấm <strong>"Lưu Thay Đổi"</strong> để cập nhật dữ liệu vào bảng tổng hợp.</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Info className="size-3.5 text-slate-400 shrink-0" />
              <span>Phiếu lương ở chế độ xem. Chỉ Quản trị viên (Admin / Sales) mới có quyền chỉnh sửa.</span>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl text-xs font-bold"
            >
              Đóng
            </Button>
            {canEdit && (
              <Button
                type="button"
                onClick={handleSave}
                className="rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-2xs cursor-pointer"
              >
                <Check className="size-4" />
                Lưu Thay Đổi
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
