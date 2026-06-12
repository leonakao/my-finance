import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ClassificationRulesView } from './ClassificationRulesView'
import type { BudgetGroup, ClassificationRule, ClassificationRulePayload } from '../types'

const budgetGroups: BudgetGroup[] = [
  { id: 'group-1', name: 'Necessidades', targetPercentage: 50 },
]

const rule: ClassificationRule = {
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
}

function renderView(overrides: Partial<ComponentProps<typeof ClassificationRulesView>> = {}) {
  const onCreateRule: (payload: ClassificationRulePayload) => Promise<ClassificationRule | null> = vi
    .fn()
    .mockResolvedValue(null)
  const onDeleteRule = vi.fn().mockResolvedValue(true)
  const onUpdateRule = vi.fn().mockResolvedValue(true)

  render(
    <ClassificationRulesView
      budgetGroups={budgetGroups}
      classificationRules={[rule]}
      error=""
      feedback=""
      onCreateRule={onCreateRule}
      onDeleteRule={onDeleteRule}
      onUpdateRule={onUpdateRule}
      savingRuleId=""
      {...overrides}
    />,
  )

  return { onCreateRule, onDeleteRule, onUpdateRule }
}

describe('ClassificationRulesView', () => {
  it('shows rule context in the list', () => {
    renderView()

    expect(screen.getByText((content) => content.includes('Instituição: Nubank'))).toBeTruthy()
    expect(screen.getByText((content) => content.includes('Conta: Cartão de crédito'))).toBeTruthy()
  })

  it('submits institution and account with a new rule', async () => {
    const user = userEvent.setup()
    const { onCreateRule } = renderView({ classificationRules: [] })

    await user.type(screen.getByLabelText('Descrição'), 'assinatura premium')
    await user.type(screen.getByLabelText('Instituição'), 'Nubank')
    await user.type(screen.getByLabelText('Conta'), 'Cartão de crédito')
    await user.click(screen.getByRole('button', { name: 'Criar regra' }))

    await waitFor(() => {
      expect(onCreateRule).toHaveBeenCalledWith({
        matchMode: 'description',
        matchDescription: 'assinatura premium',
        matchAmount: null,
        matchInstitution: 'Nubank',
        matchAccount: 'Cartão de crédito',
        type: 'Despesa',
        category: 'Outros',
        budgetGroupId: null,
      })
    })
  })
})
