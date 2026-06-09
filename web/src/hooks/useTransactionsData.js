import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAvailableMonths, normalizeBudgetGroup, normalizeTransaction } from '../lib/transactions'

export function useTransactionsData(session, setLoading, setError) {
  const [budgetGroups, setBudgetGroups] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')

  const loadTransactions = useCallback(async () => {
    if (!supabase || !session) {
      return
    }

    setLoading(true)
    setError('')

    const { data: budgetGroupsData, error: budgetGroupsError } = await supabase
      .from('budget_groups')
      .select('id, name, target_percentage')
      .order('name', { ascending: true })

    if (budgetGroupsError) {
      setError(budgetGroupsError.message)
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from('transactions')
      .select('id, date, description, amount, type, category, budget_group_id, account, institution, status, notes')
      .order('date', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    setBudgetGroups((budgetGroupsData ?? []).map(normalizeBudgetGroup))
    const normalized = (data ?? []).map(normalizeTransaction)
    setTransactions(normalized)

    const availableMonths = getAvailableMonths(normalized)
    setSelectedMonth((current) => current || availableMonths[0] || '')
    setLoading(false)
  }, [session, setError, setLoading])

  useEffect(() => {
    if (!session || !supabase) {
      return
    }

    queueMicrotask(() => {
      void loadTransactions()
    })
  }, [session, loadTransactions])

  return {
    budgetGroups,
    setBudgetGroups,
    transactions,
    setTransactions,
    selectedMonth,
    setSelectedMonth,
    loadTransactions,
  }
}
