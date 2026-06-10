/* eslint-disable max-lines-per-function */
import { useState } from 'react'
import { CATEGORY_OPTIONS, TYPE_OPTIONS } from '../constants'
import { toCurrency } from '../lib/formatters'

function ReadOnlyField({ label, value }) {
  return (
    <label>
      {label}
      <input value={value} readOnly disabled />
    </label>
  )
}

export function TransactionEditModal({ budgetGroups, saving, transaction, onClose, onSave }) {
  const [type, setType] = useState(transaction.type)
  const [budgetGroupId, setBudgetGroupId] = useState(transaction.budgetGroupId ?? '')

  const groupDisabled = type === 'Receita' || type === 'Transferência'

  function handleTypeChange(nextType) {
    setType(nextType)
    if (nextType === 'Receita' || nextType === 'Transferência') {
      setBudgetGroupId('')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextType = String(formData.get('type') ?? transaction.type)
    const nextCategory = String(formData.get('category') ?? transaction.category)
    const nextBudgetGroupId = String(formData.get('budgetGroupId') ?? '')

    void onSave(transaction.id, {
      type: nextType,
      category: nextCategory,
      budgetGroupId: nextType === 'Receita' || nextType === 'Transferência' ? null : (nextBudgetGroupId || null),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="transaction-edit-title">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Revisao</div>
            <h3 id="transaction-edit-title">Editar classificacao</h3>
          </div>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <ReadOnlyField label="Data" value={transaction.date} />
            <ReadOnlyField label="Valor" value={toCurrency(transaction.amount)} />
            <label className="full-width">
              Descricao
              <textarea value={transaction.description} readOnly disabled rows={2} />
            </label>
            <ReadOnlyField label="Conta" value={transaction.account || 'Sem conta'} />
            <ReadOnlyField label="Instituicao" value={transaction.institution || 'Sem instituicao'} />
          </div>

          <div className="modal-grid classification-grid">
            <label>
              Tipo
              <select name="type" value={type} onChange={(event) => handleTypeChange(event.target.value)} disabled={saving}>
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <select name="category" defaultValue={transaction.category} disabled={saving}>
                {CATEGORY_OPTIONS.map((option) => (
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
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
