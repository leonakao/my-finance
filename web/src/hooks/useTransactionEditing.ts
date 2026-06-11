/* eslint-disable max-lines-per-function */
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import {
  classificationSnapshotsEqual,
  getClassificationSnapshot,
  normalizeCategoryForType,
} from '../lib/transactions'
import type { RulePromptOverrides, Transaction, TransactionEditPayload } from '../types'

function buildTransactionPatch(payload: TransactionEditPayload): TransactionEditPayload {
  const normalizedType = payload.type
  const normalizedCategory = normalizeCategoryForType(normalizedType, payload.category)

  return {
    type: normalizedType,
    category: normalizedCategory,
    budgetGroupId: normalizedType === 'Receita' ? null : (payload.budgetGroupId ?? null),
  }
}

export function useTransactionEditing(
  transactions: Transaction[],
  setTransactions: Dispatch<SetStateAction<Transaction[]>>,
  setError: Dispatch<SetStateAction<string>>,
  createRuleFromTransaction: (
    transaction: Transaction,
    matchMode: 'description' | 'description_amount',
    overrides?: RulePromptOverrides,
  ) => Promise<unknown>,
) {
  const [savingId, setSavingId] = useState('')
  const [editingTransactionId, setEditingTransactionId] = useState('')
  const [promptTransactionId, setPromptTransactionId] = useState('')

  const editingTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === editingTransactionId) ?? null,
    [editingTransactionId, transactions],
  )

  const promptTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === promptTransactionId) ?? null,
    [promptTransactionId, transactions],
  )

  function openTransactionEditor(transactionId: string) {
    setEditingTransactionId(transactionId)
  }

  function closeTransactionEditor() {
    if (!savingId) {
      setEditingTransactionId('')
    }
  }

  function dismissRememberPrompt() {
    setPromptTransactionId('')
  }

  async function saveTransactionEdit(transactionId: string, payload: TransactionEditPayload) {
    setSavingId(transactionId)
    setError('')

    const currentTransaction = transactions.find((transaction) => transaction.id === transactionId)
    if (!currentTransaction) {
      setSavingId('')
      setEditingTransactionId('')
      return
    }

    const nextPatch = buildTransactionPatch(payload)
    const previousSnapshot = getClassificationSnapshot(currentTransaction)
    const nextSnapshot = getClassificationSnapshot(nextPatch)
    const databasePatch = {
      type: nextPatch.type,
      category: nextPatch.category,
      budget_group_id: nextPatch.budgetGroupId,
    }

    const { error: updateError } = await getSupabaseOrThrow().from('transactions').update(databasePatch).eq('id', transactionId)
    if (updateError) {
      setError(updateError.message)
      setSavingId('')
      return
    }

    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === transactionId
          ? {
              ...transaction,
              type: nextPatch.type,
              category: nextPatch.category,
              budgetGroupId: nextPatch.budgetGroupId,
            }
          : transaction,
      ),
    )

    setEditingTransactionId('')
    const shouldPromptForRule = previousSnapshot.type !== nextSnapshot.type || previousSnapshot.category !== nextSnapshot.category

    if (shouldPromptForRule && !classificationSnapshotsEqual(previousSnapshot, nextSnapshot)) {
      setPromptTransactionId(transactionId)
    }
    setSavingId('')
  }

  async function rememberClassification(
    matchMode: 'description' | 'description_amount',
    overrides: RulePromptOverrides = {},
  ) {
    if (!promptTransaction) {
      return false
    }

    const savedRule = await createRuleFromTransaction(promptTransaction, matchMode, overrides)
    if (!savedRule) {
      return false
    }

    setPromptTransactionId('')
    return true
  }

  return {
    savingId,
    editingTransaction,
    promptTransaction,
    openTransactionEditor,
    closeTransactionEditor,
    saveTransactionEdit,
    dismissRememberPrompt,
    rememberClassification,
  }
}
