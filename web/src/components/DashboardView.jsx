import { CategorySection } from './CategorySection'
import { ImportPanel } from './ImportPanel'
import { SummaryTable } from './SummaryTable'
import { TransactionTable } from './TransactionTable'
import { GROUP_LABELS } from '../constants'

function EmptyState() {
  return (
    <section className="panel">
      <h2>Nenhum dado encontrado</h2>
      <p className="muted">
        O app espera uma tabela <code>transactions</code> no Supabase com os campos usados neste dashboard.
      </p>
    </section>
  )
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
  filteredTransactions,
  savingId,
  handleUpdate,
  transactionFilters,
  setTransactionFilters,
  typeOptions,
  categoryOptions,
  groupOptions,
  setSelectedMonth,
}) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Financas pessoais</div>
          <h1>Resumo mensal e revisao</h1>
        </div>
        <div className="toolbar">
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

      {!loading && monthData ? (
        <>
          <SummaryTable monthKey={activeMonth} monthData={monthData} />
          <div className="grid two-up">
            {GROUP_LABELS.map((group) => (
              <CategorySection key={group} group={group} monthData={monthData} />
            ))}
          </div>
          <TransactionTable
            transactions={filteredTransactions}
            savingId={savingId}
            onUpdate={handleUpdate}
            filters={transactionFilters}
            onFiltersChange={(field, value) =>
              setTransactionFilters((current) => ({
                ...current,
                [field]: value,
              }))
            }
            typeOptions={typeOptions}
            categoryOptions={categoryOptions}
            groupOptions={groupOptions}
          />
        </>
      ) : null}

      {!loading && !monthData ? <EmptyState /> : null}
    </main>
  )
}
