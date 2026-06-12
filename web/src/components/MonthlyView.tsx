/* eslint-disable max-lines-per-function */
/* eslint-disable complexity */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import type {
  DecoratedTransaction,
  GroupOption,
  MonthData,
  MonthlyProjectionInsight,
  ProjectionExclusion,
  ProjectionLineItem,
  ProjectionExclusionScope,
  TransactionFilters,
  TransactionType,
} from '../types'
import { isFutureMonth } from '../lib/transactions'
import { monthLabel } from '../lib/formatters'
import { DashboardContent } from './DashboardContent'
import { MonthlyProjectionBreakdown } from './MonthlyProjectionBreakdown'
import { MonthlyProjectionItems } from './MonthlyProjectionItems'
import { MonthlyProjectionSummary } from './MonthlyProjectionSummary'
import { ProjectionExclusionDialog } from './ProjectionExclusionDialog'

type MonthlyViewProps = {
  activeMonth: string
  categoryOptions: string[]
  createProjectionExclusion: (payload: {
    type: ProjectionLineItem['type']
    description: string
    normalizedDescription: string
    scope: ProjectionExclusionScope
    monthKey: string
  }) => Promise<boolean>
  currentMonth: string
  error: string
  feedback: string
  filteredTransactions: DecoratedTransaction[]
  groupOptions: GroupOption[]
  handleEditTransaction: (transactionId: string) => void
  loading: boolean
  lastCreatedProjectionExclusion: ProjectionExclusion | null
  monthData: MonthData | null
  months: string[]
  onToggleRemovedPanel: (expanded: boolean) => void
  projectionInsight: MonthlyProjectionInsight | null
  removedPanelExpanded: boolean
  restoreProjectionExclusion: (id: string) => Promise<boolean>
  savingId: string
  savingProjectionExclusionId: string
  setSelectedMonth: Dispatch<SetStateAction<string>>
  setTransactionFilters: Dispatch<SetStateAction<TransactionFilters>>
  transactionFilters: TransactionFilters
  typeOptions: TransactionType[]
  undoLastProjectionExclusion: () => Promise<boolean>
}

export function MonthlyView({
  activeMonth,
  categoryOptions,
  createProjectionExclusion,
  currentMonth,
  error,
  feedback,
  filteredTransactions,
  groupOptions,
  handleEditTransaction,
  loading,
  lastCreatedProjectionExclusion,
  monthData,
  months,
  onToggleRemovedPanel,
  projectionInsight,
  removedPanelExpanded,
  restoreProjectionExclusion,
  savingId,
  savingProjectionExclusionId,
  setSelectedMonth,
  setTransactionFilters,
  transactionFilters,
  typeOptions,
  undoLastProjectionExclusion,
}: MonthlyViewProps) {
  const [selectedProbableItem, setSelectedProbableItem] = useState<ProjectionLineItem | null>(null)
  const currentIndex = months.indexOf(activeMonth)
  const previousMonth = currentIndex > 0 ? months[currentIndex - 1] : ''
  const nextMonth = currentIndex >= 0 && currentIndex < months.length - 1 ? months[currentIndex + 1] : ''
  const futureMonth = isFutureMonth(activeMonth)

  async function handleConfirmProjectionExclusion(scope: ProjectionExclusionScope) {
    if (selectedProbableItem === null) {
      return
    }

    const created = await createProjectionExclusion({
      type: selectedProbableItem.type,
      description: selectedProbableItem.description,
      normalizedDescription: selectedProbableItem.normalizedDescription,
      scope,
      monthKey: activeMonth,
    })

    if (created) {
      setSelectedProbableItem(null)
    }
  }

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
              ? 'Meses futuros combinam lançamentos registrados e estimativas recorrentes.'
              : 'Esta área combina leitura do mês, revisão e edição dos lançamentos confirmados.'}
          </p>
        </div>
      </section>

      {loading ? (
        <div className="page-stack" role="status" aria-label="Carregando análise mensal" aria-busy="true">
          <section className="panel skeleton-panel" aria-hidden="true">
            <div className="skeleton-line narrow" />
            <div className="monthly-projection-metrics">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="monthly-projection-metric" key={index}>
                  <div className="skeleton-line" />
                  <div className="skeleton-line wide" />
                </div>
              ))}
            </div>
          </section>
          <section className="panel skeleton-panel" aria-hidden="true">
            <div className="skeleton-line narrow" />
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
          </section>
          <section className="panel skeleton-panel" aria-hidden="true">
            <div className="skeleton-line narrow" />
            <div className="skeleton-line" />
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
          </section>
        </div>
      ) : null}
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
      {feedback && !error ? <p className="feedback" role="status">{feedback}</p> : null}
      {lastCreatedProjectionExclusion !== null && !error ? (
        <p className="feedback" role="status">
          <span className="feedback-copy">
            Estimativa “{lastCreatedProjectionExclusion.description}” removida da projeção.
          </span>
          <button
            type="button"
            className="ghost feedback-action"
            disabled={savingProjectionExclusionId !== ''}
            onClick={() => void undoLastProjectionExclusion()}
          >
            {savingProjectionExclusionId === lastCreatedProjectionExclusion.id ? (
              <span className="button-spinner" aria-hidden="true" />
            ) : null}
            Desfazer
          </button>
        </p>
      ) : null}

      {!loading && projectionInsight !== null ? (
        <>
          <MonthlyProjectionSummary insight={projectionInsight} />
          <MonthlyProjectionBreakdown insight={projectionInsight} />
          <MonthlyProjectionItems
            insight={projectionInsight}
            onRemoveProbableItem={setSelectedProbableItem}
            onRestoreExclusion={(id) => {
              void restoreProjectionExclusion(id)
            }}
            onToggleRemovedPanel={onToggleRemovedPanel}
            removedPanelExpanded={removedPanelExpanded}
            savingProjectionExclusionId={savingProjectionExclusionId}
          />
        </>
      ) : null}

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
      <ProjectionExclusionDialog
        item={selectedProbableItem}
        monthKey={activeMonth}
        saving={savingProjectionExclusionId.startsWith('optimistic:')}
        onClose={() => setSelectedProbableItem(null)}
        onConfirm={handleConfirmProjectionExclusion}
      />
    </div>
  )
}
