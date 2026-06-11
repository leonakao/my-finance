/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import type { DecoratedTransaction, GroupOption, MonthData, TransactionFilters, TransactionType } from '../types'
import { isFutureMonth } from '../lib/transactions'
import { monthLabel } from '../lib/formatters'
import { DashboardContent } from './DashboardContent'

type MonthlyViewProps = {
  activeMonth: string
  categoryOptions: string[]
  currentMonth: string
  error: string
  feedback: string
  filteredTransactions: DecoratedTransaction[]
  groupOptions: GroupOption[]
  handleEditTransaction: (transactionId: string) => void
  loading: boolean
  monthData: MonthData | null
  months: string[]
  savingId: string
  setSelectedMonth: Dispatch<SetStateAction<string>>
  setTransactionFilters: Dispatch<SetStateAction<TransactionFilters>>
  transactionFilters: TransactionFilters
  typeOptions: TransactionType[]
}

export function MonthlyView({
  activeMonth,
  categoryOptions,
  currentMonth,
  error,
  feedback,
  filteredTransactions,
  groupOptions,
  handleEditTransaction,
  loading,
  monthData,
  months,
  savingId,
  setSelectedMonth,
  setTransactionFilters,
  transactionFilters,
  typeOptions,
}: MonthlyViewProps) {
  const currentIndex = months.indexOf(activeMonth)
  const previousMonth = currentIndex > 0 ? months[currentIndex - 1] : ''
  const nextMonth = currentIndex >= 0 && currentIndex < months.length - 1 ? months[currentIndex + 1] : ''
  const futureMonth = isFutureMonth(activeMonth)

  return (
    <div className="page-stack">
      <section className="panel month-toolbar-panel">
        <div className="month-toolbar">
          <div className="month-switcher">
            <button
              type="button"
              className="ghost month-step"
              aria-label="Mês anterior"
              onClick={() => {
                if (previousMonth) {
                  setSelectedMonth(previousMonth)
                }
              }}
              disabled={!previousMonth}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <label className="month-select">
              <span className="sr-only" id="monthly-select-label">Selecionar mês</span>
              <select aria-labelledby="monthly-select-label" value={activeMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {monthLabel(month)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ghost month-step"
              aria-label="Próximo mês"
              onClick={() => {
                if (nextMonth) {
                  setSelectedMonth(nextMonth)
                }
              }}
              disabled={!nextMonth}
            >
              <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {activeMonth !== currentMonth ? (
              <button type="button" className="ghost" onClick={() => setSelectedMonth(currentMonth)}>
                Hoje
              </button>
            ) : null}
          </div>
          <p className="muted">
            {futureMonth
              ? 'Meses futuros mostram apenas o que já está previsto na base.'
              : 'Esta área combina leitura do mês, revisão e edição dos lançamentos confirmados.'}
          </p>
        </div>
      </section>

      {loading ? (
        <section className="panel skeleton-panel" role="status" aria-label="Carregando dados">
          <div className="skeleton-line narrow" />
          <div className="skeleton-line" />
          <div className="skeleton-line wide" />
          <div className="skeleton-line wide" />
        </section>
      ) : null}
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
      {feedback && !error ? <p className="feedback" role="status">{feedback}</p> : null}

      {!loading ? (
        <DashboardContent
          activeMonth={activeMonth}
          categoryOptions={categoryOptions}
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
          savingId={savingId}
          transactionFilters={transactionFilters}
          typeOptions={typeOptions}
        />
      ) : null}
    </div>
  )
}
