/* eslint-disable max-lines, max-lines-per-function */
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import {
  classificationSnapshotsEqual,
  getClassificationSnapshot,
  normalizeCategoryForType,
} from '../lib/transactions'
import {
  buildRecurringChildDate,
  buildRecurringDerivedValues,
  buildRecurringMonthKeys,
  isFutureDerivedTransaction,
} from '../lib/recurringTransactions'
import { normalizeTransaction } from '../lib/transactions'
import type { ManualTransactionPayload, RulePromptOverrides, Transaction, TransactionEditPayload } from '../types'

function buildTransactionPatch(payload: TransactionEditPayload): TransactionEditPayload {
  const normalizedType = payload.type
  const normalizedCategory = normalizeCategoryForType(normalizedType, payload.category)

  return {
    type: normalizedType,
    category: normalizedCategory,
    budgetGroupId: normalizedType === 'Receita' ? null : (payload.budgetGroupId ?? null),
    notes: payload.notes?.trim() ?? '',
    recurringUntilMonth: payload.recurringUntilMonth ?? null,
  }
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await getSupabaseOrThrow().auth.getUser()

  if (error || !user) {
    throw new Error(error?.message ?? 'Usuário não autenticado.')
  }

  return user.id
}

function throwIfTransactionMutationFails(error: { message: string } | null): void {
  if (error !== null) {
    throw new Error(error.message)
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
  const [creatingTransaction, setCreatingTransaction] = useState(false)
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

  async function setTransactionIgnored(transactionId: string, ignored: boolean) {
    setSavingId(transactionId)
    setError('')

    const { error } = await getSupabaseOrThrow()
      .from('transactions')
      .update({ is_ignored: ignored })
      .eq('id', transactionId)

    if (error) {
      setError(error.message)
      setSavingId('')
      return
    }

    setTransactions((current) => current.map((transaction) => (
      transaction.id === transactionId
        ? { ...transaction, isIgnored: ignored }
        : transaction
    )))
    setSavingId('')
  }

  async function deleteTransaction(transactionId: string) {
    setSavingId(transactionId)
    setError('')

    const { error } = await getSupabaseOrThrow()
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (error) {
      setError(error.message)
      setSavingId('')
      return
    }

    setTransactions((current) => current.filter((transaction) => (
      transaction.id !== transactionId && transaction.originTransactionId !== transactionId
    )))
    if (editingTransactionId === transactionId) {
      setEditingTransactionId('')
    }
    setSavingId('')
  }

  async function createManualTransaction(payload: ManualTransactionPayload) {
    setCreatingTransaction(true)
    setError('')

    try {
      const userId = await getAuthenticatedUserId()
      const databasePayload = {
        user_id: userId,
        date: payload.date,
        description: payload.description.trim(),
        amount: Number(payload.amount),
        type: payload.type,
        category: normalizeCategoryForType(payload.type, payload.category),
        budget_group_id: payload.type === 'Receita' ? null : (payload.budgetGroupId ?? null),
        notes: payload.notes.trim(),
        source: 'Manual',
        source_kind: 'manual' as const,
        is_ignored: false,
      }

      const { data, error } = await getSupabaseOrThrow()
        .from('transactions')
        .insert(databasePayload)
        .select('id, date, description, amount, type, category, budget_group_id, account, institution, notes, installment, origin_transaction_id, is_ignored, source_kind')
        .single()

      if (error) {
        setError(error.message)
        setCreatingTransaction(false)
        return false
      }

      const createdTransaction = normalizeTransaction(data)
      setTransactions((current) => [createdTransaction, ...current].sort((left, right) => (right.date ?? '').localeCompare(left.date ?? '')))
      setCreatingTransaction(false)
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao criar transação.')
      setCreatingTransaction(false)
      return false
    }
  }

  /* eslint-disable-next-line complexity */
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
    const nextNotes = nextPatch.notes ?? ''
    const databasePatch = {
      type: nextPatch.type,
      category: nextPatch.category,
      budget_group_id: nextPatch.budgetGroupId,
      notes: nextNotes,
    }

    const transactionsClient = getSupabaseOrThrow().from('transactions')
    const { error: updateError } = await transactionsClient.update(databasePatch).eq('id', transactionId)
    if (updateError) {
      setError(updateError.message)
      setSavingId('')
      return
    }

    try {
      const userId = await getAuthenticatedUserId()
      const anchorDate = currentTransaction.date ?? null
      const derivedValues = buildRecurringDerivedValues(currentTransaction, nextPatch)
      const desiredMonths = new Set(buildRecurringMonthKeys(anchorDate, nextPatch.recurringUntilMonth ?? null))
      const existingFutureChildren = transactions.filter((transaction) => (
        transaction.originTransactionId === transactionId && isFutureDerivedTransaction(transaction)
      ))

      for (const child of existingFutureChildren) {
        const childMonth = child.date?.slice(0, 7) ?? ''
        if (!desiredMonths.has(childMonth)) {
          const { error: deleteError } = await transactionsClient.delete().eq('id', child.id)
          throwIfTransactionMutationFails(deleteError)
          continue
        }

        const nextChildDate = buildRecurringChildDate(childMonth, anchorDate)
        const { error: childUpdateError } = await transactionsClient
          .update({
            date: nextChildDate ?? child.date,
            description: derivedValues.description,
            amount: derivedValues.amount,
            type: derivedValues.type,
            category: derivedValues.category,
            budget_group_id: derivedValues.budgetGroupId,
            notes: derivedValues.notes,
          })
          .eq('id', child.id)

        throwIfTransactionMutationFails(childUpdateError)
      }

      const existingMonths = new Set(existingFutureChildren.map((transaction) => transaction.date?.slice(0, 7)).filter(Boolean))
      const missingMonths = [...desiredMonths].filter((month) => !existingMonths.has(month))

      if (missingMonths.length > 0) {
        const insertPayload = missingMonths
          .map((month) => {
            const date = buildRecurringChildDate(month, anchorDate)
            if (!date) {
              return null
            }

            return {
              user_id: userId,
              date,
              description: derivedValues.description,
              amount: derivedValues.amount,
              type: derivedValues.type,
              category: derivedValues.category,
              budget_group_id: derivedValues.budgetGroupId,
              account: currentTransaction.account ?? '',
              institution: currentTransaction.institution ?? '',
              notes: derivedValues.notes,
              installment: '',
              source: 'Manual',
              origin_transaction_id: transactionId,
              source_kind: 'manual_recurring' as const,
              is_ignored: false,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)

        if (insertPayload.length > 0) {
          const { error: insertError } = await transactionsClient.insert(insertPayload)
          throwIfTransactionMutationFails(insertError)
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao sincronizar recorrência.')
      setSavingId('')
      return
    }

    setTransactions((current) =>
      current
        .filter((transaction) => {
          if (transaction.originTransactionId !== transactionId || !isFutureDerivedTransaction(transaction)) {
            return true
          }

          const monthKey = transaction.date?.slice(0, 7) ?? ''
          return buildRecurringMonthKeys(currentTransaction.date ?? null, nextPatch.recurringUntilMonth ?? null).includes(monthKey)
        })
        .map((transaction) => {
          if (transaction.id === transactionId) {
            return {
              ...transaction,
              type: nextPatch.type,
              category: nextPatch.category,
              budgetGroupId: nextPatch.budgetGroupId,
              notes: nextNotes,
            }
          }

          if (transaction.originTransactionId !== transactionId || !isFutureDerivedTransaction(transaction)) {
            return transaction
          }

          const monthKey = transaction.date?.slice(0, 7) ?? ''
          return {
            ...transaction,
            date: buildRecurringChildDate(monthKey, currentTransaction.date) ?? transaction.date ?? null,
            type: nextPatch.type,
            category: nextPatch.category,
            budgetGroupId: nextPatch.budgetGroupId,
            notes: nextNotes,
            sourceKind: 'manual_recurring' as const,
          }
        })
        .concat(
          buildRecurringMonthKeys(currentTransaction.date ?? null, nextPatch.recurringUntilMonth ?? null)
            .filter((month) => !current.some((transaction) => transaction.originTransactionId === transactionId && transaction.date?.startsWith(month) === true))
            .map((month) => {
              const date = buildRecurringChildDate(month, currentTransaction.date) ?? `${month}-01`
              return {
                ...currentTransaction,
                date,
                notes: nextNotes,
                type: nextPatch.type,
                category: nextPatch.category,
                budgetGroupId: nextPatch.budgetGroupId,
                originTransactionId: transactionId,
                isIgnored: false,
                sourceKind: 'manual_recurring' as const,
              }
            }),
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
    creatingTransaction,
    editingTransaction,
    promptTransaction,
    openTransactionEditor,
    closeTransactionEditor,
    createManualTransaction,
    saveTransactionEdit,
    setTransactionIgnored,
    deleteTransaction,
    dismissRememberPrompt,
    rememberClassification,
  }
}
