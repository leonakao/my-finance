/* eslint-disable max-lines-per-function */
import { describe, expect, it } from 'vitest'
import type { BudgetGroup, ClassificationRule, Transaction } from '../types'
import {
  buildFinancialOverview,
  buildMonthData,
  getCategoryOptionsForType,
  normalizeClassificationRule,
  normalizeCategoryForType,
  normalizeTransaction,
  reclassifyTransactionsWithRules,
} from './transactions'

describe('category catalogs', () => {
  it('includes the new despesa categories in the editable catalog', () => {
    expect(getCategoryOptionsForType('Despesa')).toContain('Pets')
    expect(getCategoryOptionsForType('Despesa')).toContain('Cuidados pessoais')
    expect(normalizeCategoryForType('Despesa', 'Pets')).toBe('Pets')
    expect(normalizeCategoryForType('Despesa', 'Cuidados pessoais')).toBe('Cuidados pessoais')
  })
})

describe('reclassifyTransactionsWithRules', () => {
  it('normalizes transaction origin metadata and ignored flag', () => {
    expect(
      normalizeTransaction({
        id: 'tx-1',
        date: '2026-06-10',
        description: 'Pix mae',
        amount: '200.00',
        type: 'Despesa',
        category: 'Outros',
        budget_group_id: 'group-1',
        account: 'Conta principal',
        institution: 'Nubank',
        notes: null,
        installment: null,
        origin_transaction_id: 'anchor-1',
        is_ignored: true,
        source_kind: 'manual_recurring',
      }),
    ).toMatchObject({
      originTransactionId: 'anchor-1',
      isIgnored: true,
      sourceKind: 'manual_recurring',
      notes: '',
    })
  })

  it('normalizes rule notes', () => {
    expect(
      normalizeClassificationRule({
        id: 'rule-1',
        match_mode: 'description',
        match_description: 'Pix mãe',
        match_description_normalized: 'pix mae',
        match_amount: null,
        match_institution: null,
        match_account: null,
        type: 'Despesa',
        category: 'Outros',
        budget_group_id: null,
        notes: 'Emprestimo familiar',
        updated_at: '2026-06-12T10:00:00Z',
      }),
    ).toMatchObject({
      notes: 'Emprestimo familiar',
    })
  })

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
        matchInstitution: null,
        matchAccount: null,
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
        matchInstitution: null,
        matchAccount: null,
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
        matchInstitution: null,
        matchAccount: null,
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
        },
        {
          id: 'tx-2',
          date: '2026-06-11',
          description: 'Aplicação RDB',
          amount: 200,
          type: 'Transferência',
          category: 'Investimentos',
          budgetGroupId: 'group-future',
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
        },
        {
          id: 'salary-jun',
          date: '2026-06-05',
          description: 'Salário',
          amount: 10000,
          type: 'Receita',
          category: 'Salário',
          budgetGroupId: null,
        },
        {
          id: 'rent-may',
          date: '2026-05-10',
          description: 'Aluguel apartamento',
          amount: 3000,
          type: 'Despesa',
          category: 'Moradia',
          budgetGroupId: 'needs',
        },
        {
          id: 'rent-jun',
          date: '2026-06-10',
          description: 'Aluguel apartamento',
          amount: 3000,
          type: 'Despesa',
          category: 'Moradia',
          budgetGroupId: 'needs',
        },
        {
          id: 'parcel-jul',
          date: '2026-07-12',
          description: 'Notebook',
          amount: 800,
          type: 'Despesa',
          category: 'Compras',
          budgetGroupId: 'wants',
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
    expect(overview.trendMonths).toMatchObject([
      {
        monthKey: '2026-04',
        revenue: 0,
        expenses: 0,
        net: 0,
        isCurrent: false,
        isProjected: false,
      },
      {
        monthKey: '2026-05',
        revenue: 10000,
        expenses: 3000,
        net: 7000,
        isCurrent: false,
        isProjected: false,
      },
      {
        monthKey: '2026-06',
        revenue: 10000,
        expenses: 3000,
        net: 7000,
        isCurrent: true,
        isProjected: false,
      },
      {
        monthKey: '2026-07',
        revenue: 10000,
        expenses: 3800,
        net: 6200,
        isCurrent: false,
        isProjected: true,
      },
      {
        monthKey: '2026-08',
        revenue: 10000,
        expenses: 3000,
        net: 7000,
        isCurrent: false,
        isProjected: true,
      },
    ])
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
