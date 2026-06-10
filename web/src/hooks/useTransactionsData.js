import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAvailableMonths, normalizeBudgetGroup, normalizeClassificationRule, normalizeTransaction, sortClassificationRules } from '../lib/transactions'

export function useTransactionsData(session, setLoading, setError) {
  const [budgetGroups, setBudgetGroups] = useState([])
  const [classificationRules, setClassificationRules] = useState([])
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

    const { data: classificationRulesData, error: classificationRulesError } = await supabase
      .from('transaction_classification_rules')
      .select('id, match_mode, match_description, match_description_normalized, match_amount, type, category, budget_group_id, updated_at')
      .order('updated_at', { ascending: false })

    if (classificationRulesError) {
      setError(classificationRulesError.message)
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
    setClassificationRules(sortClassificationRules((classificationRulesData ?? []).map(normalizeClassificationRule)))
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
    classificationRules,
    setClassificationRules,
    transactions,
    setTransactions,
    selectedMonth,
    setSelectedMonth,
    loadTransactions,
  }
}
