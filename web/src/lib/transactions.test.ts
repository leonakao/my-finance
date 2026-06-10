import type { BudgetGroup, ClassificationRule, Transaction } from '../types'
/* eslint-disable max-lines-per-function */
import { describe, expect, it } from 'vitest'
import { buildMonthData, reclassifyTransactionsWithRules } from './transactions'

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
})
