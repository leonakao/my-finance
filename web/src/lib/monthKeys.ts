function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

export function monthParts(monthKey: string): { year: number; month: number } | null {
  const match = /^(?<year>\d{4})-(?<month>\d{2})$/.exec(monthKey)
  if (!match?.groups) {
    return null
  }

  const year = Number(match.groups.year)
  const month = Number(match.groups.month)
  if (month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

export function getLocalDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`
}

export function getCurrentMonthKey(now = new Date()): string {
  return getLocalDateKey(now).slice(0, 7)
}

export function addMonthsToMonthKey(monthKey: string, delta: number): string {
  const parts = monthParts(monthKey)
  if (!parts) {
    return monthKey
  }

  const monthIndex = parts.month - 1 + delta
  const year = parts.year + Math.floor(monthIndex / 12)
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12

  return `${year}-${padDatePart(normalizedMonthIndex + 1)}`
}

export function compareMonthKeys(left: string, right: string): number {
  return left.localeCompare(right)
}

export function getLastDayOfMonth(monthKey: string): number | null {
  const parts = monthParts(monthKey)
  if (!parts) {
    return null
  }

  return new Date(parts.year, parts.month, 0).getDate()
}

export function buildExpectedDateKey(monthKey: string, expectedDayOfMonth: number): string | null {
  const lastDay = getLastDayOfMonth(monthKey)
  if (lastDay === null || !Number.isInteger(expectedDayOfMonth) || expectedDayOfMonth < 1) {
    return null
  }

  return `${monthKey}-${padDatePart(Math.min(expectedDayOfMonth, lastDay))}`
}

export function getRemainingMonthTime(now = new Date()): {
  daysRemaining: number
  weeksRemaining: number
} {
  const lastDay = getLastDayOfMonth(getCurrentMonthKey(now)) ?? now.getDate()
  const daysRemaining = Math.max(0, lastDay - now.getDate() + 1)

  return {
    daysRemaining,
    weeksRemaining: Math.ceil(daysRemaining / 7),
  }
}
