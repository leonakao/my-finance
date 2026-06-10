import type { BudgetGroup, DecoratedTransaction, GroupOption, MonthData, TransactionFilters, TransactionType } from '../types'
import { DashboardContent } from './DashboardContent'
import { ImportPanel } from './ImportPanel'

type DashboardViewProps = {
  activeMonth: string
  months: string[]
  loading: boolean
  error: string
  feedback: string
  importLoading: boolean
  handleImport: (payload: { kind: 'account' | 'card' | 'santander-card-pdf' | 'santander-account-pdf'; invoice: string; file: File }) => Promise<void>
  handleSignOut: () => Promise<void>
  monthData: MonthData | null
  budgetGroups: BudgetGroup[]
  savingGroupId: string
  createBudgetGroup: (payload: { name: string; targetPercentage: number }) => Promise<boolean>
  updateBudgetGroup: (id: string, payload: { name: string; targetPercentage: number }) => Promise<boolean>
  deleteBudgetGroup: (id: string) => Promise<boolean>
  filteredTransactions: DecoratedTransaction[]
  savingId: string
  handleEditTransaction: (transactionId: string) => void
  transactionFilters: TransactionFilters
  setTransactionFilters: React.Dispatch<React.SetStateAction<TransactionFilters>>
  typeOptions: TransactionType[]
  categoryOptions: string[]
  groupOptions: GroupOption[]
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>
  openRulesView: () => void
}

export function DashboardView({
  activeMonth,
  months,
  loading,
  error,
  feedback,
  importLoading,
  handleImport,
  handleSignOut,
  monthData,
  budgetGroups,
  savingGroupId,
  createBudgetGroup,
  updateBudgetGroup,
  deleteBudgetGroup,
  filteredTransactions,
  savingId,
  handleEditTransaction,
  transactionFilters,
  setTransactionFilters,
  typeOptions,
  categoryOptions,
  groupOptions,
  setSelectedMonth,
  openRulesView,
}: DashboardViewProps) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Financas pessoais</div>
          <h1>Resumo mensal e revisao</h1>
        </div>
        <div className="toolbar">
          <button type="button" className="ghost" onClick={openRulesView}>
            Regras
          </button>
          <select value={activeMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <button type="button" className="ghost" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </header>

      {loading ? <p className="feedback">Carregando dados...</p> : null}
      {error ? <p className="feedback error">{error}</p> : null}
      {feedback && !error ? <p className="feedback">{feedback}</p> : null}

      {!loading ? <ImportPanel onImport={handleImport} loading={importLoading} /> : null}

      {!loading ? (
        <DashboardContent
          activeMonth={activeMonth}
          budgetGroups={budgetGroups}
          categoryOptions={categoryOptions}
          createBudgetGroup={createBudgetGroup}
          deleteBudgetGroup={deleteBudgetGroup}
          filteredTransactions={filteredTransactions}
          groupOptions={groupOptions}
          handleEditTransaction={handleEditTransaction}
          monthData={monthData}
          onFiltersChange={(field: keyof TransactionFilters, value: string) =>
            setTransactionFilters((current) => ({
              ...current,
              [field]: value,
            }))
          }
          savingGroupId={savingGroupId}
          savingId={savingId}
          transactionFilters={transactionFilters}
          typeOptions={typeOptions}
          updateBudgetGroup={updateBudgetGroup}
        />
      ) : null}
    </main>
  )
}
