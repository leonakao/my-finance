import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { BudgetGroup } from '../types'
import { ManualTransactionModal } from './ManualTransactionModal'

const budgetGroups: BudgetGroup[] = [
  { id: 'group-1', name: 'Necessidades', targetPercentage: 50 },
]

describe('ManualTransactionModal', () => {
  it('submits a normalized manual transaction payload', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn(() => Promise.resolve())

    render(
      <ManualTransactionModal
        activeMonth="2026-07"
        budgetGroups={budgetGroups}
        open
        saving={false}
        onClose={() => {}}
        onCreate={onCreate}
      />,
    )

    await user.clear(screen.getByLabelText('Descrição'))
    await user.type(screen.getByLabelText('Descrição'), 'Pix mãe')
    await user.clear(screen.getByLabelText('Valor'))
    await user.type(screen.getByLabelText('Valor'), '200')
    await user.selectOptions(screen.getByLabelText('Grupo'), 'group-1')
    await user.type(screen.getByLabelText('Notas'), 'Emprestimo familiar')
    await user.click(screen.getByRole('button', { name: 'Criar transação' }))

    expect(onCreate).toHaveBeenCalledWith({
      date: '2026-07-01',
      description: 'Pix mãe',
      amount: 200,
      type: 'Despesa',
      category: 'Outros',
      budgetGroupId: 'group-1',
      notes: 'Emprestimo familiar',
    })
  })
})
