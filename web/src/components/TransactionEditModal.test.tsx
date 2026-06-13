import type { BudgetGroup, Transaction } from '../types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { TransactionEditModal } from './TransactionEditModal'

const budgetGroups: BudgetGroup[] = [
  { id: 'group-1', name: 'Necessidades', targetPercentage: 50 },
  { id: 'group-2', name: 'Desejos', targetPercentage: 30 },
]

const baseTransaction: Transaction = {
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

function renderModal(transaction: Transaction, onSave = vi.fn()) {
  render(
    <TransactionEditModal
      budgetGroups={budgetGroups}
      saving={false}
      transaction={transaction}
      onClose={() => {}}
      onSave={onSave}
      onIgnore={vi.fn(() => Promise.resolve())}
      onDelete={vi.fn(() => Promise.resolve())}
    />,
  )

  return { onSave }
}

it('submits the selected budget group id', async () => {
  const user = userEvent.setup()
  const { onSave } = renderModal(baseTransaction)

  await user.selectOptions(screen.getByLabelText('Grupo'), 'group-2')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  expect(onSave).toHaveBeenCalledWith('tx-1', {
    type: 'Despesa',
    category: 'Outros',
    budgetGroupId: 'group-2',
    notes: '',
    recurringUntilMonth: null,
  })
})

it('keeps the budget group when type becomes transferência', async () => {
  const user = userEvent.setup()
  const { onSave } = renderModal({ ...baseTransaction, budgetGroupId: 'group-1' })

  await user.selectOptions(screen.getByLabelText('Tipo'), 'Transferência')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  expect(onSave).toHaveBeenCalledWith('tx-1', {
    type: 'Transferência',
    category: 'Outros',
    budgetGroupId: 'group-1',
    notes: '',
    recurringUntilMonth: null,
  })
})

it('normalizes the category when the type changes to a different catalog', async () => {
  const user = userEvent.setup()
  const { onSave } = renderModal({ ...baseTransaction, category: 'Alimentação' })

  await user.selectOptions(screen.getByLabelText('Tipo'), 'Receita')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  expect(onSave).toHaveBeenCalledWith('tx-1', {
    type: 'Receita',
    category: 'Outros',
    budgetGroupId: null,
    notes: '',
    recurringUntilMonth: null,
  })
})

it('submits edited notes and recurring limit', async () => {
  const user = userEvent.setup()
  const { onSave } = renderModal(baseTransaction)

  await user.clear(screen.getByLabelText('Notas'))
  await user.type(screen.getByLabelText('Notas'), 'Emprestimo com minha mãe')
  await user.click(screen.getByLabelText('Recorrente'))
  await user.clear(screen.getByLabelText('Até'))
  await user.type(screen.getByLabelText('Até'), '2026-12')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  expect(onSave).toHaveBeenCalledWith('tx-1', expect.objectContaining({
    notes: 'Emprestimo com minha mãe',
    recurringUntilMonth: '2026-12',
  }))
})
