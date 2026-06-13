/* eslint-disable max-lines-per-function */
import { useState, type FormEvent } from 'react'
import { TYPE_OPTIONS } from '../constants'
import { getCategoryOptionsForType, normalizeCategoryForType } from '../lib/transactions'
import { AppDialog } from './ui/AppDialog'
import type { BudgetGroup, ManualTransactionPayload, TransactionType } from '../types'

type ManualTransactionModalProps = {
  activeMonth: string
  budgetGroups: BudgetGroup[]
  onClose: () => void
  onCreate: (payload: ManualTransactionPayload) => Promise<void>
  open: boolean
  saving: boolean
}

function buildInitialDate(activeMonth: string): string {
  const currentMonth = new Date().toISOString().slice(0, 7)
  if (activeMonth === currentMonth) {
    return new Date().toISOString().slice(0, 10)
  }

  return `${activeMonth}-01`
}

export function ManualTransactionModal({
  activeMonth,
  budgetGroups,
  onClose,
  onCreate,
  open,
  saving,
}: ManualTransactionModalProps) {
  const [date, setDate] = useState(buildInitialDate(activeMonth))
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('Despesa')
  const [category, setCategory] = useState('Outros')
  const [budgetGroupId, setBudgetGroupId] = useState('')
  const [notes, setNotes] = useState('')

  const groupDisabled = type === 'Receita'
  const categoryOptions = getCategoryOptionsForType(type)

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType)
    setCategory((currentCategory) => normalizeCategoryForType(nextType, currentCategory))
    if (nextType === 'Receita') {
      setBudgetGroupId('')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    void onCreate({
      date,
      description: description.trim(),
      amount: Number(amount),
      type,
      category: normalizeCategoryForType(type, category),
      budgetGroupId: type === 'Receita' ? null : (budgetGroupId || null),
      notes: notes.trim(),
    })
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      eyebrow="Cadastro manual"
      title="Nova transação"
      description="Cadastre um lançamento manual em qualquer mês. Se a data for futura, ele também entra na projeção."
    >
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-grid classification-grid">
          <label>
            Data
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={saving} required />
          </label>
          <label>
            Valor
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={saving}
              placeholder="0,00…"
              required
            />
          </label>
          <label className="full-width">
            Descrição
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              placeholder="Ex.: Pix para minha mãe…"
              required
            />
          </label>
          <label>
            Tipo
            <select value={type} onChange={(event) => handleTypeChange(event.target.value as TransactionType)} disabled={saving}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={saving}>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Grupo
            <select
              value={groupDisabled ? '' : budgetGroupId}
              onChange={(event) => setBudgetGroupId(event.target.value)}
              disabled={saving || groupDisabled}
            >
              <option value="">Sem grupo</option>
              {budgetGroups.map((budgetGroup) => (
                <option key={budgetGroup.id} value={budgetGroup.id}>
                  {budgetGroup.name}
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            Notas
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={saving}
              placeholder="Explique o contexto desta transação…"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>
            {saving ? <span className="button-spinner" aria-hidden="true" /> : null}
            {saving ? 'Salvando…' : 'Criar transação'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}
