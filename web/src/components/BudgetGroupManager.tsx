import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ConfirmDialog } from './ui/ConfirmDialog'
import type { BudgetGroup, BudgetGroupPayload } from '../types'

type BudgetGroupFormProps = {
  saving: boolean
  onSubmit: (payload: BudgetGroupPayload) => Promise<boolean>
}

type BudgetGroupRowProps = {
  budgetGroup: BudgetGroup
  saving: boolean
  onSave: (id: string, payload: BudgetGroupPayload) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

type BudgetGroupManagerProps = {
  budgetGroups: BudgetGroup[]
  orphanedCount: number
  savingGroupId: string
  onCreate: (payload: BudgetGroupPayload) => Promise<boolean>
  onUpdate: (id: string, payload: BudgetGroupPayload) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

function percentLabel(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%`
}

function BudgetGroupForm({ saving, onSubmit }: BudgetGroupFormProps) {
  const [name, setName] = useState('')
  const [targetPercentage, setTargetPercentage] = useState('0')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
        {saving ? <span className="button-spinner" aria-hidden="true" /> : null}
        {saving ? 'Criando…' : 'Criar grupo'}
      </button>
    </form>
  )
}

type BudgetGroupRowEditorProps = {
  name: string
  targetPercentage: string
  saving: boolean
  setName: (value: string) => void
  setTargetPercentage: (value: string) => void
  onCancel: () => void
  onSave: () => void
}

function BudgetGroupRowEditor({ name, targetPercentage, saving, setName, setTargetPercentage, onCancel, onSave }: BudgetGroupRowEditorProps) {
  return (
    <div className="budget-group-row is-editing">
      <label>
        Nome do grupo
        <input value={name} onChange={(event) => setName(event.target.value)} disabled={saving} />
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
          disabled={saving}
        />
      </label>
      <div className="budget-group-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
          <X size={14} strokeWidth={1.8} aria-hidden="true" />
          Cancelar
        </button>
        <button type="button" onClick={onSave} disabled={saving || !name.trim()}>
          {saving ? <span className="button-spinner" aria-hidden="true" /> : <Check size={14} strokeWidth={1.8} aria-hidden="true" />}
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

function BudgetGroupRow({ budgetGroup, saving, onSave, onDelete }: BudgetGroupRowProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(budgetGroup.name)
  const [targetPercentage, setTargetPercentage] = useState(String(budgetGroup.targetPercentage))
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSave() {
    const saved = await onSave(budgetGroup.id, {
      name: name.trim(),
      targetPercentage: Number(targetPercentage),
    })
    if (saved) {
      setEditing(false)
    }
  }

  function cancelEditing() {
    setName(budgetGroup.name)
    setTargetPercentage(String(budgetGroup.targetPercentage))
    setEditing(false)
  }

  if (editing) {
    return (
      <BudgetGroupRowEditor
        name={name}
        targetPercentage={targetPercentage}
        saving={saving}
        setName={setName}
        setTargetPercentage={setTargetPercentage}
        onCancel={cancelEditing}
        onSave={() => void handleSave()}
      />
    )
  }

  return (
    <div className="budget-group-row">
      <div className="budget-group-info">
        <strong>{budgetGroup.name}</strong>
        <span className="meta-chip">Meta {percentLabel(budgetGroup.targetPercentage)}</span>
      </div>
      <div className="budget-group-actions">
        <button type="button" className="ghost" onClick={() => setEditing(true)} disabled={saving}>
          <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
          Editar
        </button>
        <button type="button" className="danger" onClick={() => setConfirmingDelete(true)} disabled={saving}>
          <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
          Excluir
        </button>
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        title="Excluir grupo?"
        description={`As transações ligadas a "${budgetGroup.name}" ficarão sem grupo e fora dos totais. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir grupo"
        busy={saving}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          void onDelete(budgetGroup.id).then(() => setConfirmingDelete(false))
        }}
      />
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
}: BudgetGroupManagerProps) {
  const totalTarget = budgetGroups.reduce((sum, budgetGroup) => sum + budgetGroup.targetPercentage, 0)

  return (
    <>
      <section className="panel">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Novo grupo</div>
            <h3>Criar grupo de orçamento</h3>
          </div>
        </div>
        <BudgetGroupForm saving={savingGroupId === 'new'} onSubmit={onCreate} />
      </section>

      <section className="panel">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Configuração</div>
            <h3>Gerenciar grupos</h3>
          </div>
          {orphanedCount ? <p className="orphan-chip">{orphanedCount} transações sem grupo</p> : null}
        </div>
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
          {!budgetGroups.length ? <p className="muted">Nenhum grupo criado ainda.</p> : null}
        </div>
        {budgetGroups.length ? (
          <p className={totalTarget === 100 ? 'meta-total' : 'meta-total off-target'}>
            Soma das metas: <strong>{percentLabel(totalTarget)}</strong>
            {totalTarget !== 100 ? ' — o ideal é fechar em 100%.' : ''}
          </p>
        ) : null}
      </section>
    </>
  )
}
