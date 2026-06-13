import { addMonthsToMonthKey, getCurrentMonthKey, getLastDayOfMonth } from './monthKeys'
import type { Transaction, TransactionEditPayload } from '../types'

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function getDayOfMonth(date: string | null | undefined): number | null {
  if (date === null || date === undefined || date === '' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null
  }

  return Number(date.slice(8, 10))
}

export function buildRecurringChildDate(monthKey: string, anchorDate: string | null | undefined): string | null {
  const dayOfMonth = getDayOfMonth(anchorDate)
  const lastDay = getLastDayOfMonth(monthKey)

  if (dayOfMonth === null || lastDay === null) {
    return null
  }

  return `${monthKey}-${padDatePart(Math.min(dayOfMonth, lastDay))}`
}

export function buildRecurringMonthKeys(anchorDate: string | null | undefined, endMonth: string | null | undefined): string[] {
  if (
    anchorDate === null
    || anchorDate === undefined
    || anchorDate === ''
    || endMonth === null
    || endMonth === undefined
    || endMonth === ''
    || !/^\d{4}-\d{2}$/.test(endMonth)
  ) {
    return []
  }

  const anchorMonth = anchorDate.slice(0, 7)
  if (endMonth <= anchorMonth) {
    return []
  }

  const months: string[] = []
  for (let month = addMonthsToMonthKey(anchorMonth, 1); month <= endMonth; month = addMonthsToMonthKey(month, 1)) {
    months.push(month)
  }

  return months
}

export function isFutureDerivedTransaction(transaction: Transaction, now = new Date()): boolean {
  if (
    transaction.originTransactionId === null
    || transaction.originTransactionId === undefined
    || transaction.originTransactionId === ''
    || transaction.date === null
    || transaction.date === undefined
    || transaction.date === ''
  ) {
    return false
  }

  return transaction.date.slice(0, 7) > getCurrentMonthKey(now)
}

export function buildRecurringDerivedValues(
  anchor: Transaction,
  payload: TransactionEditPayload,
): {
  description: string
  amount: number
  type: TransactionEditPayload['type']
  category: string
  budgetGroupId: string | null
  notes: string
} {
  const nextType = payload.type

  return {
    description: anchor.description,
    amount: anchor.amount,
    type: nextType,
    category: payload.category,
    budgetGroupId: nextType === 'Receita' ? null : (payload.budgetGroupId ?? null),
    notes: payload.notes ?? anchor.notes ?? '',
  }
}
