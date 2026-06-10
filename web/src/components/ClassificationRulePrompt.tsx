import { useState } from 'react'
import type { RulePromptOverrides, Transaction } from '../types'

type ClassificationRulePromptProps = {
  transaction: Transaction | null
  onDismiss: () => void
  onRemember: (matchMode: 'description' | 'description_amount', overrides?: RulePromptOverrides) => Promise<boolean>
}

export function ClassificationRulePrompt({ transaction, onDismiss, onRemember }: ClassificationRulePromptProps) {
  const [matchDescription, setMatchDescription] = useState(transaction?.description ?? '')
  const [matchAmount, setMatchAmount] = useState(transaction ? String(transaction.amount) : '')

  if (!transaction) {
    return null
  }

  function rememberByName() {
    void onRemember('description', {
      matchDescription,
    })
  }

  function rememberByNameAndAmount() {
    void onRemember('description_amount', {
      matchDescription,
      matchAmount: Number(matchAmount),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel prompt-panel" role="dialog" aria-modal="true" aria-labelledby="rule-prompt-title">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Aprendizado</div>
            <h3 id="rule-prompt-title">Lembrar esta classificacao?</h3>
          </div>
        </div>
        <p className="muted">
          Revise o nome e o valor que vao compor a regra. O sistema pode lembrar pelo nome ou pelo nome + valor.
        </p>
        <div className="modal-grid">
          <label className="full-width">
            Nome da regra
            <input value={matchDescription} onChange={(event) => setMatchDescription(event.target.value)} />
          </label>
          <label>
            Valor da regra
            <input type="number" step="0.01" min="0" value={matchAmount} onChange={(event) => setMatchAmount(event.target.value)} />
          </label>
        </div>
        <div className="prompt-actions">
          <button type="button" className="ghost" onClick={onDismiss}>
            Nao lembrar
          </button>
          <button type="button" onClick={rememberByName} disabled={!matchDescription.trim()}>
            Lembrar pelo nome
          </button>
          <button type="button" onClick={rememberByNameAndAmount} disabled={!matchDescription.trim() || !matchAmount}>
            Lembrar pelo nome + valor
          </button>
        </div>
      </div>
    </div>
  )
}
