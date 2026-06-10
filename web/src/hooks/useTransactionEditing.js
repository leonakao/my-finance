/* eslint-disable max-lines-per-function */
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  classificationSnapshotsEqual,
  getClassificationSnapshot,
  normalizeCategoryForType,
} from '../lib/transactions'

function buildTransactionPatch(payload) {
  const normalizedType = payload.type
  const normalizedCategory = normalizeCategoryForType(normalizedType, payload.category)

  return {
    type: normalizedType,
    category: normalizedCategory,
    budgetGroupId: normalizedType === 'Receita' ? null : (payload.budgetGroupId ?? null),
  }
}

export function useTransactionEditing(transactions, setTransactions, setError, createRuleFromTransaction) {
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

  function openTransactionEditor(transactionId) {
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

  async function saveTransactionEdit(transactionId, payload) {
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

    const { error: updateError } = await supabase.from('transactions').update(databasePatch).eq('id', transactionId)
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
    if (!classificationSnapshotsEqual(previousSnapshot, nextSnapshot)) {
      setPromptTransactionId(transactionId)
    }
    setSavingId('')
  }

  async function rememberClassification(matchMode, overrides = {}) {
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
