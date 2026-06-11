import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MonthlyProjectionInsight } from '../types'
import { MonthlyProjectionBreakdown } from './MonthlyProjectionBreakdown'

function insight(overrides: Partial<MonthlyProjectionInsight> = {}): MonthlyProjectionInsight {
  return {
    monthKey: '2026-07',
    isCurrentMonth: false,
    hasProjection: true,
    totals: {
      registeredRevenue: 1000,
      probableRevenue: 500,
      registeredExpenses: 300,
      probableExpenses: 200,
      totalRevenue: 1500,
      totalExpenses: 500,
      remainingNet: 1000,
    },
    balanceToDate: null,
    availableToSpend: null,
    daysRemaining: null,
    weeksRemaining: null,
    weeklyBalance: null,
    weeklySpendingSuggestion: null,
    registeredItems: [],
    probableItems: [],
    groupSummaries: [
      {
        budgetGroupId: 'needs',
        budgetGroupName: 'Necessidades',
        registeredAmount: 300,
        probableAmount: 100,
        totalAmount: 400,
        itemCount: 2,
      },
      {
        budgetGroupId: null,
        budgetGroupName: 'Sem grupo',
        registeredAmount: 0,
        probableAmount: 100,
        totalAmount: 100,
        itemCount: 1,
      },
    ],
    categorySummaries: [
      {
        type: 'Receita',
        category: 'Salário',
        registeredAmount: 1000,
        probableAmount: 500,
        totalAmount: 1500,
        itemCount: 2,
      },
      {
        type: 'Despesa',
        category: 'Moradia',
        registeredAmount: 300,
        probableAmount: 200,
        totalAmount: 500,
        itemCount: 3,
      },
    ],
    ...overrides,
  }
}

describe('MonthlyProjectionBreakdown', () => {
  it('shows registered, probable and total columns for expense groups', () => {
    render(<MonthlyProjectionBreakdown insight={insight()} />)

    const table = screen.getByRole('table', { name: 'Resumo de despesas por grupo de orçamento' })
    expect(within(table).getByRole('columnheader', { name: 'Registrado' })).toBeTruthy()
    expect(within(table).getByRole('columnheader', { name: 'Provável' })).toBeTruthy()
    expect(within(table).getByRole('columnheader', { name: 'Total' })).toBeTruthy()
    expect(within(table).getByText('Necessidades')).toBeTruthy()
  })

  it('preserves the engine order with ungrouped expenses last', () => {
    render(<MonthlyProjectionBreakdown insight={insight()} />)

    const rows = within(
      screen.getByRole('table', { name: 'Resumo de despesas por grupo de orçamento' }),
    ).getAllByRole('row')

    expect(rows[1]?.textContent).toContain('Necessidades')
    expect(rows[2]?.textContent).toContain('Sem grupo')
  })

  it('separates revenue and expense categories under hierarchical headings', () => {
    render(<MonthlyProjectionBreakdown insight={insight()} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Receitas por categoria' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Despesas por categoria' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Resumo de receitas por categoria' })).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Resumo de despesas por categoria' })).toBeTruthy()
  })

  it('does not render an empty group table when the projection has only revenue', () => {
    render(
      <MonthlyProjectionBreakdown
        insight={insight({
          groupSummaries: [],
          categorySummaries: [insight().categorySummaries[0]!],
        })}
      />,
    )

    expect(screen.queryByRole('table', { name: 'Resumo de despesas por grupo de orçamento' })).toBeNull()
    expect(screen.getByText('Receitas não pertencem a grupos de orçamento.')).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Resumo de receitas por categoria' })).toBeTruthy()
  })
})
