import { useState } from 'react'
import './App.css'
import { DashboardView } from './components/DashboardView'
import { MissingConfig } from './components/MissingConfig'
import { SignIn } from './components/SignIn'
import { useAuthSession } from './hooks/useAuthSession'
import { useTransactionEditing } from './hooks/useTransactionEditing'
import { useTransactionsData } from './hooks/useTransactionsData'
import { useTransactionsImport } from './hooks/useTransactionsImport'
import { supabase } from './lib/supabase'
import {
  buildMonthData,
  filterTransactions,
  getMonthTransactions,
  getTransactionOptions,
} from './lib/transactions'

function App() {
  const { session, loading, setLoading } = useAuthSession()
  const [signInLoading, setSignInLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [transactionFilters, setTransactionFilters] = useState({
    search: '',
    type: 'all',
    category: 'all',
    group: 'all',
  })
  const { transactions, setTransactions, selectedMonth, setSelectedMonth, loadTransactions } = useTransactionsData(
    session,
    setLoading,
    setError,
  )
  const { savingId, handleUpdate } = useTransactionEditing(transactions, setTransactions, setError)
  const { importLoading, handleImport } = useTransactionsImport(loadTransactions, setError, setFeedback)

  async function handleSignIn(email) {
    setSignInLoading(true)
    setError('')
    setFeedback('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setFeedback('Magic link enviado. Confira seu email.')
    }

    setSignInLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setTransactions([])
    setSelectedMonth('')
  }

  if (!supabase) {
    return <MissingConfig />
  }

  if (!session) {
    return <SignIn onSignIn={handleSignIn} loading={signInLoading} error={error || feedback} />
  }

  const monthMap = buildMonthData(transactions)
  const months = [...monthMap.keys()].sort().reverse()
  const activeMonth = selectedMonth || months[0] || ''
  const monthData = activeMonth ? monthMap.get(activeMonth) : null
  const monthTransactions = getMonthTransactions(transactions, activeMonth)
  const filteredTransactions = filterTransactions(monthTransactions, transactionFilters)
  const { typeOptions, categoryOptions, groupOptions } = getTransactionOptions(monthTransactions)

  return (
    <DashboardView
      activeMonth={activeMonth}
      months={months}
      loading={loading}
      error={error}
      feedback={feedback}
      importLoading={importLoading}
      handleImport={handleImport}
      handleSignOut={handleSignOut}
      monthData={monthData}
      filteredTransactions={filteredTransactions}
      savingId={savingId}
      handleUpdate={handleUpdate}
      transactionFilters={transactionFilters}
      setTransactionFilters={setTransactionFilters}
      typeOptions={typeOptions}
      categoryOptions={categoryOptions}
      groupOptions={groupOptions}
      setSelectedMonth={setSelectedMonth}
    />
  )
}

export default App
