/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import './App.css'
import { BudgetGroupsView } from './components/BudgetGroupsView'
import { ClassificationRulePrompt } from './components/ClassificationRulePrompt'
import { ClassificationRulesView } from './components/ClassificationRulesView'
import { DashboardOverviewView } from './components/DashboardOverviewView'
import { ImportView } from './components/ImportView'
import { MissingConfig } from './components/MissingConfig'
import { MonthlyView } from './components/MonthlyView'
import { ReclassificationPromptModal } from './components/ReclassificationPromptModal'
import { SignIn } from './components/SignIn'
import { TransactionEditModal } from './components/TransactionEditModal'
import { WorkspaceLayout } from './components/WorkspaceLayout'
import { useAuthActions } from './hooks/useAuthActions'
import { useAuthSession } from './hooks/useAuthSession'
import { useBudgetGroupManagement } from './hooks/useBudgetGroupManagement'
import { useClassificationRuleManagement } from './hooks/useClassificationRuleManagement'
import { useDashboardState } from './hooks/useDashboardState'
import { useTransactionEditing } from './hooks/useTransactionEditing'
import { useTransactionsData } from './hooks/useTransactionsData'
import { useTransactionsImport } from './hooks/useTransactionsImport'
import { supabase } from './lib/supabase'
import type {
  BudgetGroup,
  ClassificationRule,
  DecoratedTransaction,
  FinancialOverview,
  GroupOption,
  MonthData,
  MonthlyProjectionInsight,
  ReclassificationCandidate,
  RulePromptOverrides,
  Transaction,
  TransactionEditPayload,
  TransactionFilters,
  TransactionType,
} from './types'

type AuthenticatedPath = '/app/dashboard' | '/app/mensal' | '/app/importar' | '/app/regras' | '/app/budget-groups'

const DEFAULT_AUTHENTICATED_PATH: AuthenticatedPath = '/app/dashboard'

function normalizeAuthenticatedPath(pathname: string): AuthenticatedPath {
  if (
    pathname === '/app/dashboard'
    || pathname === '/app/mensal'
    || pathname === '/app/importar'
    || pathname === '/app/regras'
    || pathname === '/app/budget-groups'
  ) {
    return pathname
  }

  return DEFAULT_AUTHENTICATED_PATH
}

function writePath(pathname: string, replace = false) {
  const nextUrl = `${pathname}${window.location.search}${window.location.hash}`
  if (replace) {
    window.history.replaceState(null, '', nextUrl)
    return
  }

  window.history.pushState(null, '', nextUrl)
}

function writePathWithSearch(pathname: string, searchParams: URLSearchParams, replace = false) {
  const search = searchParams.toString()
  const nextUrl = `${pathname}${search ? `?${search}` : ''}${window.location.hash}`
  if (replace) {
    window.history.replaceState(null, '', nextUrl)
    return
  }

  window.history.pushState(null, '', nextUrl)
}

function readMonthFromSearch(search: string): string {
  const month = new URLSearchParams(search).get('month') ?? ''
  return /^\d{4}-\d{2}$/.test(month) ? month : ''
}

function getPageMetadata(pathname: AuthenticatedPath) {
  switch (pathname) {
    case '/app/mensal':
      return {
        title: 'Mensal',
        intro: 'Acompanhe o mês atual, revise transações confirmadas e navegue pelos próximos meses previstos.',
      }
    case '/app/importar':
      return {
        title: 'Importar',
        intro: 'Envie novos arquivos com um fluxo mais claro e separado da análise financeira.',
      }
    case '/app/regras':
      return {
        title: 'Regras',
        intro: 'Mantenha regras de classificação que reduzem retrabalho e reforçam consistência.',
      }
    case '/app/budget-groups':
      return {
        title: 'Grupos de orçamento',
        intro: 'Gerencie os grupos e metas percentuais que aparecem na leitura mensal e nas projeções.',
      }
    case '/app/dashboard':
    default:
      return {
        title: 'Dashboard',
        intro: 'Uma leitura acolhedora da saúde financeira, com tendências, compromissos previstos e simulações rápidas.',
      }
  }
}

