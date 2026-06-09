import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAvailableMonths, normalizeTransaction } from '../lib/transactions'

export function useTransactionsData(session, setLoading, setError) {
  const [transactions, setTransactions] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')

  const loadTransactions = useCallback(async () => {
    if (!supabase || !session) {
      return
    }

    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('transactions')
      .select('id, date, description, amount, type, category, budget_group, account, institution, status, notes')
      .order('date', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

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
    transactions,
    setTransactions,
    selectedMonth,
    setSelectedMonth,
    loadTransactions,
  }
}
