import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MonthlyProjectionInsight } from '../types'
import { MonthlyProjectionSummary } from './MonthlyProjectionSummary'

function insight(overrides: Partial<MonthlyProjectionInsight> = {}): MonthlyProjectionInsight {
  return {
    monthKey: '2026-06',
    isCurrentMonth: true,
    hasProjection: true,
    totals: {
      registeredRevenue: 500,
      probableRevenue: 200,
      registeredExpenses: 900,
      probableExpenses: 300,
      totalRevenue: 700,
      totalExpenses: 1200,
      remainingNet: -500,
    },
    balanceToDate: 2000,
    availableToSpend: 1500,
    daysRemaining: 20,
    weeksRemaining: 3,
    weeklyBalance: 500,
    weeklySpendingSuggestion: 500,
    registeredItems: [],
    probableItems: [],
    removedProbableItems: [],
    groupSummaries: [],
    categorySummaries: [],
    ...overrides,
  }
}

describe('MonthlyProjectionSummary', () => {
  it('shows the complete current-month metric set', () => {
    render(<MonthlyProjectionSummary insight={insight()} />)

    const section = screen.getByRole('region', { name: 'Projeção restante de Junho de 2026' })
    expect(within(section).getByText('Saldo realizado até hoje')).toBeTruthy()
    expect(within(section).getByText('Receitas restantes')).toBeTruthy()
    expect(within(section).getByText('Despesas registradas restantes')).toBeTruthy()
    expect(within(section).getByText('Despesas prováveis')).toBeTruthy()
    expect(within(section).getByText('Saldo projetado do mês')).toBeTruthy()
    expect(within(section).getByText('Sugestão por semana')).toBeTruthy()
    expect(within(section).getByText(/registrado: R\$ 500,00/i)).toBeTruthy()
  })

  it('shows the future-month origin split without a weekly suggestion', () => {
    render(
      <MonthlyProjectionSummary
        insight={insight({
          monthKey: '2026-07',
          isCurrentMonth: false,
          balanceToDate: null,
          availableToSpend: null,
          daysRemaining: null,
          weeksRemaining: null,
          weeklyBalance: null,
          weeklySpendingSuggestion: null,
        })}
      />,
    )

    expect(screen.getByText('Receitas registradas')).toBeTruthy()
    expect(screen.getByText('Receitas prováveis')).toBeTruthy()
    expect(screen.getByText('Despesas registradas')).toBeTruthy()
    expect(screen.getByText('Despesas prováveis')).toBeTruthy()
    expect(screen.getByText('Saldo projetado')).toBeTruthy()
    expect(screen.queryByText('Sugestão por semana')).not.toBeTruthy()
  })

  it('announces a deficit explicitly and clamps the suggestion to zero', () => {
    render(
      <MonthlyProjectionSummary
        insight={insight({
          availableToSpend: -600,
          weeklyBalance: -200,
          weeklySpendingSuggestion: 0,
        })}
      />,
    )

    expect(screen.getByText(/há um déficit projetado de R\$ 600,00/i)).toBeTruthy()
    expect(screen.getByText('R$ 0,00')).toBeTruthy()
  })

  it('keeps the panel visible with contextual recovery when there is no projection', () => {
    render(
      <MonthlyProjectionSummary
        insight={insight({
          hasProjection: false,
          totals: {
            registeredRevenue: 0,
            probableRevenue: 0,
            registeredExpenses: 0,
            probableExpenses: 0,
            totalRevenue: 0,
            totalExpenses: 0,
            remainingNet: 0,
          },
        })}
      />,
    )

    expect(screen.getByText('Nenhum lançamento registrado ou provável para este período.')).toBeTruthy()
    expect(screen.getByText(/revise outro mês ou importe lançamentos/i)).toBeTruthy()
  })
})
