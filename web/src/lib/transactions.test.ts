import type { BudgetGroup, ClassificationRule, Transaction } from '../types'
/* eslint-disable max-lines-per-function */
import { describe, expect, it } from 'vitest'
import { buildFinancialOverview, buildMonthData, reclassifyTransactionsWithRules } from './transactions'

describe('reclassifyTransactionsWithRules', () => {
  it('reclassifies matching transactions using the current sorted rules', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        description: 'Ifood mercado pinheiros',
        amount: 32.5,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: null,
      },
      {
        id: 'tx-2',
        description: 'Pagamento de fatura nubank',
        amount: 900,
        type: 'Transferência',
        category: 'Outros',
        budgetGroupId: null,
      },
    ]

    const rules: ClassificationRule[] = [
      {
        id: 'rule-1',
        matchMode: 'description',
        matchDescription: 'ifood mercado',
        matchDescriptionNormalized: 'ifood mercado',
        matchAmount: null,
        type: 'Despesa',
        category: 'Alimentação',
        budgetGroupId: 'group-1',
      },
      {
        id: 'rule-2',
        matchMode: 'description',
        matchDescription: 'pagamento de fatura',
        matchDescriptionNormalized: 'pagamento de fatura',
        matchAmount: null,
        type: 'Transferência',
        category: 'Pagamento de fatura',
        budgetGroupId: 'group-2',
      },
    ]

    const result = reclassifyTransactionsWithRules(transactions, rules)

    expect(result.changedCount).toBe(2)
    expect(result.transactions[0]).toMatchObject({
      type: 'Despesa',
      category: 'Alimentação',
      budgetGroupId: 'group-1',
    })
    expect(result.transactions[1]).toMatchObject({
      type: 'Transferência',
      category: 'Pagamento de fatura',
      budgetGroupId: 'group-2',
    })
  })

  it('normalizes invalid categories when the rule changes the transaction type', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        description: 'salario empresa',
        amount: 5000,
        type: 'Despesa',
        category: 'Alimentação',
        budgetGroupId: 'group-1',
      },
    ]

    const rules: ClassificationRule[] = [
      {
        id: 'rule-1',
        matchMode: 'description',
        matchDescription: 'salario',
        matchDescriptionNormalized: 'salario',
        matchAmount: null,
        type: 'Receita',
        category: 'Alimentação',
        budgetGroupId: 'group-1',
      },
    ]

    const result = reclassifyTransactionsWithRules(transactions, rules)

    expect(result.changedCount).toBe(1)
    expect(result.transactions[0]).toMatchObject({
      type: 'Receita',
      category: 'Outros',
      budgetGroupId: null,
    })
  })

  it('includes grouped transferências in month totals', () => {
    const monthData = buildMonthData(
      [
        {
          id: 'tx-1',
          date: '2026-06-10',
          description: 'Salário',
          amount: 1000,
          type: 'Receita',
          category: 'Salário',
          budgetGroupId: null,
          status: 'Confirmado',
        },
        {
          id: 'tx-2',
          date: '2026-06-11',
          description: 'Aplicação RDB',
          amount: 200,
          type: 'Transferência',
          category: 'Investimentos',
          budgetGroupId: 'group-future',
          status: 'Confirmado',
        },
      ],
      [{ id: 'group-future', name: 'Futuro', targetPercentage: 20 } satisfies BudgetGroup],
    )

    expect(monthData.get('2026-06')!.groups['group-future']!.total).toBe(200)
    expect(monthData.get('2026-06')!.revenue).toBe(1000)
  })

  it('builds financial overview using future installments and recurring probable expenses', () => {
    const overview = buildFinancialOverview(
      [
        {
          id: 'salary-may',
          date: '2026-05-05',
          description: 'Salário',
          amount: 10000,
          type: 'Receita',
          category: 'Salário',
          budgetGroupId: null,
          status: 'Confirmado',
        },
        {
          id: 'salary-jun',
          date: '2026-06-05',
          description: 'Salário',
          amount: 10000,
          type: 'Receita',
          category: 'Salário',
          budgetGroupId: null,
          status: 'Confirmado',
        },
        {
          id: 'rent-may',
          date: '2026-05-10',
          description: 'Aluguel apartamento',
          amount: 3000,
          type: 'Despesa',
          category: 'Moradia',
          budgetGroupId: 'needs',
          status: 'Confirmado',
        },
        {
          id: 'rent-jun',
          date: '2026-06-10',
          description: 'Aluguel apartamento',
          amount: 3000,
          type: 'Despesa',
          category: 'Moradia',
          budgetGroupId: 'needs',
          status: 'Confirmado',
        },
        {
          id: 'parcel-jul',
          date: '2026-07-12',
          description: 'Notebook',
          amount: 800,
          type: 'Despesa',
          category: 'Compras',
          budgetGroupId: 'wants',
          status: 'Confirmado',
          installment: '03/10',
        },
      ],
      [
        { id: 'needs', name: 'Necessidades', targetPercentage: 50 },
        { id: 'wants', name: 'Desejos', targetPercentage: 30 },
        { id: 'future', name: 'Futuro', targetPercentage: 20 },
      ],
      new Date('2026-06-15T12:00:00Z'),
    )

    expect(overview.currentMonthKey).toBe('2026-06')
    expect(overview.projectedMonths).toHaveLength(3)
    expect(overview.projectedMonths[0]).toMatchObject({
      monthKey: '2026-06',
      revenue: 10000,
      confirmedExpenses: 3000,
      probableExpenses: 0,
    })
    expect(overview.projectedMonths[1]).toMatchObject({
      monthKey: '2026-07',
      confirmedExpenses: 800,
      probableExpenses: 3000,
      probableTransactionsCount: 1,
    })
    expect(overview.plannedCommitments).toBe(3800)
    expect(overview.probableCommitments).toBe(6000)
  })
})
