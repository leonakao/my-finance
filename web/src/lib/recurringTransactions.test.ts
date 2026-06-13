import { describe, expect, it } from 'vitest'
import {
  buildRecurringChildDate,
  buildRecurringMonthKeys,
  isFutureDerivedTransaction,
} from './recurringTransactions'

describe('recurringTransactions', () => {
  it('starts the series in the month after the anchor and excludes the anchor month', () => {
    expect(buildRecurringMonthKeys('2026-06-15', '2026-08')).toEqual([
      '2026-07',
      '2026-08',
    ])
    expect(buildRecurringMonthKeys('2026-06-15', '2026-06')).toEqual([])
  })

  it('clamps recurring child dates to the last day of the month', () => {
    expect(buildRecurringChildDate('2026-02', '2026-01-31')).toBe('2026-02-28')
  })

  it('detects only future derived transactions', () => {
    expect(isFutureDerivedTransaction({
      id: 'tx-1',
      date: '2026-07-15',
      description: 'Emprestimo',
      amount: 200,
      type: 'Despesa',
      category: 'Outros',
      budgetGroupId: null,
      originTransactionId: 'anchor-1',
    }, new Date('2026-06-10T12:00:00Z'))).toBe(true)

    expect(isFutureDerivedTransaction({
      id: 'tx-2',
      date: '2026-06-15',
      description: 'Emprestimo',
      amount: 200,
      type: 'Despesa',
      category: 'Outros',
      budgetGroupId: null,
      originTransactionId: 'anchor-1',
    }, new Date('2026-06-10T12:00:00Z'))).toBe(false)
  })
})
