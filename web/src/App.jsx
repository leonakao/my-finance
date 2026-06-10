/* eslint-disable max-lines-per-function */
import { useState } from 'react'
import './App.css'
import { ClassificationRulePrompt } from './components/ClassificationRulePrompt'
import { ClassificationRulesView } from './components/ClassificationRulesView'
import { DashboardView } from './components/DashboardView'
import { MissingConfig } from './components/MissingConfig'
import { ReclassificationPromptModal } from './components/ReclassificationPromptModal'
import { SignIn } from './components/SignIn'
import { TransactionEditModal } from './components/TransactionEditModal'
import { useAuthActions } from './hooks/useAuthActions'
import { useAuthSession } from './hooks/useAuthSession'
import { useClassificationRuleManagement } from './hooks/useClassificationRuleManagement'
import { useDashboardState } from './hooks/useDashboardState'
import { useBudgetGroupManagement } from './hooks/useBudgetGroupManagement'
import { useTransactionEditing } from './hooks/useTransactionEditing'
import { useTransactionsData } from './hooks/useTransactionsData'
import { useTransactionsImport } from './hooks/useTransactionsImport'
import { supabase } from './lib/supabase'

function AuthenticatedApp({
  activeView,
  budgetGroups,
  categoryOptions,
  classificationRules,
  createBudgetGroup,
  createRuleManually,
  deleteBudgetGroup,
  deleteClassificationRule,
  dismissReclassificationPrompt,
  dismissRememberPrompt,
  editingTransaction,
  error,
  feedback,
  filteredTransactions,
  groupOptions,
  handleEditTransaction,
  handleImport,
  handleSignOut,
  importLoading,
  loading,
  monthData,
  months,
  openDashboardView,
  openRulesView,
  promptTransaction,
  reclassificationCandidate,
  reclassifyExistingTransactions,
  reclassifying,
  rememberClassification,
  saveTransactionEdit,
  savingGroupId,
  savingId,
  savingRuleId,
  selectedMonth,
  setSelectedMonth,
  setTransactionFilters,
  closeTransactionEditor,
  transactionFilters,
  typeOptions,
  updateBudgetGroup,
  updateClassificationRule,
}) {
  if (activeView === 'classification-rules') {
    return (
      <ClassificationRulesView
        budgetGroups={budgetGroups}
        classificationRules={classificationRules}
        error={error}
        feedback={feedback}
        handleSignOut={handleSignOut}
        onBackToDashboard={openDashboardView}
        onCreateRule={createRuleManually}
        onDeleteRule={deleteClassificationRule}
        onUpdateRule={updateClassificationRule}
        savingRuleId={savingRuleId}
      />
    )
  }

  return (
    <>
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
        handleEditTransaction={handleEditTransaction}
        transactionFilters={transactionFilters}
        setTransactionFilters={setTransactionFilters}
        typeOptions={typeOptions}
        categoryOptions={categoryOptions}
        groupOptions={groupOptions}
        setSelectedMonth={setSelectedMonth}
        openRulesView={openRulesView}
      />
      {editingTransaction ? (
        <TransactionEditModal
          key={editingTransaction.id}
          budgetGroups={budgetGroups}
          saving={savingId === editingTransaction.id}
          transaction={editingTransaction}
          onClose={closeTransactionEditor}
          onSave={saveTransactionEdit}
        />
      ) : null}
      <ClassificationRulePrompt
        key={promptTransaction?.id ?? 'empty'}
        transaction={promptTransaction}
        onDismiss={dismissRememberPrompt}
        onRemember={(matchMode, overrides) => {
          void rememberClassification(matchMode, overrides)
        }}
      />
      {reclassificationCandidate ? (
        <ReclassificationPromptModal
          onDismiss={dismissReclassificationPrompt}
          onReclassify={reclassifyExistingTransactions}
          reclassifying={reclassifying}
        />
      ) : null}
    </>
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
  const [activeView, setActiveView] = useState('dashboard')
  const [transactionFilters, setTransactionFilters] = useState({ search: '', type: 'all', category: 'all', group: 'all' })

  const {
    budgetGroups,
    setBudgetGroups,
    classificationRules,
    setClassificationRules,
    transactions,
    setTransactions,
    selectedMonth,
    setSelectedMonth,
    loadTransactions,
  } = useTransactionsData(session, setLoading, setError)

  const {
    savingRuleId,
    reclassificationCandidate,
    reclassifying,
    createRuleFromTransaction,
    upsertClassificationRule,
    updateClassificationRule,
    deleteClassificationRule,
    dismissReclassificationPrompt,
    reclassifyExistingTransactions,
  } = useClassificationRuleManagement(
    classificationRules,
    setClassificationRules,
    transactions,
    setTransactions,
    setError,
    setFeedback,
  )

  const {
    savingId,
    editingTransaction,
    promptTransaction,
    openTransactionEditor,
    closeTransactionEditor,
    saveTransactionEdit,
    dismissRememberPrompt,
    rememberClassification,
  } = useTransactionEditing(transactions, setTransactions, setError, createRuleFromTransaction)

  const { savingGroupId, createBudgetGroup, updateBudgetGroup, deleteBudgetGroup } = useBudgetGroupManagement(
    setBudgetGroups,
    setTransactions,
    setError,
    setFeedback,
  )

  const { signInLoading, handleSignIn, handleSignUp, handlePasswordReset, handlePasswordUpdate, handleSignOut } =
    useAuthActions(setBudgetGroups, setClassificationRules, setTransactions, setSelectedMonth, setError, setFeedback)

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
      activeView={activeView}
      budgetGroups={budgetGroups}
      categoryOptions={categoryOptions}
      classificationRules={classificationRules}
      createBudgetGroup={createBudgetGroup}
      createRuleManually={upsertClassificationRule}
      deleteBudgetGroup={deleteBudgetGroup}
      deleteClassificationRule={deleteClassificationRule}
      dismissReclassificationPrompt={dismissReclassificationPrompt}
      dismissRememberPrompt={dismissRememberPrompt}
      editingTransaction={editingTransaction}
      error={error}
      feedback={feedback}
      filteredTransactions={filteredTransactions}
      groupOptions={groupOptions}
      handleEditTransaction={openTransactionEditor}
      handleImport={handleImport}
      handleSignOut={async () => {
        setActiveView('dashboard')
        await handleSignOut()
      }}
      importLoading={importLoading}
      loading={loading}
      monthData={monthData}
      months={months}
      openDashboardView={() => setActiveView('dashboard')}
      openRulesView={() => setActiveView('classification-rules')}
      promptTransaction={promptTransaction}
      reclassificationCandidate={reclassificationCandidate}
      reclassifyExistingTransactions={reclassifyExistingTransactions}
      reclassifying={reclassifying}
      rememberClassification={rememberClassification}
      saveTransactionEdit={saveTransactionEdit}
      savingGroupId={savingGroupId}
      savingId={savingId}
      savingRuleId={savingRuleId}
      selectedMonth={activeMonth}
      setSelectedMonth={setSelectedMonth}
      setTransactionFilters={setTransactionFilters}
      closeTransactionEditor={closeTransactionEditor}
      transactionFilters={transactionFilters}
      typeOptions={typeOptions}
      updateBudgetGroup={updateBudgetGroup}
      updateClassificationRule={updateClassificationRule}
    />
  )
}

export default App
