import type { ParsedImportedTransaction } from './budget-groups.ts'

type InstallmentInfo = {
  current: number
  total: number
}

type ExpandInstallmentParams = {
  transaction: ParsedImportedTransaction
  originalDate: string
  purchaseKey: string
}

function isoParts(value: string) {
  const match = value.match(/^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/)
  if (!match?.groups) return null

  return {
    year: Number(match.groups.year),
    month: Number(match.groups.month),
    day: Number(match.groups.day),
  }
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function parseInstallment(value: string): InstallmentInfo | null {
  const match = value.match(/^(?<current>\d{2})\/(?<total>\d{2})$/)
  if (!match?.groups) return null

  const current = Number(match.groups.current)
  const total = Number(match.groups.total)

  if (!Number.isInteger(current) || !Number.isInteger(total) || current < 1 || total < 1 || current > total) {
    return null
  }

  return { current, total }
}

export function addMonthsPreservingDay(isoDate: string, monthsToAdd: number): string {
  const parts = isoParts(isoDate)
  if (!parts) return isoDate

  const monthIndex = parts.month - 1 + monthsToAdd
  const year = parts.year + Math.floor(monthIndex / 12)
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12
  const month = normalizedMonthIndex + 1
  const day = Math.min(parts.day, daysInMonth(year, month))

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

export function formatInstallment(current: number, total: number): string {
  return `${current.toString().padStart(2, '0')}/${total.toString().padStart(2, '0')}`
}

export function buildInstallmentExternalId(purchaseKey: string, current: number, total: number): string {
  return `${purchaseKey}:installment:${current.toString().padStart(2, '0')}-${total.toString().padStart(2, '0')}`
}

export function expandInstallmentSchedule(params: ExpandInstallmentParams): ParsedImportedTransaction[] {
  const installment = parseInstallment(params.transaction.installment)
  if (!installment || installment.total === 1) return [params.transaction]

  return Array.from({ length: installment.total }, (_, index) => {
    const current = index + 1
    const installmentLabel = formatInstallment(current, installment.total)

    return {
      ...params.transaction,
      date: addMonthsPreservingDay(params.originalDate, index),
      installment: installmentLabel,
      notes: `Importado de PDF de fatura Santander via Edge Function. Compra original em ${params.originalDate}. Parcela ${installmentLabel}.`,
      external_id: buildInstallmentExternalId(params.purchaseKey, current, installment.total),
    }
  })
}
