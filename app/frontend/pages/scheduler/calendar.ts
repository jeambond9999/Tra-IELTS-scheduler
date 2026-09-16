export const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'] as const
export const WEEKS = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4', 'Tuần 5'] as const

export function blocksForDuration(durationMinutes: number) {
  return Math.max(1, Math.ceil(durationMinutes / 20))
}

export function caFromDuration(durationMinutes: number) {
  return durationMinutes / 40
}

export function monthOptions(baseYear = 2026) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const key = `${baseYear}-${String(month).padStart(2, '0')}`

    return {
      key,
      label: `Tháng ${month}/${baseYear}`,
    }
  })
}

export function getWeekRangeForWeek(monthKey: string, weekName: string): string {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr || '2026', 10)
  const month = parseInt(monthStr || '1', 10)
  const firstDay = new Date(year, month - 1, 1)
  const dayOfWeek = firstDay.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = (dayOfWeek + 6) % 7
  const firstMonday = new Date(year, month - 1, 1 - diffToMonday)

  const weekIndex = Math.max(0, parseInt(weekName.replace(/\D/g, '') || '1', 10) - 1)
  const monday = new Date(firstMonday)
  monday.setDate(firstMonday.getDate() + weekIndex * 7)
  let sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  // If this is the last week (Tuần 5), and the month ends after this Sunday,
  // extend the display date to the end of the month
  if (weekIndex === 4) {
    const lastDayOfMonth = new Date(year, month, 0)
    if (lastDayOfMonth > sunday) {
      sunday = lastDayOfMonth
    }
  }

  const format = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${format(monday)} - ${format(sunday)}`
}

export function getFormattedWeekLabel(monthKey: string, weekName: string): string {
  return `${weekName} (${getWeekRangeForWeek(monthKey, weekName)})`
}

export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getCurrentWeekName(date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const firstDay = new Date(year, month - 1, 1)
  const dayOfWeek = firstDay.getDay()
  const diffToMonday = (dayOfWeek + 6) % 7
  const firstMonday = new Date(year, month - 1, 1 - diffToMonday)

  const diffMs = date.getTime() - firstMonday.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const weekIndex = Math.max(0, Math.min(4, Math.floor(diffDays / 7)))
  return `Tuần ${weekIndex + 1}`
}

export function formatMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-')
  if (!monthStr || !yearStr) return monthKey
  return `${monthStr.padStart(2, '0')}/${yearStr}`
}
