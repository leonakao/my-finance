/* eslint-disable max-lines-per-function */
import { useMemo, useState, type FormEvent } from 'react'
import { CLASSIFICATION_RULE_MATCH_MODE_OPTIONS, TYPE_OPTIONS } from '../constants'
import {
  getCategoryOptionsForType,
  getDefaultCategoryForType,
  getRuleDescriptionWarning,
  nextBudgetGroupIdForType,
  normalizeCategoryForType,
} from '../lib/transactions'
import type { BudgetGroup, ClassificationRule, ClassificationRulePayload, TransactionType } from '../types'

type RuleFormProps = {
  budgetGroups: BudgetGroup[]
  initialValue: ClassificationRulePayload
  onSubmit: (payload: ClassificationRulePayload) => Promise<boolean | ClassificationRule | null>
  onCancel?: () => void
  saving: boolean
  submitLabel: string
}

type RuleRowProps = {
  budgetGroups: BudgetGroup[]
  rule: ClassificationRule
  saving: boolean
  onSave: (id: string, payload: ClassificationRulePayload) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

type ClassificationRulesViewProps = {
  budgetGroups: BudgetGroup[]
  classificationRules: ClassificationRule[]
  error: string
  feedback: string
  onCreateRule: (payload: ClassificationRulePayload) => Promise<ClassificationRule | null>
  onDeleteRule: (id: string) => Promise<boolean>
  onUpdateRule: (id: string, payload: ClassificationRulePayload) => Promise<boolean>
  savingRuleId: string
}

function RuleForm({
  budgetGroups,
  initialValue,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: RuleFormProps) {
  const [matchMode, setMatchMode] = useState(initialValue.matchMode)
  const [matchDescription, setMatchDescription] = useState(initialValue.matchDescription)
  const [matchAmount, setMatchAmount] = useState(initialValue.matchAmount === null ? '' : String(initialValue.matchAmount))
  const [type, setType] = useState(initialValue.type)
  const [category, setCategory] = useState(normalizeCategoryForType(initialValue.type, initialValue.category))
  const [budgetGroupId, setBudgetGroupId] = useState(initialValue.budgetGroupId ?? '')

  const groupDisabled = type === 'Receita'
  const warning = useMemo(() => getRuleDescriptionWarning(matchDescription), [matchDescription])
  const categoryOptions = getCategoryOptionsForType(type)

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType)
    setCategory((currentCategory) => normalizeCategoryForType(nextType, currentCategory))
    if (nextType === 'Receita') {
      setBudgetGroupId('')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedDescription = matchDescription.trim()
    if (!trimmedDescription) {
      return
    }
    if (matchMode === 'description_amount' && !matchAmount) {
      return
    }

    const saved = await onSubmit({
      matchMode,
      matchDescription: trimmedDescription,
      matchAmount: matchMode === 'description_amount' ? Number(matchAmount) : null,
      type,
      category,
      budgetGroupId: nextBudgetGroupIdForType(type, budgetGroupId || null),
    })

    if (saved && onCancel) {
      onCancel()
    }
  }

  return (
    <form className="rule-form" onSubmit={handleSubmit}>
      <div className="modal-grid classification-grid">
        <label>
          Modo
          <select
            value={matchMode}
            onChange={(event) => setMatchMode(event.target.value as ClassificationRule['matchMode'])}
            disabled={saving}
          >
            {CLASSIFICATION_RULE_MATCH_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="full-width">
          Descricao
          <input value={matchDescription} onChange={(event) => setMatchDescription(event.target.value)} disabled={saving} />
        </label>
        {matchMode === 'description_amount' ? (
          <label>
            Valor
            <input
              type="number"
              step="0.01"
              min="0"
              value={matchAmount}
              onChange={(event) => setMatchAmount(event.target.value)}
              disabled={saving}
            />
          </label>
        ) : null}
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
          <select value={groupDisabled ? '' : budgetGroupId} onChange={(event) => setBudgetGroupId(event.target.value)} disabled={saving || groupDisabled}>
            <option value="">Sem grupo</option>
            {budgetGroups.map((budgetGroup) => (
              <option key={budgetGroup.id} value={budgetGroup.id}>
                {budgetGroup.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {warning ? <p className="feedback warning" role="status">{warning}</p> : null}
      <div className="modal-actions">
        {onCancel ? (
          <button type="button" className="ghost" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        ) : null}
        <button type="submit" disabled={saving}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

function RuleRow({ budgetGroups, rule, saving, onSave, onDelete }: RuleRowProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="panel nested-panel">
        <RuleForm
          budgetGroups={budgetGroups}
          initialValue={rule}
          onSubmit={(payload) => onSave(rule.id, payload)}
          onCancel={() => setEditing(false)}
          saving={saving}
          submitLabel="Salvar regra"
        />
      </div>
    )
  }

  return (
    <div className="rule-row">
      <div>
        <strong>{rule.matchDescription}</strong>
        <div className="muted">
          {rule.matchMode === 'description_amount' ? `Nome + valor (${rule.matchAmount?.toFixed(2) ?? '0.00'})` : 'Nome'}
        </div>
      </div>
      <div className="rule-summary">
        <span>{rule.type}</span>
        <span>{rule.category}</span>
        <span>{budgetGroups.find((budgetGroup) => budgetGroup.id === rule.budgetGroupId)?.name ?? 'Sem grupo'}</span>
      </div>
      <div className="rule-actions">
        <button type="button" className="ghost" onClick={() => setEditing(true)} disabled={saving}>
          Editar
        </button>
        <button type="button" className="danger" onClick={() => onDelete(rule.id)} disabled={saving}>
          Excluir
        </button>
      </div>
    </div>
  )
}

export function ClassificationRulesView({
  budgetGroups,
  classificationRules,
  error,
  feedback,
  onCreateRule,
  onDeleteRule,
  onUpdateRule,
  savingRuleId,
}: ClassificationRulesViewProps) {
  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero">
        <div className="hero-copy">
          <div className="eyebrow">Regras</div>
          <h2>Regras de classificação</h2>
          <p>
            Defina regras manuais para reduzir retrabalho e manter consistência entre importações, revisões e
            reclassificações.
          </p>
        </div>
      </section>
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
      {feedback && !error ? <p className="feedback" role="status">{feedback}</p> : null}

      <section className="panel">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Nova regra</div>
            <h3>Adicionar regra manualmente</h3>
          </div>
        </div>
        <RuleForm
          budgetGroups={budgetGroups}
          initialValue={{
            matchMode: 'description',
            matchDescription: '',
            matchAmount: null,
            type: 'Despesa',
            category: getDefaultCategoryForType('Despesa'),
            budgetGroupId: null,
          }}
          onSubmit={onCreateRule}
          saving={savingRuleId === 'new'}
          submitLabel="Criar regra"
        />
      </section>

      <section className="panel">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Gerenciamento</div>
            <h3>Regras salvas</h3>
          </div>
        </div>
        <div className="rule-list">
          {classificationRules.map((rule) => (
            <RuleRow
              key={rule.id}
              budgetGroups={budgetGroups}
              rule={rule}
              saving={savingRuleId === rule.id}
              onSave={onUpdateRule}
              onDelete={onDeleteRule}
            />
          ))}
          {!classificationRules.length ? <p className="muted">Nenhuma regra salva ainda.</p> : null}
        </div>
      </section>
    </div>
  )
}
