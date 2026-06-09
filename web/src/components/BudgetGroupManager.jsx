import { useState } from 'react'

function BudgetGroupForm({ saving, onSubmit }) {
  const [name, setName] = useState('')
  const [targetPercentage, setTargetPercentage] = useState('0')

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    const created = await onSubmit({
      name: trimmedName,
      targetPercentage: Number(targetPercentage),
    })

    if (created) {
      setName('')
      setTargetPercentage('0')
    }
  }

  return (
    <form className="budget-group-form" onSubmit={handleSubmit}>
      <label>
        Nome do grupo
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Moradia" />
      </label>
      <label>
        Meta %
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={targetPercentage}
          onChange={(event) => setTargetPercentage(event.target.value)}
        />
      </label>
      <button type="submit" disabled={saving}>
        Criar grupo
      </button>
    </form>
  )
}

function BudgetGroupRow({ budgetGroup, saving, onSave, onDelete }) {
  const [name, setName] = useState(budgetGroup.name)
  const [targetPercentage, setTargetPercentage] = useState(String(budgetGroup.targetPercentage))

  async function handleSave() {
    await onSave(budgetGroup.id, {
      name: name.trim(),
      targetPercentage: Number(targetPercentage),
    })
  }

  return (
    <div className="budget-group-row">
      <input value={name} onChange={(event) => setName(event.target.value)} disabled={saving} />
      <input
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={targetPercentage}
        onChange={(event) => setTargetPercentage(event.target.value)}
        disabled={saving}
      />
      <button type="button" className="ghost" onClick={handleSave} disabled={saving || !name.trim()}>
        Salvar
      </button>
      <button type="button" className="danger" onClick={() => onDelete(budgetGroup.id)} disabled={saving}>
        Excluir
      </button>
    </div>
  )
}

export function BudgetGroupManager({
  budgetGroups,
  orphanedCount,
  savingGroupId,
  onCreate,
  onUpdate,
  onDelete,
}) {
  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Configuração</div>
          <h3>Budget groups</h3>
        </div>
        {orphanedCount ? <p className="orphan-chip">{orphanedCount} transações sem grupo</p> : null}
      </div>
      <BudgetGroupForm saving={savingGroupId === 'new'} onSubmit={onCreate} />
      <div className="budget-group-list">
        {budgetGroups.map((budgetGroup) => (
          <BudgetGroupRow
            key={budgetGroup.id}
            budgetGroup={budgetGroup}
            saving={savingGroupId === budgetGroup.id}
            onSave={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  )
}
