import { useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import { normalizeBudgetGroup } from '../lib/transactions'
import type { BudgetGroup, BudgetGroupPayload, Transaction } from '../types'

function sortBudgetGroups(items: BudgetGroup[]): BudgetGroup[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

async function insertBudgetGroup(payload: BudgetGroupPayload) {
  return getSupabaseOrThrow()
    .from('budget_groups')
    .insert({
      name: payload.name,
      target_percentage: payload.targetPercentage,
    })
    .select('id, name, target_percentage')
    .single()
}

async function patchBudgetGroup(id: string, payload: BudgetGroupPayload) {
  return getSupabaseOrThrow()
    .from('budget_groups')
    .update({
      name: payload.name,
      target_percentage: payload.targetPercentage,
    })
    .eq('id', id)
    .select('id, name, target_percentage')
    .single()
}

export function useBudgetGroupManagement(
  setBudgetGroups: Dispatch<SetStateAction<BudgetGroup[]>>,
  setTransactions: Dispatch<SetStateAction<Transaction[]>>,
  setError: Dispatch<SetStateAction<string>>,
  setFeedback: Dispatch<SetStateAction<string>>,
) {
  const [savingGroupId, setSavingGroupId] = useState('')

  async function createBudgetGroup(payload: BudgetGroupPayload) {
    setSavingGroupId('new')
    setError('')
    setFeedback('')

    const { data, error } = await insertBudgetGroup(payload)

    if (error) {
      setError(error.message)
      setSavingGroupId('')
      return false
    }

    setBudgetGroups((current) => sortBudgetGroups([...current, normalizeBudgetGroup(data)]))
    setFeedback('Grupo criado com sucesso.')
    setSavingGroupId('')
    return true
  }

  async function updateBudgetGroup(id: string, payload: BudgetGroupPayload) {
    setSavingGroupId(id)
    setError('')
    setFeedback('')

    const { data, error } = await patchBudgetGroup(id, payload)

    if (error) {
      setError(error.message)
      setSavingGroupId('')
      return false
    }

    setBudgetGroups((current) =>
      sortBudgetGroups(current.map((budgetGroup) => (budgetGroup.id === id ? normalizeBudgetGroup(data) : budgetGroup))),
    )
    setFeedback('Grupo atualizado com sucesso.')
    setSavingGroupId('')
    return true
  }

  async function deleteBudgetGroup(id: string) {
    setSavingGroupId(id)
    setError('')
    setFeedback('')

    const { error } = await getSupabaseOrThrow().from('budget_groups').delete().eq('id', id)

    if (error) {
      setError(error.message)
      setSavingGroupId('')
      return false
    }

    setBudgetGroups((current) => current.filter((budgetGroup) => budgetGroup.id !== id))
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.budgetGroupId === id
          ? {
              ...transaction,
              budgetGroupId: null,
            }
          : transaction,
      ),
    )
    setFeedback('Grupo excluído. Transações ligadas a ele ficaram sem grupo.')
    setSavingGroupId('')
    return true
  }

  return {
    savingGroupId,
    createBudgetGroup,
    updateBudgetGroup,
    deleteBudgetGroup,
  }
}