type AuthenticatedAppProps = {
  budgetGroups: BudgetGroup[]
  categoryOptions: string[]
  classificationRules: ClassificationRule[]
  createBudgetGroup: (payload: { name: string; targetPercentage: number }) => Promise<boolean>
  createRuleManually: (payload: {
    matchMode: 'description' | 'description_amount'
    matchDescription: string
    matchAmount: number | null
    type: TransactionType
    category: string
    budgetGroupId: string | null
  }) => Promise<ClassificationRule | null>
  currentMonth: string
  currentPath: AuthenticatedPath
  deleteBudgetGroup: (id: string) => Promise<boolean>
  deleteClassificationRule: (id: string) => Promise<boolean>
  dismissReclassificationPrompt: () => void
  dismissRememberPrompt: () => void
  editingTransaction: Transaction | null
  error: string
  feedback: string
  filteredTransactions: DecoratedTransaction[]
  financialOverview: FinancialOverview
  groupOptions: GroupOption[]
  handleEditTransaction: (transactionId: string) => void
  handleImport: (payload: { kind: 'account' | 'card' | 'santander-card-pdf' | 'santander-account-pdf'; invoice: string; file: File }) => Promise<void>
  handleSignOut: () => Promise<void>
  importLoading: boolean
  loading: boolean
  monthData: MonthData | null
  months: string[]
  monthlyProjectionInsight: MonthlyProjectionInsight | null
  navigateTo: (pathname: AuthenticatedPath) => void
  openMonthlyAnalysis: (monthKey: string) => void
  orphanedCount: number
  promptTransaction: Transaction | null
  reclassificationCandidate: ReclassificationCandidate | null
  reclassifyExistingTransactions: () => Promise<boolean>
  reclassifying: boolean
  rememberClassification: (matchMode: 'description' | 'description_amount', overrides?: RulePromptOverrides) => Promise<boolean>
  saveTransactionEdit: (transactionId: string, payload: TransactionEditPayload) => Promise<void>
  savingGroupId: string
  savingId: string
  savingRuleId: string
  selectedMonth: string
  setSelectedMonth: Dispatch<SetStateAction<string>>
  setTransactionFilters: Dispatch<SetStateAction<TransactionFilters>>
  closeTransactionEditor: () => void
  transactionFilters: TransactionFilters
  typeOptions: TransactionType[]
  updateBudgetGroup: (id: string, payload: { name: string; targetPercentage: number }) => Promise<boolean>
  updateClassificationRule: (id: string, payload: {
    matchMode: 'description' | 'description_amount'
    matchDescription: string
    matchAmount: number | null
    type: TransactionType
    category: string
    budgetGroupId: string | null
  }) => Promise<boolean>
}

type UnauthenticatedAppProps = {
  error: string
  feedback: string
  handlePasswordReset: (email: string) => Promise<boolean | void>
  handlePasswordUpdate: (password: string, onSuccess: () => void) => Promise<void>
  handleSignIn: (email: string, password: string) => Promise<boolean | void>
  handleSignUp: (email: string, password: string) => Promise<boolean | void>
  isRecoveryMode: boolean
  setError: Dispatch<SetStateAction<string>>
  setFeedback: Dispatch<SetStateAction<string>>
  setIsRecoveryMode: Dispatch<SetStateAction<boolean>>
  signInLoading: boolean
}

