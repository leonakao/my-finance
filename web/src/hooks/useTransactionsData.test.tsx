import type { Session } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromSpy, responses } = vi.hoisted(() => {
  const responseMap = new Map<string, { data: unknown[]; error: { message: string } | null }>()
  return {
    responses: responseMap,
    fromSpy: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve(responseMap.get(table))),
      })),
    })),
  }
})

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: fromSpy,
  },
}))

import { useTransactionsData } from './useTransactionsData'

const SESSION = { user: { id: 'user-1' } } as Session

function setSuccessfulResponses() {
  responses.set('budget_groups', {
    data: [{ id: 'group-1', name: 'Necessidades', target_percentage: 50 }],
    error: null,
  })
  responses.set('transaction_classification_rules', {
    data: [{
      id: 'rule-1',
      match_mode: 'description',
      match_description: 'Pix mae',
      match_description_normalized: 'pix mae',
      match_amount: null,
      match_institution: null,
      match_account: null,
      type: 'Despesa',
      category: 'Outros',
      budget_group_id: null,
      notes: 'Emprestimo familiar',
      updated_at: '2026-06-12T12:00:00Z',
    }],
    error: null,
  })
  responses.set('projection_exclusions', {
    data: [{
      id: 'exclusion-1',
      type: 'Despesa',
      description: 'Internet',
      normalized_description: 'internet',
      scope: 'month',
      month_start: '2026-06-01',
      created_at: '2026-06-11T12:00:00Z',
    }],
    error: null,
  })
  responses.set('transactions', {
    data: [{
      id: 'tx-1',
      date: '2026-06-10',
      description: 'Pix mae',
      amount: 200,
      type: 'Despesa',
      category: 'Outros',
      budget_group_id: null,
      account: 'Conta principal',
      institution: 'Nubank',
      notes: 'Parcela 1',
      installment: '',
      origin_transaction_id: 'anchor-1',
      is_ignored: true,
      source_kind: 'manual_recurring',
    }],
    error: null,
  })
}

describe('useTransactionsData', () => {
  beforeEach(() => {
    responses.clear()
    fromSpy.mockClear()
    setSuccessfulResponses()
  })

  it('loads and normalizes projection exclusions for an authenticated session', async () => {
    const setLoading = vi.fn()
    const setError = vi.fn()
    const { result } = renderHook(() => useTransactionsData(SESSION, setLoading, setError))

    await waitFor(() => {
      expect(result.current.projectionExclusions).toHaveLength(1)
    })

    expect(result.current.projectionExclusions[0]).toMatchObject({
      id: 'exclusion-1',
      normalizedDescription: 'internet',
      monthStart: '2026-06-01',
    })
    expect(fromSpy).toHaveBeenCalledWith('projection_exclusions')
  })

  it('loads and normalizes transaction origin metadata and rule notes', async () => {
    const { result } = renderHook(() => useTransactionsData(SESSION, vi.fn(), vi.fn()))

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(1)
      expect(result.current.classificationRules).toHaveLength(1)
    })

    expect(result.current.transactions[0]).toMatchObject({
      originTransactionId: 'anchor-1',
      isIgnored: true,
      sourceKind: 'manual_recurring',
    })
    expect(result.current.classificationRules[0]).toMatchObject({
      notes: 'Emprestimo familiar',
    })
  })

  it('exposes the projection exclusion setter', async () => {
    const { result } = renderHook(() => useTransactionsData(SESSION, vi.fn(), vi.fn()))

    await waitFor(() => {
      expect(result.current.projectionExclusions).toHaveLength(1)
    })

    act(() => {
      result.current.setProjectionExclusions([])
    })
    expect(result.current.projectionExclusions).toEqual([])
  })

  it('stops loading and reports an exclusion query error', async () => {
    responses.set('projection_exclusions', {
      data: [],
      error: { message: 'Falha ao carregar exclusões.' },
    })
    const setLoading = vi.fn()
    const setError = vi.fn()

    renderHook(() => useTransactionsData(SESSION, setLoading, setError))

    await waitFor(() => {
      expect(setError).toHaveBeenCalledWith('Falha ao carregar exclusões.')
    })
    expect(setLoading).toHaveBeenLastCalledWith(false)
    expect(fromSpy).not.toHaveBeenCalledWith('transactions')
  })
})
