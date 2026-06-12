/* eslint-disable complexity */
import { useState } from 'react'
import { AppDialog } from './ui/AppDialog'
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
    <AppDialog open onOpenChange={(open) => !open && onDismiss()} className="prompt-panel" eyebrow="Aprendizado" title="Lembrar esta classificação?">
      <p className="muted">
        Revise o nome e o valor que vão compor a regra. O sistema pode lembrar pelo nome ou pelo nome + valor.
      </p>
      {transaction.institution || transaction.account ? (
        <p className="muted">
          {transaction.institution ? `Instituição: ${transaction.institution}` : null}
          {transaction.institution && transaction.account ? ' • ' : null}
          {transaction.account ? `Conta: ${transaction.account}` : null}
        </p>
      ) : null}
      <div className="modal-grid">
        <label className="full-width">
          Nome da regra
          <input
            value={matchDescription}
            onChange={(event) => setMatchDescription(event.target.value)}
            name="matchDescription"
          />
        </label>
        <label>
          Valor da regra
          <input
            type="number"
            step="0.01"
            min="0"
            value={matchAmount}
            onChange={(event) => setMatchAmount(event.target.value)}
            name="matchAmount"
          />
        </label>
      </div>
      <div className="prompt-actions">
        <button type="button" className="ghost" onClick={onDismiss}>
          Não lembrar
        </button>
        <button type="button" onClick={rememberByName} disabled={!matchDescription.trim()}>
          Lembrar pelo nome
        </button>
        <button type="button" onClick={rememberByNameAndAmount} disabled={!matchDescription.trim() || !matchAmount}>
          Lembrar pelo nome + valor
        </button>
      </div>
    </AppDialog>
  )
}
