/* eslint-disable max-lines-per-function */
import { useState, type FormEvent } from 'react'
import { TYPE_OPTIONS } from '../constants'
import { getCategoryOptionsForType, normalizeCategoryForType } from '../lib/transactions'
import { dateLabel, toCurrency } from '../lib/formatters'
import { AppDialog } from './ui/AppDialog'
import type { BudgetGroup, Transaction, TransactionEditPayload, TransactionType } from '../types'

type ReadOnlyFieldProps = {
  label: string
  value: string
}

type TransactionEditModalProps = {
  budgetGroups: BudgetGroup[]
  saving: boolean
  transaction: Transaction
  onClose: () => void
  onSave: (transactionId: string, payload: TransactionEditPayload) => Promise<void>
}

function getFormFieldValue(formData: FormData, key: string, fallback: string): string {
  const raw = formData.get(key)
  return typeof raw === 'string' ? raw : fallback
}

function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <label>
      {label}
      <input value={value} readOnly disabled />
    </label>
  )
}

export function TransactionEditModal({ budgetGroups, saving, transaction, onClose, onSave }: TransactionEditModalProps) {
  const [type, setType] = useState(transaction.type)
  const [category, setCategory] = useState(normalizeCategoryForType(transaction.type, transaction.category))
  const [budgetGroupId, setBudgetGroupId] = useState(transaction.budgetGroupId ?? '')

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
    const formData = new FormData(event.currentTarget)
    const nextType = getFormFieldValue(formData, 'type', transaction.type) as TransactionType
    const nextCategory = normalizeCategoryForType(nextType, getFormFieldValue(formData, 'category', transaction.category))
    const nextBudgetGroupId = getFormFieldValue(formData, 'budgetGroupId', '')

    void onSave(transaction.id, {
      type: nextType,
      category: nextCategory,
      budgetGroupId: nextType === 'Receita' ? null : (nextBudgetGroupId || null),
    })
  }

  return (
    <AppDialog open onOpenChange={(open) => !open && onClose()} eyebrow="Revisão" title="Editar classificação">
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="modal-grid">
          <ReadOnlyField label="Data" value={dateLabel(transaction.date)} />
          <ReadOnlyField label="Valor" value={toCurrency(transaction.amount)} />
          <label className="full-width">
            Descrição
            <textarea value={transaction.description} readOnly disabled rows={2} />
          </label>
          <ReadOnlyField label="Conta" value={transaction.account ?? 'Sem conta'} />
          <ReadOnlyField label="Instituição" value={transaction.institution ?? 'Sem instituição'} />
        </div>

        <div className="modal-grid classification-grid">
          <label>
            Tipo
            <select
              name="type"
              value={type}
              onChange={(event) => handleTypeChange(event.target.value as TransactionType)}
              disabled={saving}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select name="category" value={category} onChange={(event) => setCategory(event.target.value)} disabled={saving}>
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
              name="budgetGroupId"
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
        </div>

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>
            {saving ? <span className="button-spinner" aria-hidden="true" /> : null}
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </AppDialog>
  )
}
