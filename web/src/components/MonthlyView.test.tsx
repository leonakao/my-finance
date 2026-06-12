/* eslint-disable complexity */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  DecoratedTransaction,
  GroupOption,
  MonthlyProjectionInsight,
  ProjectionExclusion,
  ProjectionLineItem,
  TransactionFilters,
  TransactionType,
} from '../types'
import { MonthlyView } from './MonthlyView'

const EMPTY_FILTERS: TransactionFilters = {
  search: '',
  type: 'all',
  category: 'all',
  group: 'all',
}

const PROBABLE_ITEM: ProjectionLineItem = {
  id: 'probable:2026-07:Despesa:internet casa',
  kind: 'probable',
  date: '2026-07-20',
  isDateEstimated: true,
  description: 'Internet casa',
  normalizedDescription: 'internet casa',
  amount: 150,
  type: 'Despesa',
  category: 'Moradia',
  budgetGroupId: 'needs',
  budgetGroupName: 'Necessidades',
  installment: null,
  basis: {
    averageAmount: 150,
    occurrenceCount: 3,
    observedMonthCount: 2,
    lastObservedDate: '2026-05-20',
  },
}

const INSIGHT: MonthlyProjectionInsight = {
  monthKey: '2026-07',
  isCurrentMonth: false,
  hasProjection: true,
  totals: {
    registeredRevenue: 0,
    probableRevenue: 0,
    registeredExpenses: 0,
    probableExpenses: 150,
    totalRevenue: 0,
    totalExpenses: 150,
    remainingNet: -150,
  },
  balanceToDate: null,
  availableToSpend: null,
  daysRemaining: null,
  weeksRemaining: null,
  weeklyBalance: null,
  weeklySpendingSuggestion: null,
  registeredItems: [],
  probableItems: [PROBABLE_ITEM],
  removedProbableItems: [],
  groupSummaries: [],
  categorySummaries: [],
}

const LAST_CREATED: ProjectionExclusion = {
  id: 'exclusion-1',
  type: 'Despesa',
  description: 'Internet casa',
  normalizedDescription: 'internet casa',
  scope: 'month',
  monthStart: '2026-07-01',
  createdAt: '2026-06-11T10:00:00.000Z',
}

function renderMonthlyView(overrides: {
  createProjectionExclusion?: (payload: {
    type: ProjectionLineItem['type']
    description: string
    normalizedDescription: string
    scope: 'month' | 'from_month'
    monthKey: string
  }) => Promise<boolean>
  feedback?: string
  lastCreatedProjectionExclusion?: ProjectionExclusion | null
  onToggleRemovedPanel?: (expanded: boolean) => void
  projectionInsight?: MonthlyProjectionInsight | null
  removedPanelExpanded?: boolean
  restoreProjectionExclusion?: (id: string) => Promise<boolean>
  savingProjectionExclusionId?: string
  undoLastProjectionExclusion?: () => Promise<boolean>
} = {}) {
  const createProjectionExclusion = overrides.createProjectionExclusion ?? vi.fn(() => Promise.resolve(true))
  const onToggleRemovedPanel = overrides.onToggleRemovedPanel ?? vi.fn()
  const restoreProjectionExclusion = overrides.restoreProjectionExclusion ?? vi.fn(() => Promise.resolve(true))
  const undoLastProjectionExclusion = overrides.undoLastProjectionExclusion ?? vi.fn(() => Promise.resolve(true))
  const setSelectedMonth = vi.fn()
  const setTransactionFilters = vi.fn()

  render(
    <MonthlyView
      activeMonth="2026-07"
      categoryOptions={[]}
      createProjectionExclusion={createProjectionExclusion}
      currentMonth="2026-06"
      error=""
      feedback={overrides.feedback ?? ''}
      filteredTransactions={[] as DecoratedTransaction[]}
      groupOptions={[] as GroupOption[]}
      handleEditTransaction={vi.fn()}
      loading={false}
      lastCreatedProjectionExclusion={overrides.lastCreatedProjectionExclusion ?? null}
      monthData={null}
      months={['2026-06', '2026-07', '2026-08']}
      onToggleRemovedPanel={onToggleRemovedPanel}
      projectionInsight={overrides.projectionInsight ?? INSIGHT}
      removedPanelExpanded={overrides.removedPanelExpanded ?? false}
      restoreProjectionExclusion={restoreProjectionExclusion}
      savingId=""
      savingProjectionExclusionId={overrides.savingProjectionExclusionId ?? ''}
      setSelectedMonth={setSelectedMonth}
      setTransactionFilters={setTransactionFilters}
      transactionFilters={EMPTY_FILTERS}
      typeOptions={[] as TransactionType[]}
      undoLastProjectionExclusion={undoLastProjectionExclusion}
    />,
  )

  return {
    createProjectionExclusion,
    onToggleRemovedPanel,
    restoreProjectionExclusion,
    setSelectedMonth,
    setTransactionFilters,
    undoLastProjectionExclusion,
  }
}

