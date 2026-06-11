import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MonthlyProjectionInsight, ProjectionLineItem } from '../types'
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

describe('MonthlyProjectionItems', () => {
  it('separates registered and probable items with explicit headings and status labels', () => {
    render(<MonthlyProjectionItems insight={insight()} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Lançamentos registrados restantes' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Estimativas prováveis' })).toBeTruthy()
    expect(screen.getByText('Registrado')).toBeTruthy()
    expect(screen.getByText('Provável')).toBeTruthy()
  })

  it('shows all registered transaction details including installment', () => {
    render(<MonthlyProjectionItems insight={insight()} />)

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
    render(<MonthlyProjectionItems insight={insight()} />)

    const table = screen.getByRole('table', { name: 'Estimativas prováveis' })
    expect(within(table).getByText('20/07/2026 estimada')).toBeTruthy()
    expect(within(table).getByText('R$ 150,00')).toBeTruthy()
    expect(within(table).getByText(/3 ocorrências em 2 meses/i)).toBeTruthy()
    expect(within(table).getByText(/última em 20\/05\/2026/i)).toBeTruthy()
  })

  it('keeps probable items visible when the registered section is empty', () => {
    render(<MonthlyProjectionItems insight={insight({ registeredItems: [] })} />)

    expect(screen.getByText('Nenhum lançamento registrado restante.')).toBeTruthy()
    expect(screen.getByText('Internet casa')).toBeTruthy()
  })

  it('preserves long descriptions without exposing editing controls', () => {
    const longDescription = 'Assinatura anual extremamente longa com detalhes fornecidos pelo usuário e identificação completa'
    render(
      <MonthlyProjectionItems
        insight={insight({
          probableItems: [],
          registeredItems: [{ ...registeredItem, description: longDescription }],
        })}
      />,
    )

    expect(screen.getByText(longDescription)).toBeTruthy()
    expect(screen.getByText('Nenhuma recorrência provável identificada.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
