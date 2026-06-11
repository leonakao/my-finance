/* eslint-disable max-lines, max-lines-per-function */
import { describe, expect, it } from 'vitest'
import type { BudgetGroup, ProjectionExclusion, Transaction, TransactionType } from '../types'
import { buildFinancialAnalysis } from './financialAnalysis'

const NOW = new Date(2026, 5, 11, 12)
const BUDGET_GROUPS: BudgetGroup[] = [
  { id: 'needs', name: 'Necessidades', targetPercentage: 50 },
  { id: 'wants', name: 'Desejos', targetPercentage: 30 },
]

function transaction(
  id: string,
  date: string,
  description: string,
  amount: number,
  type: TransactionType,
  category: string,
  budgetGroupId: string | null = null,
  installment?: string,
): Transaction {
  return {
    id,
    date,
    description,
    amount,
    type,
    category,
    budgetGroupId,
    ...(installment ? { installment } : {}),
  }
}

function recurringHistory(
  description: string,
  amount: number,
  type: Exclude<TransactionType, 'Transferência'>,
  category: string,
  budgetGroupId: string | null,
  days = [20, 20],
): Transaction[] {
  return [
    transaction(`${description}-apr`, `2026-04-${String(days[0]).padStart(2, '0')}`, description, amount, type, category, budgetGroupId),
    transaction(`${description}-may`, `2026-05-${String(days[1]).padStart(2, '0')}`, description, amount, type, category, budgetGroupId),
  ]
}

function exclusion(
  normalizedDescription: string,
  scope: ProjectionExclusion['scope'],
  monthStart: string,
  type: ProjectionExclusion['type'] = 'Despesa',
): ProjectionExclusion {
  return {
    id: `${type}:${normalizedDescription}:${scope}:${monthStart}`,
    type,
    description: normalizedDescription,
    normalizedDescription,
    scope,
    monthStart,
    createdAt: '2026-06-11T12:00:00Z',
  }
}

