import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getCurrentMonthKey, normalizeBudgetGroup, normalizeClassificationRule, normalizeTransaction, sortClassificationRules } from '../lib/transactions'
import type { BudgetGroup, ClassificationRule, Transaction } from '../types'

export function useTransactionsData(
  session: Session | null,
  setLoading: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<string>>,
) {
  const [budgetGroups, setBudgetGroups] = useState<BudgetGroup[]>([])
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
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
      .select('id, date, description, amount, type, category, budget_group_id, account, institution, status, notes, installment')
      .order('date', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    setBudgetGroups(budgetGroupsData.map(normalizeBudgetGroup))
    setClassificationRules(sortClassificationRules(classificationRulesData.map(normalizeClassificationRule)))
    const normalized = data.map(normalizeTransaction)
    setTransactions(normalized)

    setSelectedMonth((current) => (current !== '' ? current : getCurrentMonthKey()))
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
