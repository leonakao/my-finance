import { useState } from 'react'
import './App.css'
import { DashboardView } from './components/DashboardView'
import { MissingConfig } from './components/MissingConfig'
import { SignIn } from './components/SignIn'
import { useAuthActions } from './hooks/useAuthActions'
import { useAuthSession } from './hooks/useAuthSession'
import { useDashboardState } from './hooks/useDashboardState'
import { useBudgetGroupManagement } from './hooks/useBudgetGroupManagement'
import { useTransactionEditing } from './hooks/useTransactionEditing'
import { useTransactionsData } from './hooks/useTransactionsData'
import { useTransactionsImport } from './hooks/useTransactionsImport'
import { supabase } from './lib/supabase'

function AuthenticatedApp({
  budgetGroups,
  categoryOptions,
  createBudgetGroup,
  deleteBudgetGroup,
  error,
  feedback,
  filteredTransactions,
  groupOptions,
  handleImport,
  handleSignOut,
  handleUpdate,
  importLoading,
  loading,
  monthData,
  months,
  savingGroupId,
  savingId,
  selectedMonth,
  setSelectedMonth,
  setTransactionFilters,
  transactionFilters,
  typeOptions,
  updateBudgetGroup,
}) {
  return (
    <DashboardView
      activeMonth={selectedMonth}
      months={months}
      loading={loading}
      error={error}
      feedback={feedback}
      importLoading={importLoading}
      handleImport={handleImport}
      handleSignOut={handleSignOut}
      monthData={monthData}
      budgetGroups={budgetGroups}
      savingGroupId={savingGroupId}
      createBudgetGroup={createBudgetGroup}
      updateBudgetGroup={updateBudgetGroup}
      deleteBudgetGroup={deleteBudgetGroup}
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

function UnauthenticatedApp({
  error,
  feedback,
  handlePasswordReset,
  handlePasswordUpdate,
  handleSignIn,
  handleSignUp,
  isRecoveryMode,
  setError,
  setFeedback,
  setIsRecoveryMode,
  signInLoading,
}) {
  return (
    <SignIn
      isRecoveryMode={isRecoveryMode}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
      onPasswordReset={handlePasswordReset}
      onPasswordUpdate={(password) =>
        handlePasswordUpdate(password, () => {
          setIsRecoveryMode(false)
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        })
      }
      onDismissRecovery={() => {
        setIsRecoveryMode(false)
        setError('')
        setFeedback('')
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }}
      loading={signInLoading}
      error={error || feedback}
    />
  )
}

function App() {
  const { session, loading, setLoading, isRecoveryMode, setIsRecoveryMode } = useAuthSession()
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [transactionFilters, setTransactionFilters] = useState({ search: '', type: 'all', category: 'all', group: 'all' })
  const { budgetGroups, setBudgetGroups, transactions, setTransactions, selectedMonth, setSelectedMonth, loadTransactions } =
    useTransactionsData(session, setLoading, setError)
  const { savingId, handleUpdate } = useTransactionEditing(transactions, setTransactions, setError)
  const { savingGroupId, createBudgetGroup, updateBudgetGroup, deleteBudgetGroup } = useBudgetGroupManagement(setBudgetGroups, setTransactions, setError, setFeedback)
  const { signInLoading, handleSignIn, handleSignUp, handlePasswordReset, handlePasswordUpdate, handleSignOut } = useAuthActions(setBudgetGroups, setTransactions, setSelectedMonth, setError, setFeedback)
  const { importLoading, handleImport } = useTransactionsImport(loadTransactions, setError, setFeedback)
  const { activeMonth, monthData, filteredTransactions, months, typeOptions, categoryOptions, groupOptions } =
    useDashboardState(budgetGroups, transactions, selectedMonth, transactionFilters)

  if (!supabase) {
    return <MissingConfig />
  }

  if (isRecoveryMode || !session) {
    return (
      <UnauthenticatedApp
        error={error}
        feedback={feedback}
        handlePasswordReset={handlePasswordReset}
        handlePasswordUpdate={handlePasswordUpdate}
        handleSignIn={handleSignIn}
        handleSignUp={handleSignUp}
        isRecoveryMode={isRecoveryMode}
        setError={setError}
        setFeedback={setFeedback}
        setIsRecoveryMode={setIsRecoveryMode}
        signInLoading={signInLoading}
      />
    )
  }

  return (
    <AuthenticatedApp
      budgetGroups={budgetGroups}
      categoryOptions={categoryOptions}
      createBudgetGroup={createBudgetGroup}
      deleteBudgetGroup={deleteBudgetGroup}
      error={error}
      feedback={feedback}
      filteredTransactions={filteredTransactions}
      groupOptions={groupOptions}
      handleImport={handleImport}
      handleSignOut={handleSignOut}
      handleUpdate={handleUpdate}
      importLoading={importLoading}
      loading={loading}
      monthData={monthData}
      months={months}
      savingGroupId={savingGroupId}
      savingId={savingId}
      selectedMonth={activeMonth}
      setSelectedMonth={setSelectedMonth}
      setTransactionFilters={setTransactionFilters}
      transactionFilters={transactionFilters}
      typeOptions={typeOptions}
      updateBudgetGroup={updateBudgetGroup}
    />
  )
}

export default App
