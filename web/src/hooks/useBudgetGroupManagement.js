import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { normalizeBudgetGroup } from '../lib/transactions'

function sortBudgetGroups(items) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name))
}

async function insertBudgetGroup(payload) {
  return supabase
    .from('budget_groups')
    .insert({
      name: payload.name,
      target_percentage: payload.targetPercentage,
    })
    .select('id, name, target_percentage')
    .single()
}

async function patchBudgetGroup(id, payload) {
  return supabase
    .from('budget_groups')
    .update({
      name: payload.name,
      target_percentage: payload.targetPercentage,
    })
    .eq('id', id)
    .select('id, name, target_percentage')
    .single()
}

export function useBudgetGroupManagement(setBudgetGroups, setTransactions, setError, setFeedback) {
  const [savingGroupId, setSavingGroupId] = useState('')

  async function createBudgetGroup(payload) {
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

  async function updateBudgetGroup(id, payload) {
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

  async function deleteBudgetGroup(id) {
    setSavingGroupId(id)
    setError('')
    setFeedback('')

    const { error } = await supabase.from('budget_groups').delete().eq('id', id)

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
