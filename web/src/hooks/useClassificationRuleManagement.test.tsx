import type { Session } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClassificationRule } from '../types'

/* eslint-disable max-lines-per-function */

const { authGetUser, fromSpy, functionsInvoke, loadTransactions } = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  fromSpy: vi.fn(),
  functionsInvoke: vi.fn(),
  loadTransactions: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  getSupabaseOrThrow: vi.fn(() => ({
    auth: { getUser: authGetUser },
    from: fromSpy,
    functions: { invoke: functionsInvoke },
  })),
}))

import { useClassificationRuleManagement } from './useClassificationRuleManagement'

const SESSION = { user: { id: 'user-1' } } as Session

function buildRuleClient(insertedRule: Record<string, unknown>) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  type SelectChain = {
    eq: (column: string, value: string | number | null) => SelectChain
    is: (column: string, value: null) => SelectChain
    maybeSingle: () => Promise<{ data: null; error: null }>
  }

  const selectChain = {} as SelectChain
  selectChain.eq = vi.fn(() => selectChain)
  selectChain.is = vi.fn(() => selectChain)
  selectChain.maybeSingle = maybeSingle
  const select = vi.fn(() => selectChain)

  const single = vi.fn().mockResolvedValue({ data: insertedRule, error: null })
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({ single })),
  }))

  const updateSingle = vi.fn().mockResolvedValue({ data: insertedRule, error: null })
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({ single: updateSingle })),
    })),
  }))

  return { select, insert, update }
}

function createHarness(classificationRules: ClassificationRule[] = []) {
  const setClassificationRules = vi.fn()
  const setError = vi.fn()
  const setFeedback = vi.fn()

  function useHarness() {
    return useClassificationRuleManagement(
      classificationRules,
      setClassificationRules,
      loadTransactions,
      setError,
      setFeedback,
    )
  }

  return {
    useHarness,
    setClassificationRules,
    setError,
    setFeedback,
  }
}

describe('useClassificationRuleManagement', () => {
  beforeEach(() => {
    authGetUser.mockResolvedValue({ data: { user: { id: SESSION.user.id } }, error: null })
    fromSpy.mockReset()
    functionsInvoke.mockReset()
    loadTransactions.mockReset().mockResolvedValue(true)
  })

  it('creates a contextual rule and reclassifies via the backend function', async () => {
    const insertedRule = {
      id: 'rule-1',
      match_mode: 'description',
      match_description: 'assinatura premium',
      match_description_normalized: 'assinatura premium',
      match_amount: null,
      match_institution: 'Nubank',
      match_account: 'Cartão de crédito',
      type: 'Despesa',
      category: 'Assinaturas',
      budget_group_id: null,
      updated_at: '2026-06-12T12:00:00Z',
    }
    const ruleClient = buildRuleClient(insertedRule)
    fromSpy.mockReturnValue(ruleClient)
    functionsInvoke.mockResolvedValue({ data: { updated_count: 2 }, error: null })
    const harness = createHarness()
    const { result } = renderHook(() => harness.useHarness())

    await act(async () => {
      await result.current.createRuleFromTransaction(
        {
          id: 'tx-1',
          description: 'Assinatura Premium',
          amount: 19.9,
          type: 'Despesa',
          category: 'Outros',
          budgetGroupId: null,
          institution: 'Nubank',
          account: 'Cartão de crédito',
        },
        'description',
      )
    })

    await waitFor(() => {
      expect(result.current.reclassificationCandidate).not.toBeNull()
    })

    await act(async () => {
      expect(await result.current.reclassifyExistingTransactions()).toBe(true)
    })

    expect(ruleClient.insert).toHaveBeenCalledWith({
      user_id: SESSION.user.id,
      match_mode: 'description',
      match_description: 'Assinatura Premium',
      match_description_normalized: 'assinatura premium',
      match_amount: null,
      match_institution: 'Nubank',
      match_account: 'Cartão de crédito',
      type: 'Despesa',
      category: 'Outros',
      budget_group_id: null,
    })
    expect(functionsInvoke).toHaveBeenCalledWith('reclassify-transactions-by-rule', {
      body: { rule_id: 'rule-1' },
    })
    expect(loadTransactions).toHaveBeenCalledTimes(1)
    expect(result.current.reclassifying).toBe(false)
    expect(result.current.reclassificationCandidate).toBeNull()
  })

  it('reports a zero-update backend result without failing', async () => {
    const insertedRule = {
      id: 'rule-2',
      match_mode: 'description',
      match_description: 'ifood',
      match_description_normalized: 'ifood',
      match_amount: null,
      match_institution: null,
      match_account: null,
      type: 'Despesa',
      category: 'Alimentação',
      budget_group_id: null,
      updated_at: '2026-06-12T12:00:00Z',
    }
    fromSpy.mockReturnValue(buildRuleClient(insertedRule))
    functionsInvoke.mockResolvedValue({ data: { updated_count: 0 }, error: null })
    const harness = createHarness()
    const { result } = renderHook(() => harness.useHarness())

    await act(async () => {
      await result.current.createRuleFromTransaction(
        {
          id: 'tx-1',
          description: 'Ifood mercado',
          amount: 32.5,
          type: 'Despesa',
          category: 'Outros',
          budgetGroupId: null,
          institution: '',
          account: '',
        },
        'description',
      )
    })

    await waitFor(() => {
      expect(result.current.reclassificationCandidate).not.toBeNull()
    })

    await act(async () => {
      expect(await result.current.reclassifyExistingTransactions()).toBe(true)
    })

    await waitFor(() => {
    expect(harness.setFeedback).toHaveBeenCalledWith('0 transações existentes foram reclassificadas.')
  })
  })

  it('surfaces backend errors and keeps the UI from advancing', async () => {
    const insertedRule = {
      id: 'rule-3',
      match_mode: 'description',
      match_description: 'salario',
      match_description_normalized: 'salario',
      match_amount: null,
      match_institution: null,
      match_account: null,
      type: 'Receita',
      category: 'Salário',
      budget_group_id: null,
      updated_at: '2026-06-12T12:00:00Z',
    }
    fromSpy.mockReturnValue(buildRuleClient(insertedRule))
    functionsInvoke.mockResolvedValue({ data: null, error: new Error('Falha no backend') })
    const harness = createHarness()
    const { result } = renderHook(() => harness.useHarness())

    await act(async () => {
      await result.current.createRuleFromTransaction(
        {
          id: 'tx-1',
          description: 'Salário empresa',
          amount: 5000,
          type: 'Receita',
          category: 'Outros',
          budgetGroupId: null,
          institution: '',
          account: '',
        },
        'description',
      )
    })

    await waitFor(() => {
      expect(result.current.reclassificationCandidate).not.toBeNull()
    })

    await act(async () => {
      expect(await result.current.reclassifyExistingTransactions()).toBe(false)
    })

    expect(harness.setError).toHaveBeenCalledWith('Falha no backend')
    expect(loadTransactions).not.toHaveBeenCalled()
  })
})
