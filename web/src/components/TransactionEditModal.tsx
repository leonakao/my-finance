/* eslint-disable max-lines-per-function */
import { useMemo, useState, type FormEvent } from 'react'
import { TYPE_OPTIONS } from '../constants'
import { getCategoryOptionsForType, normalizeCategoryForType } from '../lib/transactions'
import { dateLabel, toCurrency } from '../lib/formatters'
import { AppDialog } from './ui/AppDialog'
import { ConfirmDialog } from './ui/ConfirmDialog'
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
  onIgnore: (transactionId: string, ignored: boolean) => Promise<void>
  onDelete: (transactionId: string) => Promise<void>
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

export function TransactionEditModal({ budgetGroups, saving, transaction, onClose, onSave, onIgnore, onDelete }: TransactionEditModalProps) {
  const [type, setType] = useState(transaction.type)
  const [category, setCategory] = useState(normalizeCategoryForType(transaction.type, transaction.category))
  const [budgetGroupId, setBudgetGroupId] = useState(transaction.budgetGroupId ?? '')
  const [notes, setNotes] = useState(transaction.notes ?? '')
  const [isRecurring, setIsRecurring] = useState(transaction.sourceKind === 'manual_recurring')
  const [recurringUntilMonth, setRecurringUntilMonth] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const groupDisabled = type === 'Receita'
  const categoryOptions = getCategoryOptionsForType(type)
  const recurrenceDisabled = type === 'Transferência'
  const recurrenceHint = useMemo(() => (
    recurrenceDisabled ? 'Transferências não podem ser marcadas como recorrentes nesta versão.' : ''
  ), [recurrenceDisabled])

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType)
    setCategory((currentCategory) => normalizeCategoryForType(nextType, currentCategory))
    if (nextType === 'Receita') {
      setBudgetGroupId('')
    }
    if (nextType === 'Transferência') {
      setIsRecurring(false)
      setRecurringUntilMonth('')
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
      notes,
      recurringUntilMonth: isRecurring && !recurrenceDisabled ? (recurringUntilMonth || null) : null,
    })
  }

  return (
    <>
      <AppDialog open onOpenChange={(open) => !open && onClose()} eyebrow="Revisão" title="Editar transação">
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
            <label className="full-width">
              Notas
              <textarea
                name="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={saving}
                rows={3}
                placeholder="Explique o contexto desta transação…"
              />
            </label>
            <label className="checkbox-field full-width">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
                disabled={saving || recurrenceDisabled}
              />
              <span>Recorrente</span>
            </label>
            {recurrenceHint ? <p className="muted full-width">{recurrenceHint}</p> : null}
            {isRecurring && !recurrenceDisabled ? (
              <label>
                Até
                <input
                  type="month"
                  name="recurringUntilMonth"
                  value={recurringUntilMonth}
                  onChange={(event) => setRecurringUntilMonth(event.target.value)}
                  disabled={saving}
                />
              </label>
            ) : null}
          </div>

          <div className="modal-actions split">
            <div className="row-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => void onIgnore(transaction.id, !transaction.isIgnored)}
                disabled={saving}
              >
                {transaction.isIgnored ? 'Restaurar' : 'Ignorar'}
              </button>
              <button type="button" className="ghost danger" onClick={() => setConfirmDeleteOpen(true)} disabled={saving}>
                Excluir
              </button>
            </div>
            <div className="row-actions">
              <button type="button" className="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}>
                {saving ? <span className="button-spinner" aria-hidden="true" /> : null}
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </AppDialog>
      <ConfirmDialog
        open={confirmDeleteOpen}
        busy={saving}
        title="Excluir transação?"
        description={transaction.originTransactionId === null
          ? 'Se esta transação for a principal de uma série, as derivadas futuras vinculadas também serão removidas.'
          : 'A transação será removida permanentemente.'}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          setConfirmDeleteOpen(false)
          void onDelete(transaction.id)
        }}
      />
    </>
  )
}