function AuthenticatedApp({
  budgetGroups,
  categoryOptions,
  classificationRules,
  createBudgetGroup,
  createRuleManually,
  currentMonth,
  currentPath,
  deleteBudgetGroup,
  deleteClassificationRule,
  dismissReclassificationPrompt,
  dismissRememberPrompt,
  editingTransaction,
  error,
  feedback,
  filteredTransactions,
  financialOverview,
  groupOptions,
  handleEditTransaction,
  handleImport,
  handleSignOut,
  importLoading,
  loading,
  monthData,
  months,
  monthlyProjectionInsight,
  navigateTo,
  openMonthlyAnalysis,
  orphanedCount,
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
}: AuthenticatedAppProps) {
  const pageMetadata = getPageMetadata(currentPath)

  let currentView = (
    <DashboardOverviewView
      budgetGroups={budgetGroups}
      onOpenMonth={openMonthlyAnalysis}
      overview={financialOverview}
    />
  )

  if (currentPath === '/app/mensal') {
    currentView = (
      <MonthlyView
        activeMonth={selectedMonth}
        categoryOptions={categoryOptions}
        currentMonth={currentMonth}
        error={error}
        feedback={feedback}
        filteredTransactions={filteredTransactions}
        groupOptions={groupOptions}
        handleEditTransaction={handleEditTransaction}
        loading={loading}
        monthData={monthData}
        months={months}
        projectionInsight={monthlyProjectionInsight}
        savingId={savingId}
        setSelectedMonth={setSelectedMonth}
        setTransactionFilters={setTransactionFilters}
        transactionFilters={transactionFilters}
        typeOptions={typeOptions}
      />
    )
  } else if (currentPath === '/app/importar') {
    currentView = (
      <ImportView
        error={error}
        feedback={feedback}
        handleImport={handleImport}
        importLoading={importLoading}
      />
    )
  } else if (currentPath === '/app/regras') {
    currentView = (
      <ClassificationRulesView
        budgetGroups={budgetGroups}
        classificationRules={classificationRules}
        error={error}
        feedback={feedback}
        onCreateRule={createRuleManually}
        onDeleteRule={deleteClassificationRule}
        onUpdateRule={updateClassificationRule}
        savingRuleId={savingRuleId}
      />
    )
  } else if (currentPath === '/app/budget-groups') {
    currentView = (
      <BudgetGroupsView
        budgetGroups={budgetGroups}
        createBudgetGroup={createBudgetGroup}
        deleteBudgetGroup={deleteBudgetGroup}
        orphanedCount={orphanedCount}
        savingGroupId={savingGroupId}
        updateBudgetGroup={updateBudgetGroup}
      />
    )
  }

  return (
    <>
      <WorkspaceLayout
        currentPath={currentPath}
        intro={pageMetadata.intro}
        onNavigate={(href) => navigateTo(normalizeAuthenticatedPath(href))}
        onSignOut={handleSignOut}
        title={pageMetadata.title}
      >
        {currentView}
      </WorkspaceLayout>
      {currentPath === '/app/mensal' && editingTransaction !== null ? (
        <TransactionEditModal
          key={editingTransaction.id}
          budgetGroups={budgetGroups}
          saving={savingId === editingTransaction.id}
          transaction={editingTransaction}
          onClose={closeTransactionEditor}
          onSave={saveTransactionEdit}
        />
      ) : null}
      {currentPath === '/app/mensal' ? (
        <ClassificationRulePrompt
          key={promptTransaction?.id ?? 'empty'}
          transaction={promptTransaction}
          onDismiss={dismissRememberPrompt}
          onRemember={(matchMode: 'description' | 'description_amount', overrides?: RulePromptOverrides) =>
            rememberClassification(matchMode, overrides)
          }
        />
      ) : null}
      {reclassificationCandidate !== null ? (
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
}: UnauthenticatedAppProps) {
  return (
    <SignIn
      isRecoveryMode={isRecoveryMode}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
      onPasswordReset={handlePasswordReset}
      onPasswordUpdate={(password: string) =>
        handlePasswordUpdate(password, () => {
          setIsRecoveryMode(false)
          writePath('/login', true)
        })
      }
      onDismissRecovery={() => {
        setIsRecoveryMode(false)
        setError('')
        setFeedback('')
        writePath('/login', true)
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
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/')
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>({
    search: '',
    type: 'all',
    category: 'all',
    group: 'all',
  })

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
  const {
    activeMonth,
    currentMonth,
    financialOverview,
    monthlyProjectionInsight,
    monthData,
    filteredTransactions,
    months,
    typeOptions,
    categoryOptions,
    groupOptions,
  } = useDashboardState(budgetGroups, transactions, selectedMonth, transactionFilters)

  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname || '/'
      setCurrentPath(pathname)
      if (pathname === '/app/mensal') {
        const monthFromSearch = readMonthFromSearch(window.location.search)
        if (monthFromSearch) {
          setSelectedMonth(monthFromSearch)
        }
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [setSelectedMonth])

  useEffect(() => {
    if (currentPath !== '/app/mensal') {
      return
    }

    const monthFromSearch = readMonthFromSearch(window.location.search)
    if (monthFromSearch !== '' && monthFromSearch !== selectedMonth) {
      setSelectedMonth(monthFromSearch)
    }
  }, [currentPath, selectedMonth, setSelectedMonth])

  useEffect(() => {
    if (loading) {
      return
    }

    if (isRecoveryMode) {
      document.title = 'Finanças | Recuperar acesso'
      return
    }

    if (!session) {
      document.title = 'Finanças | Entrar'
      if (currentPath !== '/login') {
        writePath('/login', true)
      }
      return
    }

    const authenticatedPath = normalizeAuthenticatedPath(currentPath)
    if (currentPath !== authenticatedPath) {
      writePath(authenticatedPath, true)
    }
    document.title = `Finanças | ${getPageMetadata(authenticatedPath).title}`
  }, [currentPath, isRecoveryMode, loading, session])

  const orphanedCount = transactions.filter((transaction) => transaction.type === 'Despesa' && transaction.budgetGroupId === null).length

  if (!supabase) {
    return <MissingConfig />
  }

  if (loading && !isRecoveryMode && session === null) {
    return (
      <main className="auth-shell">
        <p className="feedback" role="status">Carregando sessão…</p>
      </main>
    )
  }

  if (isRecoveryMode || !session) {
    return (
      <UnauthenticatedApp
        error={error}
        feedback={feedback}
        handlePasswordReset={handlePasswordReset}
        handlePasswordUpdate={handlePasswordUpdate}
        handleSignIn={async (email, password) => {
          const ok = await handleSignIn(email, password)
          if (ok) {
            writePath(DEFAULT_AUTHENTICATED_PATH, true)
            setCurrentPath(DEFAULT_AUTHENTICATED_PATH)
          }
        }}
        handleSignUp={handleSignUp}
        isRecoveryMode={isRecoveryMode}
        setError={setError}
        setFeedback={setFeedback}
        setIsRecoveryMode={setIsRecoveryMode}
        signInLoading={signInLoading}
      />
    )
  }

  const authenticatedPath = normalizeAuthenticatedPath(currentPath)
  const navigateToMonth: Dispatch<SetStateAction<string>> = (value) => {
    const nextMonth = typeof value === 'function' ? value(activeMonth) : value
    setSelectedMonth(nextMonth)
    const searchParams = new URLSearchParams(window.location.search)
    if (nextMonth !== '') {
      searchParams.set('month', nextMonth)
    } else {
      searchParams.delete('month')
    }
    writePathWithSearch('/app/mensal', searchParams)
    setCurrentPath('/app/mensal')
  }

  return (
    <AuthenticatedApp
      budgetGroups={budgetGroups}
      categoryOptions={categoryOptions}
      classificationRules={classificationRules}
      createBudgetGroup={createBudgetGroup}
      createRuleManually={upsertClassificationRule}
      currentMonth={currentMonth}
      currentPath={authenticatedPath}
      deleteBudgetGroup={deleteBudgetGroup}
      deleteClassificationRule={deleteClassificationRule}
      dismissReclassificationPrompt={dismissReclassificationPrompt}
      dismissRememberPrompt={dismissRememberPrompt}
      editingTransaction={editingTransaction}
      error={error}
      feedback={feedback}
      filteredTransactions={filteredTransactions}
      financialOverview={financialOverview}
      groupOptions={groupOptions}
      handleEditTransaction={openTransactionEditor}
      handleImport={handleImport}
      handleSignOut={async () => {
        await handleSignOut()
        writePath('/login', true)
        setCurrentPath('/login')
      }}
      importLoading={importLoading}
      loading={loading}
      monthData={monthData}
      months={months}
      monthlyProjectionInsight={monthlyProjectionInsight}
      navigateTo={(pathname) => {
        setError('')
        setFeedback('')
        if (pathname === '/app/mensal') {
          const searchParams = new URLSearchParams(window.location.search)
          if (activeMonth !== '') {
            searchParams.set('month', activeMonth)
          }
          writePathWithSearch(pathname, searchParams)
        } else {
          writePath(pathname)
        }
        setCurrentPath(pathname)
      }}
      openMonthlyAnalysis={(monthKey) => {
        setError('')
        setFeedback('')
        setSelectedMonth(monthKey)
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.set('month', monthKey)
        writePathWithSearch('/app/mensal', searchParams)
        setCurrentPath('/app/mensal')
      }}
      orphanedCount={orphanedCount}
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
      setSelectedMonth={navigateToMonth}
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
