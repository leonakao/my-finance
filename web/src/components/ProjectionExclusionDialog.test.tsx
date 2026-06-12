import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectionLineItem } from '../types'
import { ProjectionExclusionDialog } from './ProjectionExclusionDialog'

const ITEM: ProjectionLineItem = {
  id: 'probable:2026-06:Despesa:internet',
  kind: 'probable',
  date: '2026-06-20',
  isDateEstimated: true,
  description: 'Internet',
  normalizedDescription: 'internet',
  amount: 150,
  type: 'Despesa',
  category: 'Moradia',
  budgetGroupId: 'needs',
  budgetGroupName: 'Necessidades',
  installment: null,
  basis: {
    averageAmount: 150,
    occurrenceCount: 2,
    observedMonthCount: 2,
    lastObservedDate: '2026-05-20',
  },
}

function renderDialog(overrides: {
  saving?: boolean
  onClose?: () => void
  onConfirm?: (scope: 'month' | 'from_month') => void
} = {}) {
  const onClose = overrides.onClose ?? vi.fn()
  const onConfirm = overrides.onConfirm ?? vi.fn()
  render(
    <ProjectionExclusionDialog
      item={ITEM}
      monthKey="2026-06"
      saving={overrides.saving ?? false}
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  )
  return { onClose, onConfirm }
}

describe('ProjectionExclusionDialog', () => {
  it('shows the estimate context and starts with monthly scope selected', () => {
    renderDialog()

    expect(screen.getByRole('dialog', { name: 'Remover estimativa da projeção' })).toBeTruthy()
    expect(screen.getByText(/Internet está estimada em R\$ 150,00 para Junho de 2026/i)).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: /Somente neste mês/i }).checked).toBe(true)
  })

  it('submits the default monthly scope', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Remover da projeção' }))

    expect(onConfirm).toHaveBeenCalledWith('month')
  })

  it('submits future scope after the user selects it', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderDialog()

    await user.click(screen.getByRole('radio', { name: /Neste e nos meses futuros/i }))
    await user.click(screen.getByRole('button', { name: 'Remover da projeção' }))

    expect(onConfirm).toHaveBeenCalledWith('from_month')
  })

  it('cancels without submitting a scope', async () => {
    const user = userEvent.setup()
    const { onClose, onConfirm } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('preserves the confirmation label and disables controls while saving', () => {
    renderDialog({ saving: true })

    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Remover da projeção' }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Cancelar' }).disabled).toBe(true)
    expect(document.querySelector('.button-spinner')).toBeTruthy()
  })

  it('focuses the least destructive radio when opened', () => {
    renderDialog()

    expect(document.activeElement).toBe(screen.getByRole('radio', { name: /Somente neste mês/i }))
  })
})
