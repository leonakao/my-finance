import { describe, expect, it } from 'vitest'
import type { ClassificationRule, Transaction } from '../types'
import { reclassifyTransactionsWithRules } from './transactions'

describe('reclassifyTransactionsWithRules context filters', () => {
  it('respects account and institution filters when reclassifying', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        description: 'assinatura premium',
        amount: 19.9,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: null,
        institution: 'Nubank',
        account: 'Cartão de crédito',
      },
      {
        id: 'tx-2',
        description: 'assinatura premium',
        amount: 19.9,
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: null,
        institution: 'Nubank',
        account: 'Conta corrente',
      },
    ]

    const rules: ClassificationRule[] = [
      {
        id: 'rule-1',
        matchMode: 'description',
        matchDescription: 'assinatura premium',
        matchDescriptionNormalized: 'assinatura premium',
        matchAmount: null,
        matchInstitution: 'Nubank',
        matchAccount: 'Cartão de crédito',
        type: 'Despesa',
        category: 'Assinaturas',
        budgetGroupId: 'group-1',
      },
    ]

    const result = reclassifyTransactionsWithRules(transactions, rules)

    expect(result.changedCount).toBe(1)
    expect(result.transactions[0]).toMatchObject({
      category: 'Assinaturas',
      budgetGroupId: 'group-1',
    })
    expect(result.transactions[1]).toMatchObject({
      category: 'Outros',
      budgetGroupId: null,
    })
  })
})
