/* eslint-disable max-lines-per-function */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MonthlyProjectionInsight, ProjectionLineItem, RemovedProjectionItem } from '../types'
import { MonthlyProjectionItems } from './MonthlyProjectionItems'

const registeredItem: ProjectionLineItem = {
  id: 'registered-1',
  kind: 'registered',
  date: '2026-07-12',
  isDateEstimated: false,
  description: 'Notebook para trabalho',
  normalizedDescription: 'notebook para trabalho',
  amount: 800,
  type: 'Despesa',
  category: 'Compras',
  budgetGroupId: 'wants',
  budgetGroupName: 'Desejos',
  installment: '03/10',
  basis: null,
}

const probableItem: ProjectionLineItem = {
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

function insight(overrides: Partial<MonthlyProjectionInsight> = {}): MonthlyProjectionInsight {
  return {
    monthKey: '2026-07',
    isCurrentMonth: false,
    hasProjection: true,
    totals: {
      registeredRevenue: 0,
      probableRevenue: 0,
      registeredExpenses: 800,
      probableExpenses: 150,
      totalRevenue: 0,
      totalExpenses: 950,
      remainingNet: -950,
    },
    balanceToDate: null,
    availableToSpend: null,
    daysRemaining: null,
    weeksRemaining: null,
    weeklyBalance: null,
    weeklySpendingSuggestion: null,
    registeredItems: [registeredItem],
    probableItems: [probableItem],
    removedProbableItems: [],
    groupSummaries: [],
    categorySummaries: [],
    ...overrides,
  }
}

const removedMonthlyItem: RemovedProjectionItem = {
  exclusion: {
    id: 'exclusion-1',
    type: 'Despesa',
    description: 'Internet casa',
    normalizedDescription: 'internet casa',
    scope: 'month',
    monthStart: '2026-07-01',
    createdAt: '2026-06-11T10:00:00.000Z',
  },
  currentEstimate: probableItem,
}

const removedFutureItem: RemovedProjectionItem = {
  exclusion: {
    id: 'exclusion-2',
    type: 'Despesa',
    description: 'Streaming premium',
    normalizedDescription: 'streaming premium',
    scope: 'from_month',
    monthStart: '2026-07-01',
    createdAt: '2026-06-11T11:00:00.000Z',
  },
  currentEstimate: null,
}

function renderItems(overrides: {
  insightOverrides?: Partial<MonthlyProjectionInsight>
  onRemoveProbableItem?: (item: ProjectionLineItem) => void
  onRestoreExclusion?: (id: string) => void
  onToggleRemovedPanel?: (expanded: boolean) => void
  removedPanelExpanded?: boolean
  savingProjectionExclusionId?: string
} = {}) {
  const onRemoveProbableItem = overrides.onRemoveProbableItem ?? vi.fn()
  const onRestoreExclusion = overrides.onRestoreExclusion ?? vi.fn()
  const onToggleRemovedPanel = overrides.onToggleRemovedPanel ?? vi.fn()

  render(
    <MonthlyProjectionItems
      insight={insight(overrides.insightOverrides)}
      onRemoveProbableItem={onRemoveProbableItem}
      onRestoreExclusion={onRestoreExclusion}
      onToggleRemovedPanel={onToggleRemovedPanel}
      removedPanelExpanded={overrides.removedPanelExpanded ?? false}
      savingProjectionExclusionId={overrides.savingProjectionExclusionId ?? ''}
    />,
  )

  return {
    onRemoveProbableItem,
    onRestoreExclusion,
    onToggleRemovedPanel,
  }
}

describe('MonthlyProjectionItems', () => {
  it('separates registered and probable items with explicit headings and status labels', () => {
    renderItems()

    expect(screen.getByRole('heading', { level: 3, name: 'Lançamentos registrados restantes' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Estimativas prováveis' })).toBeTruthy()
    expect(screen.getByText('Registrado')).toBeTruthy()
    expect(screen.getByText('Provável')).toBeTruthy()
  })

  it('shows all registered transaction details including installment', () => {
    renderItems()

    const table = screen.getByRole('table', { name: 'Lançamentos registrados restantes' })
    expect(within(table).getByText('12/07/2026')).toBeTruthy()
    expect(within(table).getByText('Notebook para trabalho')).toBeTruthy()
    expect(within(table).getByText('Despesa')).toBeTruthy()
    expect(within(table).getByText('Compras')).toBeTruthy()
    expect(within(table).getByText('Desejos')).toBeTruthy()
    expect(within(table).getByText('03/10')).toBeTruthy()
    expect(within(table).getByText('R$ 800,00')).toBeTruthy()
  })

  it('shows estimated date, average value and audit basis for probable items', () => {
    renderItems()

    const table = screen.getByRole('table', { name: 'Estimativas prováveis' })
    expect(within(table).getByText('20/07/2026 estimada')).toBeTruthy()
    expect(within(table).getByText('R$ 150,00')).toBeTruthy()
    expect(within(table).getByText(/3 ocorrências em 2 meses/i)).toBeTruthy()
    expect(within(table).getByText(/última em 20\/05\/2026/i)).toBeTruthy()
    expect(within(table).getByRole('button', { name: 'Remover Internet casa da projeção' })).toBeTruthy()
  })

  it('keeps probable items visible when the registered section is empty', () => {
    renderItems({ insightOverrides: { registeredItems: [] } })

    expect(screen.getByText('Nenhum lançamento registrado restante.')).toBeTruthy()
    expect(screen.getByText('Internet casa')).toBeTruthy()
  })

  it('preserves long descriptions and still offers removal only for probable rows', () => {
    const longDescription = 'Assinatura anual extremamente longa com detalhes fornecidos pelo usuário e identificação completa'
    renderItems({
      insightOverrides: {
        probableItems: [],
        registeredItems: [{ ...registeredItem, description: longDescription }],
      },
    })

    expect(screen.getByText(longDescription)).toBeTruthy()
    expect(screen.getByText('Nenhuma recorrência provável identificada.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Remover/i })).toBeNull()
  })

  it('toggles the removed disclosure with grouped count and URL-friendly state callback', async () => {
    const user = userEvent.setup()
    const { onToggleRemovedPanel } = renderItems({
      insightOverrides: {
        removedProbableItems: [removedMonthlyItem, {
          ...removedMonthlyItem,
          exclusion: {
            ...removedMonthlyItem.exclusion,
            id: 'exclusion-1b',
            scope: 'from_month',
          },
        }, removedFutureItem],
      },
    })

    const toggle = screen.getByRole('button', { name: /Ocultando 2 estimativas/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    await user.click(toggle)

    expect(onToggleRemovedPanel).toHaveBeenCalledWith(true)
  })

  it('renders removed items details and restore controls when expanded', async () => {
    const user = userEvent.setup()
    const { onRestoreExclusion } = renderItems({
      insightOverrides: {
        removedProbableItems: [removedMonthlyItem, removedFutureItem],
      },
      removedPanelExpanded: true,
    })

    const panel = screen.getByRole('region', { name: 'Estimativas removidas de Julho de 2026' })
    expect(within(panel).getByText(/Somente em Julho de 2026/i)).toBeTruthy()
    expect(within(panel).getByText(/Desde Julho de 2026/i)).toBeTruthy()
    expect(within(panel).getByText(/Valor médio atual:/i)).toBeTruthy()
    expect(within(panel).getByText('A recorrência não está mais sendo estimada.')).toBeTruthy()

    await user.click(within(panel).getByRole('button', { name: 'Restaurar Internet casa na projeção' }))

    expect(onRestoreExclusion).toHaveBeenCalledWith('exclusion-1')
  })

  it('disables only the restore button being saved', () => {
    renderItems({
      insightOverrides: {
        removedProbableItems: [removedMonthlyItem, removedFutureItem],
      },
      removedPanelExpanded: true,
      savingProjectionExclusionId: 'exclusion-2',
    })

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Restaurar Internet casa na projeção' }).disabled).toBe(false)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Restaurar Streaming premium na projeção' }).disabled).toBe(true)
  })

  it('invokes removal with the selected probable item payload', async () => {
    const user = userEvent.setup()
    const { onRemoveProbableItem } = renderItems()

    await user.click(screen.getByRole('button', { name: 'Remover Internet casa da projeção' }))

    expect(onRemoveProbableItem).toHaveBeenCalledWith(probableItem)
  })
})
