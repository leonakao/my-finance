import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const updateSpy = vi.fn()
const eqSpy = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: updateSpy,
    })),
  },
}))

import { useTransactionEditing } from './useTransactionEditing'

describe('useTransactionEditing', () => {
  it('sends selected budget_group_id to supabase update', async () => {
    const transactions = [
      {
        id: 'tx-1',
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: null,
      },
    ]
    const setTransactions = vi.fn()
    const setError = vi.fn()
    const createRuleFromTransaction = vi.fn()

    eqSpy.mockResolvedValue({ error: null })
    updateSpy.mockReturnValue({ eq: eqSpy })

    const { result } = renderHook(() =>
      useTransactionEditing(transactions, setTransactions, setError, createRuleFromTransaction),
    )

    await act(async () => {
      await result.current.saveTransactionEdit('tx-1', {
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-2',
      })
    })

    expect(updateSpy).toHaveBeenCalledWith({
      type: 'Despesa',
      category: 'Outros',
      budget_group_id: 'group-2',
    })
    expect(eqSpy).toHaveBeenCalledWith('id', 'tx-1')
  })

  it('clears budget_group_id for transferência', async () => {
    const transactions = [
      {
        id: 'tx-1',
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
      },
    ]
    const setTransactions = vi.fn()
    const setError = vi.fn()
    const createRuleFromTransaction = vi.fn()

    eqSpy.mockResolvedValue({ error: null })
    updateSpy.mockReturnValue({ eq: eqSpy })

    const { result } = renderHook(() =>
      useTransactionEditing(transactions, setTransactions, setError, createRuleFromTransaction),
    )

    await act(async () => {
      await result.current.saveTransactionEdit('tx-1', {
        type: 'Transferência',
        category: 'Outros',
        budgetGroupId: 'group-1',
      })
    })

    expect(updateSpy).toHaveBeenCalledWith({
      type: 'Transferência',
      category: 'Outros',
      budget_group_id: null,
    })
  })
})
