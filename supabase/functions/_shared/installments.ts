import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
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

function monthIndexOf(isoDate: string): number | null {
  const parts = isoParts(isoDate)
  if (!parts) return null
  return parts.year * 12 + (parts.month - 1)
}

function anchorMonthIndex(date: string, current: number): number | null {
  const monthIndex = monthIndexOf(date)
  if (monthIndex === null) return null
  return monthIndex - (current - 1)
}

function centsOf(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Remove do lote compras parceladas cujo cronograma já foi importado antes
 * (mesma descrição, valor e total de parcelas, com âncora até 2 meses de
 * distância). O purchaseKey muda entre faturas — posição da linha no arquivo
 * e deriva de ciclo na data original — então o conflito do upsert não captura
 * essas reimportações.
 */
export async function dropInstallmentPurchasesAlreadyImported(
  supabase: SupabaseClient,
  userId: string,
  transactions: ParsedImportedTransaction[],
): Promise<ParsedImportedTransaction[]> {
  type IncomingPurchase = {
    description: string
    amountCents: number
    total: number
    anchorMonth: number | null
  }

  const incomingPurchases = new Map<string, IncomingPurchase>()
  for (const transaction of transactions) {
    const installment = parseInstallment(transaction.installment)
    if (!installment || installment.total === 1) continue
    const purchaseKey = transaction.external_id.replace(/:installment:\d{2}-\d{2}$/, '')
    if (incomingPurchases.has(purchaseKey)) continue
    incomingPurchases.set(purchaseKey, {
      description: transaction.description,
      amountCents: centsOf(transaction.amount),
      total: installment.total,
      anchorMonth: anchorMonthIndex(transaction.date, installment.current),
    })
  }

  if (!incomingPurchases.size) return transactions

  const descriptions = [...new Set([...incomingPurchases.values()].map((purchase) => purchase.description))]
  const { data, error } = await supabase
    .from('transactions')
    .select('date, description, amount, installment, external_id')
    .eq('user_id', userId)
    .neq('installment', '')
    .in('description', descriptions)

  if (error) {
    throw error
  }

  const existingRows: Array<{ date: string; description: string; amount: number; installment: string; external_id: string }> = data ?? []
  const droppedPurchaseKeys = new Set<string>()

  for (const [purchaseKey, purchase] of incomingPurchases) {
    const alreadyImported = existingRows.some((row) => {
      const existingInstallment = parseInstallment(row.installment)
      if (!existingInstallment || existingInstallment.total !== purchase.total) return false
      if (row.description !== purchase.description) return false
      if (centsOf(row.amount) !== purchase.amountCents) return false
      const existingPurchaseKey = row.external_id.replace(/:installment:\d{2}-\d{2}$/, '')
      if (existingPurchaseKey === purchaseKey) return false
      const existingAnchor = anchorMonthIndex(row.date, existingInstallment.current)
      if (existingAnchor === null || purchase.anchorMonth === null) return true
      return Math.abs(existingAnchor - purchase.anchorMonth) <= 2
    })

    if (alreadyImported) {
      droppedPurchaseKeys.add(purchaseKey)
    }
  }

  if (!droppedPurchaseKeys.size) return transactions

  return transactions.filter((transaction) => {
    const purchaseKey = transaction.external_id.replace(/:installment:\d{2}-\d{2}$/, '')
    return !droppedPurchaseKeys.has(purchaseKey)
  })
}

export async function dropTransactionsAlreadyImported(
  supabase: SupabaseClient,
  userId: string,
  transactions: ParsedImportedTransaction[],
): Promise<{ transactions: ParsedImportedTransaction[]; alreadyImportedCount: number }> {
  const withoutInstallmentDuplicates = await dropInstallmentPurchasesAlreadyImported(supabase, userId, transactions)
  const installmentDuplicatesCount = transactions.length - withoutInstallmentDuplicates.length

  if (!withoutInstallmentDuplicates.length) {
    return {
      transactions: withoutInstallmentDuplicates,
      alreadyImportedCount: installmentDuplicatesCount,
    }
  }

  const externalIds = [...new Set(withoutInstallmentDuplicates.map((transaction) => transaction.external_id))]
  const { data, error } = await supabase
    .from('transactions')
    .select('external_id')
    .eq('user_id', userId)
    .in('external_id', externalIds)

  if (error) {
    throw error
  }

  const existingExternalIds = new Set((data ?? []).map((row) => row.external_id))
  const filteredTransactions = withoutInstallmentDuplicates.filter((transaction) => !existingExternalIds.has(transaction.external_id))

  return {
    transactions: filteredTransactions,
    alreadyImportedCount: installmentDuplicatesCount + (withoutInstallmentDuplicates.length - filteredTransactions.length),
  }
}
