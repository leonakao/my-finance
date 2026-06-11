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
  responses.set('transaction_classification_rules', { data: [], error: null })
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
  responses.set('transactions', { data: [], error: null })
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