describe('buildFinancialAnalysis', () => {
  it('returns no detailed insight for a past month', () => {
    const analysis = buildFinancialAnalysis([], BUDGET_GROUPS, '2026-05', NOW)

    expect(analysis.monthlyProjectionInsight).toBeNull()
  })

  it('keeps the dashboard projection horizon at three months', () => {
    const analysis = buildFinancialAnalysis([], BUDGET_GROUPS, '2027-01', NOW)

    expect(analysis.overview.projectedMonths.map((month) => month.monthKey)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
    ])
  })

  it('builds an insight for a future month outside the dashboard horizon', () => {
    const analysis = buildFinancialAnalysis(
      [transaction('future', '2027-01-10', 'Curso', 900, 'Despesa', 'Educação', 'wants')],
      BUDGET_GROUPS,
      '2027-01',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight).toMatchObject({
      monthKey: '2027-01',
      hasProjection: true,
      totals: { registeredExpenses: 900 },
    })
  })

  it('treats transactions dated today as realized in the current month', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('salary', '2026-06-01', 'Salário', 5000, 'Receita', 'Salário'),
        transaction('today', '2026-06-11', 'Mercado', 400, 'Despesa', 'Alimentação', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.balanceToDate).toBe(4600)
    expect(analysis.monthlyProjectionInsight?.registeredItems).toHaveLength(0)
  })

  it('keeps only later registered transactions as current-month projection items', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('past', '2026-06-10', 'Conta paga', 100, 'Despesa', 'Moradia', 'needs'),
        transaction('future', '2026-06-12', 'Conta futura', 300, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.registeredItems.map((item) => item.id)).toEqual(['future'])
    expect(analysis.monthlyProjectionInsight?.totals.registeredExpenses).toBe(300)
  })

  it('includes every registered transaction in a future month', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('income', '2026-07-01', 'Salário', 5000, 'Receita', 'Salário'),
        transaction('expense', '2026-07-02', 'Aluguel', 1800, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-07',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.registeredItems).toHaveLength(2)
    expect(analysis.monthlyProjectionInsight?.totals).toMatchObject({
      registeredRevenue: 5000,
      registeredExpenses: 1800,
    })
  })

  it('separates registered and probable revenue and expenses', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('registered-income', '2026-07-05', 'Freela', 800, 'Receita', 'Freelance'),
        transaction('registered-expense', '2026-07-06', 'Academia', 120, 'Despesa', 'Saúde', 'wants'),
        ...recurringHistory('Salário', 5000, 'Receita', 'Salário', null),
        ...recurringHistory('Aluguel', 1800, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-07',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.totals).toEqual({
      registeredRevenue: 800,
      probableRevenue: 5000,
      registeredExpenses: 120,
      probableExpenses: 1800,
      totalRevenue: 5800,
      totalExpenses: 1920,
      remainingNet: 3880,
    })
  })

  it('suppresses a probable item when a persisted match exists in the target month', () => {
    const analysis = buildFinancialAnalysis(
      [
        ...recurringHistory('Aluguel apartamento', 1800, 'Despesa', 'Moradia', 'needs'),
        transaction('registered-rent', '2026-07-10', 'ALUGUEL APARTAMENTO', 1900, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-07',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.probableItems).toHaveLength(0)
    expect(analysis.monthlyProjectionInsight?.totals.registeredExpenses).toBe(1900)
  })

  it('omits probable items whose expected date is already past in the current month', () => {
    const analysis = buildFinancialAnalysis(
      recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs', [5, 5]),
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.probableItems).toHaveLength(0)
  })

  it('includes probable items whose expected date is today or later', () => {
    const analysis = buildFinancialAnalysis(
      recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs', [11, 11]),
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.probableItems[0]).toMatchObject({
      date: '2026-06-11',
      isDateEstimated: true,
      amount: 150,
    })
  })

  it('excludes transfers from balance, totals and projection lists', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('income', '2026-06-01', 'Salário', 1000, 'Receita', 'Salário'),
        transaction('transfer', '2026-06-12', 'Aplicação', 700, 'Transferência', 'Investimentos', 'wants'),
      ],
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.balanceToDate).toBe(1000)
    expect(analysis.monthlyProjectionInsight?.registeredItems).toHaveLength(0)
    expect(analysis.monthlyProjectionInsight?.totals.totalExpenses).toBe(0)
  })

  it('calculates available balance from realized balance and remaining net', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('income-realized', '2026-06-01', 'Salário', 5000, 'Receita', 'Salário'),
        transaction('expense-realized', '2026-06-02', 'Mercado', 1000, 'Despesa', 'Alimentação', 'needs'),
        transaction('income-remaining', '2026-06-20', 'Freela', 500, 'Receita', 'Freelance'),
        transaction('expense-remaining', '2026-06-21', 'Aluguel', 1800, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight).toMatchObject({
      balanceToDate: 4000,
      availableToSpend: 2700,
    })
  })

  it('calculates the positive weekly suggestion using inclusive remaining weeks', () => {
    const analysis = buildFinancialAnalysis(
      [transaction('income', '2026-06-01', 'Salário', 3000, 'Receita', 'Salário')],
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight).toMatchObject({
      daysRemaining: 20,
      weeksRemaining: 3,
      weeklyBalance: 1000,
      weeklySpendingSuggestion: 1000,
    })
  })

  it('clamps the weekly spending suggestion to zero for a projected deficit', () => {
    const analysis = buildFinancialAnalysis(
      [transaction('expense', '2026-06-20', 'Aluguel', 900, 'Despesa', 'Moradia', 'needs')],
      BUDGET_GROUPS,
      '2026-06',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight).toMatchObject({
      availableToSpend: -900,
      weeklyBalance: -300,
      weeklySpendingSuggestion: 0,
    })
  })

  it('does not calculate current-month-only indicators for future months', () => {
    const analysis = buildFinancialAnalysis([], BUDGET_GROUPS, '2026-07', NOW)

    expect(analysis.monthlyProjectionInsight).toMatchObject({
      balanceToDate: null,
      availableToSpend: null,
      daysRemaining: null,
      weeksRemaining: null,
      weeklyBalance: null,
      weeklySpendingSuggestion: null,
    })
  })

  it('sorts items by date, type, amount and description', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('expense-small', '2026-07-10', 'Zebra', 100, 'Despesa', 'Outros', 'wants'),
        transaction('expense-large', '2026-07-10', 'Alpha', 200, 'Despesa', 'Outros', 'wants'),
        transaction('income', '2026-07-10', 'Freela', 50, 'Receita', 'Freelance'),
        transaction('earlier', '2026-07-09', 'Conta', 10, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-07',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.registeredItems.map((item) => item.id)).toEqual([
      'earlier',
      'income',
      'expense-large',
      'expense-small',
    ])
  })

  it('removes a probable item only from the selected month for monthly scope', () => {
    const transactions = recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs')
    const monthlyExclusion = exclusion('internet', 'month', '2026-07-01')

    const july = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-07', NOW, [monthlyExclusion])
    const august = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-08', NOW, [monthlyExclusion])

    expect(july.monthlyProjectionInsight?.probableItems).toHaveLength(0)
    expect(august.monthlyProjectionInsight?.probableItems).toHaveLength(1)
  })

  it('removes a probable item from the initial month onward for future scope', () => {
    const transactions = recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs')
    const futureExclusion = exclusion('internet', 'from_month', '2026-07-01')

    const june = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-06', NOW, [futureExclusion])
    const july = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-07', NOW, [futureExclusion])
    const august = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-08', NOW, [futureExclusion])

    expect(june.monthlyProjectionInsight?.probableItems).toHaveLength(1)
    expect(july.monthlyProjectionInsight?.probableItems).toHaveLength(0)
    expect(august.monthlyProjectionInsight?.probableItems).toHaveLength(0)
  })

  it('applies exclusions to the dashboard projection horizon', () => {
    const transactions = recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs')
    const futureExclusion = exclusion('internet', 'from_month', '2026-07-01')
    const analysis = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-07', NOW, [futureExclusion])

    expect(analysis.overview.projectedMonths.map((month) => month.probableExpenses)).toEqual([150, 0, 0])
  })

  it('recalculates probable revenue and net after removing revenue', () => {
    const transactions = recurringHistory('Salário recorrente', 5000, 'Receita', 'Salário', null)
    const revenueExclusion = exclusion('salario recorrente', 'month', '2026-07-01', 'Receita')
    const analysis = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-07', NOW, [revenueExclusion])

    expect(analysis.monthlyProjectionInsight?.totals).toMatchObject({
      probableRevenue: 0,
      totalRevenue: 0,
      remainingNet: 0,
    })
  })

  it('recalculates expense summaries after removing an expense', () => {
    const transactions = [
      ...recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs'),
      ...recurringHistory('Academia', 100, 'Despesa', 'Saúde', 'wants'),
    ]
    const analysis = buildFinancialAnalysis(
      transactions,
      BUDGET_GROUPS,
      '2026-07',
      NOW,
      [exclusion('internet', 'month', '2026-07-01')],
    )

    expect(analysis.monthlyProjectionInsight?.totals.probableExpenses).toBe(100)
    expect(analysis.monthlyProjectionInsight?.groupSummaries).toHaveLength(1)
    expect(analysis.monthlyProjectionInsight?.categorySummaries.map((item) => item.category)).toEqual(['Saúde'])
  })

  it('recalculates current-month available balance and weekly suggestion', () => {
    const transactions = [
      transaction('income', '2026-06-01', 'Salário', 3000, 'Receita', 'Salário'),
      ...recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs', [20, 20]),
    ]
    const analysis = buildFinancialAnalysis(
      transactions,
      BUDGET_GROUPS,
      '2026-06',
      NOW,
      [exclusion('internet', 'month', '2026-06-01')],
    )

    expect(analysis.monthlyProjectionInsight).toMatchObject({
      availableToSpend: 3000,
      weeklySpendingSuggestion: 1000,
    })
  })

  it('does not subtract a candidate twice when exclusions overlap', () => {
    const transactions = recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs')
    const exclusions = [
      exclusion('internet', 'month', '2026-07-01'),
      exclusion('internet', 'from_month', '2026-06-01'),
    ]
    const analysis = buildFinancialAnalysis(transactions, BUDGET_GROUPS, '2026-07', NOW, exclusions)

    expect(analysis.monthlyProjectionInsight?.totals.probableExpenses).toBe(0)
    expect(analysis.monthlyProjectionInsight?.removedProbableItems).toHaveLength(2)
  })

  it('keeps recurring detection available for a removed item', () => {
    const transactions = recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs')
    const analysis = buildFinancialAnalysis(
      transactions,
      BUDGET_GROUPS,
      '2026-07',
      NOW,
      [exclusion('internet', 'month', '2026-07-01')],
    )

    expect(analysis.monthlyProjectionInsight?.removedProbableItems[0]?.currentEstimate).toMatchObject({
      description: 'Internet',
      amount: 150,
    })
  })

  it('keeps an obsolete exclusion restorable without creating an estimate', () => {
    const obsoleteExclusion = exclusion('servico encerrado', 'from_month', '2026-06-01')
    const analysis = buildFinancialAnalysis([], BUDGET_GROUPS, '2026-07', NOW, [obsoleteExclusion])

    expect(analysis.monthlyProjectionInsight?.removedProbableItems).toEqual([{
      exclusion: obsoleteExclusion,
      currentEstimate: null,
    }])
  })

  it('does not expose an estimate when a persisted match already exists', () => {
    const transactions = [
      ...recurringHistory('Internet', 150, 'Despesa', 'Moradia', 'needs'),
      transaction('registered', '2026-07-20', 'Internet', 160, 'Despesa', 'Moradia', 'needs'),
    ]
    const analysis = buildFinancialAnalysis(
      transactions,
      BUDGET_GROUPS,
      '2026-07',
      NOW,
      [exclusion('internet', 'month', '2026-07-01')],
    )

    expect(analysis.monthlyProjectionInsight?.removedProbableItems[0]?.currentEstimate).toBeNull()
    expect(analysis.monthlyProjectionInsight?.totals.registeredExpenses).toBe(160)
  })

  it('keeps revenue and expense exclusions independent', () => {
    const transactions = [
      ...recurringHistory('Mensalidade', 500, 'Receita', 'Freelance', null),
      ...recurringHistory('Mensalidade', 100, 'Despesa', 'Assinaturas', 'wants'),
    ]
    const analysis = buildFinancialAnalysis(
      transactions,
      BUDGET_GROUPS,
      '2026-07',
      NOW,
      [exclusion('mensalidade', 'month', '2026-07-01', 'Despesa')],
    )

    expect(analysis.monthlyProjectionInsight?.totals).toMatchObject({
      probableRevenue: 500,
      probableExpenses: 0,
    })
  })

  it('sorts expense groups by budget configuration and leaves ungrouped last', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('ungrouped', '2026-07-01', 'Sem grupo', 10, 'Despesa', 'Outros'),
        transaction('wants', '2026-07-01', 'Cinema', 20, 'Despesa', 'Lazer', 'wants'),
        transaction('needs', '2026-07-01', 'Mercado', 30, 'Despesa', 'Alimentação', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-07',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.groupSummaries.map((group) => group.budgetGroupName)).toEqual([
      'Necessidades',
      'Desejos',
      'Sem grupo',
    ])
  })

  it('sorts categories by type, total and localized name', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('income-small', '2026-07-01', 'Freela', 100, 'Receita', 'Freelance'),
        transaction('income-large', '2026-07-01', 'Salário', 1000, 'Receita', 'Salário'),
        transaction('expense-small', '2026-07-01', 'Farmácia', 50, 'Despesa', 'Saúde', 'needs'),
        transaction('expense-large', '2026-07-01', 'Aluguel', 500, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-07',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.categorySummaries.map(({ type, category }) => `${type}:${category}`)).toEqual([
      'Receita:Salário',
      'Receita:Freelance',
      'Despesa:Moradia',
      'Despesa:Saúde',
    ])
  })

  it('exposes the audit basis and deterministic id for probable items', () => {
    const analysis = buildFinancialAnalysis(
      [
        transaction('internet-apr', '2026-04-20', 'Internet Casa', 100, 'Despesa', 'Moradia', 'needs'),
        transaction('internet-may', '2026-05-20', 'Internet Casa', 200, 'Despesa', 'Moradia', 'needs'),
      ],
      BUDGET_GROUPS,
      '2026-07',
      NOW,
    )

    expect(analysis.monthlyProjectionInsight?.probableItems[0]).toMatchObject({
      id: 'probable:2026-07:Despesa:internet casa',
      amount: 150,
      basis: {
        averageAmount: 150,
        occurrenceCount: 2,
        observedMonthCount: 2,
        lastObservedDate: '2026-05-20',
      },
    })
  })
})