describe('MonthlyView', () => {
  it('opens the dialog with the selected probable item', async () => {
    const user = userEvent.setup()
    renderMonthlyView()

    await user.click(screen.getByRole('button', { name: 'Remover Internet casa da projeção' }))

    expect(screen.getByRole('dialog', { name: 'Remover estimativa da projeção' })).toBeTruthy()
    expect(screen.getByText(/Internet casa está estimada em R\$ 150,00 para Julho de 2026/i)).toBeTruthy()
  })

  it('submits the normalized payload for the selected month', async () => {
    const user = userEvent.setup()
    const { createProjectionExclusion } = renderMonthlyView()

    await user.click(screen.getByRole('button', { name: 'Remover Internet casa da projeção' }))
    await user.click(screen.getByRole('button', { name: 'Remover da projeção' }))

    expect(createProjectionExclusion).toHaveBeenCalledWith({
      type: 'Despesa',
      description: 'Internet casa',
      normalizedDescription: 'internet casa',
      scope: 'month',
      monthKey: '2026-07',
    })
  })

  it('keeps the projection intact when the dialog is cancelled', async () => {
    const user = userEvent.setup()
    const { createProjectionExclusion } = renderMonthlyView()

    await user.click(screen.getByRole('button', { name: 'Remover Internet casa da projeção' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog', { name: 'Remover estimativa da projeção' })).toBeNull()
    expect(screen.getByText('Internet casa')).toBeTruthy()
    expect(createProjectionExclusion).not.toHaveBeenCalled()
  })

  it('propagates restore and removed-panel state to the detail component', async () => {
    const user = userEvent.setup()
    const { onToggleRemovedPanel, restoreProjectionExclusion } = renderMonthlyView({
      projectionInsight: {
        ...INSIGHT,
        removedProbableItems: [{
          exclusion: LAST_CREATED,
          currentEstimate: PROBABLE_ITEM,
        }],
      },
      removedPanelExpanded: true,
    })

    await user.click(screen.getByRole('button', { name: /Ocultando 1 estimativa/i }))
    await user.click(screen.getByRole('button', { name: 'Restaurar Internet casa na projeção' }))

    expect(onToggleRemovedPanel).toHaveBeenCalledWith(false)
    expect(restoreProjectionExclusion).toHaveBeenCalledWith('exclusion-1')
  })

  it('offers an actionable undo feedback after a successful removal', async () => {
    const user = userEvent.setup()
    const { undoLastProjectionExclusion } = renderMonthlyView({
      feedback: 'Estimativa removida da projeção.',
      lastCreatedProjectionExclusion: LAST_CREATED,
    })

    await user.click(screen.getByRole('button', { name: 'Desfazer' }))

    expect(undoLastProjectionExclusion).toHaveBeenCalledTimes(1)
  })

  it('closes the dialog after a successful creation', async () => {
    const user = userEvent.setup()
    const createProjectionExclusion = vi.fn(() => Promise.resolve(true))
    renderMonthlyView({ createProjectionExclusion })

    await user.click(screen.getByRole('button', { name: 'Remover Internet casa da projeção' }))
    await user.click(screen.getByRole('button', { name: 'Remover da projeção' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Remover estimativa da projeção' })).toBeNull()
    })
  })
})
