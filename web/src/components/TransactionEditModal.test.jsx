import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransactionEditModal } from './TransactionEditModal'

const budgetGroups = [
  { id: 'group-1', name: 'Necessidades' },
  { id: 'group-2', name: 'Desejos' },
]

const baseTransaction = {
  id: 'tx-1',
  date: '2026-06-09',
  amount: 123.45,
  description: 'Compra teste',
  account: 'Conta principal',
  institution: 'Nubank',
  type: 'Despesa',
  category: 'Outros',
  budgetGroupId: null,
}

describe('TransactionEditModal', () => {
  it('submits the selected budget group id', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TransactionEditModal
        budgetGroups={budgetGroups}
        saving={false}
        transaction={baseTransaction}
        onClose={() => {}}
        onSave={onSave}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Grupo'), 'group-2')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('tx-1', {
      type: 'Despesa',
      category: 'Outros',
      budgetGroupId: 'group-2',
    })
  })

  it('keeps the budget group when type becomes transferência', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TransactionEditModal
        budgetGroups={budgetGroups}
        saving={false}
        transaction={{ ...baseTransaction, budgetGroupId: 'group-1' }}
        onClose={() => {}}
        onSave={onSave}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Transferência')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('tx-1', {
      type: 'Transferência',
      category: 'Outros',
      budgetGroupId: 'group-1',
    })
  })

  it('normalizes the category when the type changes to a different catalog', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TransactionEditModal
        budgetGroups={budgetGroups}
        saving={false}
        transaction={{ ...baseTransaction, category: 'Alimentação' }}
        onClose={() => {}}
        onSave={onSave}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Tipo'), 'Receita')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('tx-1', {
      type: 'Receita',
      category: 'Outros',
      budgetGroupId: null,
    })
  })
})
