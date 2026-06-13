import type { Transaction } from '../types'
/* eslint-disable max-lines-per-function */
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const updateEqSpy = vi.fn()
const updateSpy = vi.fn()
const insertSpy = vi.fn()
const deleteEqSpy = vi.fn()
const deleteSpy = vi.fn()
const fromSpy = vi.fn()
const getUserSpy = vi.fn()

vi.mock('../lib/supabase', () => ({
  getSupabaseOrThrow: vi.fn(() => ({
    from: fromSpy,
    auth: {
      getUser: getUserSpy,
    },
  })),
}))

import { useTransactionEditing } from './useTransactionEditing'

describe('useTransactionEditing', () => {
  function mockTransactionsClient() {
    fromSpy.mockReturnValue({
      update: updateSpy,
      insert: insertSpy,
      delete: deleteSpy,
    })
    updateSpy.mockReturnValue({ eq: updateEqSpy })
    deleteSpy.mockReturnValue({ eq: deleteEqSpy })
    updateEqSpy.mockResolvedValue({ error: null })
    deleteEqSpy.mockResolvedValue({ error: null })
    insertSpy.mockResolvedValue({ error: null })
    getUserSpy.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  }

  it('sends selected budget_group_id to supabase update', async () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        description: 'Compra teste',
        amount: 10,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: null,
      },
    ]
    const setTransactions = vi.fn()
    const setError = vi.fn()
    const createRuleFromTransaction = vi.fn()

    mockTransactionsClient()

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
      notes: '',
    })
    expect(updateEqSpy).toHaveBeenCalledWith('id', 'tx-1')
  })

  it('creates a manual transaction and prepends it to local state', async () => {
    const setTransactions = vi.fn()
    const setError = vi.fn()

    fromSpy.mockReturnValue({
      update: updateSpy,
      insert: insertSpy,
      delete: deleteSpy,
    })
    getUserSpy.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    insertSpy.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: {
            id: 'tx-new',
            date: '2026-07-01',
            description: 'Planejado',
            amount: 300,
            type: 'Despesa',
            category: 'Outros',
            budget_group_id: 'group-1',
            account: '',
            institution: '',
            notes: 'Manual',
            installment: '',
            origin_transaction_id: null,
            is_ignored: false,
            source_kind: 'manual',
          },
          error: null,
        })),
      })),
    })

    const { result } = renderHook(() =>
      useTransactionEditing([], setTransactions, setError, vi.fn()),
    )

    await act(async () => {
      const created = await result.current.createManualTransaction({
        date: '2026-07-01',
        description: 'Planejado',
        amount: 300,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
        notes: 'Manual',
      })

      expect(created).toBe(true)
    })

    expect(insertSpy).toHaveBeenCalled()
    expect(setTransactions).toHaveBeenCalled()
  })

  it('keeps budget_group_id for transferência', async () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        description: 'Compra teste',
        amount: 10,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
      },
    ]
    const setTransactions = vi.fn()
    const setError = vi.fn()
    const createRuleFromTransaction = vi.fn()

    mockTransactionsClient()

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
      budget_group_id: 'group-1',
      notes: '',
    })
  })

  it('normalizes invalid categories when the type changes', async () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        description: 'Compra teste',
        amount: 10,
        type: 'Despesa',
        category: 'Alimentação',
        budgetGroupId: null,
      },
    ]
    const setTransactions = vi.fn()
    const setError = vi.fn()
    const createRuleFromTransaction = vi.fn()

    mockTransactionsClient()

    const { result } = renderHook(() =>
      useTransactionEditing(transactions, setTransactions, setError, createRuleFromTransaction),
    )

    await act(async () => {
      await result.current.saveTransactionEdit('tx-1', {
        type: 'Receita',
        category: 'Alimentação',
        budgetGroupId: 'group-1',
      })
    })

    expect(updateSpy).toHaveBeenCalledWith({
      type: 'Receita',
      category: 'Outros',
      budget_group_id: null,
      notes: '',
    })
  })

  it('creates future recurring children for missing months', async () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-06-15',
        description: 'Emprestimo mae',
        amount: 200,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
        account: 'Conta principal',
        institution: 'Nubank',
        notes: 'Combinado familiar',
      },
    ]
    const setTransactions = vi.fn()
    const setError = vi.fn()

    mockTransactionsClient()

    const { result } = renderHook(() =>
      useTransactionEditing(transactions, setTransactions, setError, vi.fn()),
    )

    await act(async () => {
      await result.current.saveTransactionEdit('tx-1', {
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
        notes: 'Combinado familiar',
        recurringUntilMonth: '2026-08',
      })
    })

    expect(insertSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        date: '2026-07-15',
        origin_transaction_id: 'tx-1',
        source_kind: 'manual_recurring',
        notes: 'Combinado familiar',
      }),
      expect.objectContaining({
        user_id: 'user-1',
        date: '2026-08-15',
        origin_transaction_id: 'tx-1',
        source_kind: 'manual_recurring',
        notes: 'Combinado familiar',
      }),
    ])
  })

  it('updates existing future children and removes months beyond the new limit', async () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        date: '2026-06-15',
        description: 'Emprestimo mae',
        amount: 200,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
        account: 'Conta principal',
        institution: 'Nubank',
        notes: '',
      },
      {
        id: 'tx-2',
        date: '2026-07-15',
        description: 'Emprestimo mae',
        amount: 200,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
        originTransactionId: 'tx-1',
        sourceKind: 'manual_recurring',
      },
      {
        id: 'tx-3',
        date: '2026-08-15',
        description: 'Emprestimo mae',
        amount: 200,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: 'group-1',
        originTransactionId: 'tx-1',
        sourceKind: 'manual_recurring',
      },
    ]
    const setTransactions = vi.fn()
    const setError = vi.fn()

    mockTransactionsClient()

    const { result } = renderHook(() =>
      useTransactionEditing(transactions, setTransactions, setError, vi.fn()),
    )

    await act(async () => {
      await result.current.saveTransactionEdit('tx-1', {
        type: 'Despesa',
        category: 'Moradia',
        budgetGroupId: 'group-2',
        notes: 'Atualizado',
        recurringUntilMonth: '2026-07',
      })
    })

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      category: 'Moradia',
      budget_group_id: 'group-2',
      notes: 'Atualizado',
    }))
    expect(deleteEqSpy).toHaveBeenCalledWith('id', 'tx-3')
  })
})
