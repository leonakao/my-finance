/* eslint-disable max-lines-per-function */
import { useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import {
  reclassifyTransactionsWithRules,
  normalizeCategoryForType,
  getClassificationSnapshot,
  normalizeClassificationRule,
  normalizeRuleDescription,
  sortClassificationRules,
} from '../lib/transactions'
import type {
  ClassificationRule,
  ClassificationRulePayload,
  ReclassificationCandidate,
  RulePromptOverrides,
  Transaction,
  TransactionType,
} from '../types'

type RulePayloadRecord = {
  user_id: string
  match_mode: 'description' | 'description_amount'
  match_description: string
  match_description_normalized: string
  match_amount: number | null
  type: TransactionType
  category: string
  budget_group_id: string | null
}

function buildRulePayload(payload: ClassificationRulePayload, userId: string): RulePayloadRecord {
  const normalizedDescription = normalizeRuleDescription(payload.matchDescription)
  const normalizedType = payload.type
  const normalizedCategory = normalizeCategoryForType(normalizedType, payload.category)

  return {
    user_id: userId,
    match_mode: payload.matchMode,
    match_description: payload.matchDescription.trim(),
    match_description_normalized: normalizedDescription,
    match_amount: payload.matchMode === 'description_amount' ? Number(payload.matchAmount) : null,
    type: normalizedType,
    category: normalizedCategory,
    budget_group_id: normalizedType === 'Receita' ? null : (payload.budgetGroupId ?? null),
  }
}

async function findExistingRule(payload: RulePayloadRecord) {
  let query = getSupabaseOrThrow()
    .from('transaction_classification_rules')
    .select(
      'id, match_mode, match_description, match_description_normalized, match_amount, type, category, budget_group_id, updated_at',
    )
    .eq('match_mode', payload.match_mode)
    .eq('match_description_normalized', payload.match_description_normalized)

  query =
    payload.match_mode === 'description_amount'
      ? query.eq('match_amount', payload.match_amount)
      : query.is('match_amount', null)

  return query.maybeSingle()
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await getSupabaseOrThrow().auth.getUser()

  if (error || !user) {
    throw new Error(error?.message ?? 'Usuário não autenticado.')
  }

  return user.id
}

export function useClassificationRuleManagement(
  classificationRules: ClassificationRule[],
  setClassificationRules: Dispatch<SetStateAction<ClassificationRule[]>>,
  transactions: Transaction[],
  setTransactions: Dispatch<SetStateAction<Transaction[]>>,
  setError: Dispatch<SetStateAction<string>>,
  setFeedback: Dispatch<SetStateAction<string>>,
) {
  const [savingRuleId, setSavingRuleId] = useState('')
  const [reclassificationCandidate, setReclassificationCandidate] = useState<ReclassificationCandidate | null>(null)
  const [reclassifying, setReclassifying] = useState(false)

  async function upsertClassificationRule(
    payload: ClassificationRulePayload,
    options: { savingRuleId?: string } = {},
  ): Promise<ClassificationRule | null> {
    let userId
    try {
      userId = await getAuthenticatedUserId()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao autenticar usuário.')
      return null
    }

    const databasePayload = buildRulePayload(payload, userId)
    setSavingRuleId(options.savingRuleId ?? 'new')
    setError('')
    setFeedback('')

    const { data: existingRule, error: existingError } = await findExistingRule(databasePayload)
    if (existingError) {
      setError(existingError.message)
      setSavingRuleId('')
      return null
    }

    const ruleQuery = existingRule
      ? getSupabaseOrThrow()
          .from('transaction_classification_rules')
          .update(databasePayload)
          .eq('id', existingRule.id)
      : getSupabaseOrThrow().from('transaction_classification_rules').insert(databasePayload)

    const { data, error } = await ruleQuery
      .select(
        'id, match_mode, match_description, match_description_normalized, match_amount, type, category, budget_group_id, updated_at',
      )
      .single()

    if (error) {
      setError(error.message)
      setSavingRuleId('')
      return null
    }

    const normalizedRule = normalizeClassificationRule(data)
    const nextRules = sortClassificationRules(
      existingRule
        ? classificationRules.map((rule) => (rule.id === normalizedRule.id ? normalizedRule : rule))
        : [...classificationRules, normalizedRule],
    )
    setClassificationRules(nextRules)
    setReclassificationCandidate({
      ruleId: normalizedRule.id,
      rules: nextRules,
    })
    setFeedback(existingRule ? 'Regra atualizada com sucesso.' : 'Regra criada com sucesso.')
    setSavingRuleId('')
    return normalizedRule
  }

  async function createRuleFromTransaction(
    transaction: Transaction,
    matchMode: 'description' | 'description_amount',
    overrides: RulePromptOverrides = {},
  ) {
    const classificationSnapshot = getClassificationSnapshot(transaction)

    return upsertClassificationRule({
      matchMode,
      matchDescription: overrides.matchDescription ?? transaction.description,
      matchAmount: overrides.matchAmount ?? transaction.amount,
      type: classificationSnapshot.type,
      category: classificationSnapshot.category,
      budgetGroupId: classificationSnapshot.budget_group_id,
    })
  }

  async function updateClassificationRule(id: string, payload: ClassificationRulePayload): Promise<boolean> {
    let userId
    try {
      userId = await getAuthenticatedUserId()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao autenticar usuário.')
      return false
    }

    setSavingRuleId(id)
    setError('')
    setFeedback('')

    const databasePayload = buildRulePayload(payload, userId)
    const { data, error } = await getSupabaseOrThrow()
      .from('transaction_classification_rules')
      .update(databasePayload)
      .eq('id', id)
      .select(
        'id, match_mode, match_description, match_description_normalized, match_amount, type, category, budget_group_id, updated_at',
      )
      .single()

    if (error) {
      setError(error.message)
      setSavingRuleId('')
      return false
    }

    const normalizedRule = normalizeClassificationRule(data)
    const nextRules = sortClassificationRules(classificationRules.map((rule) => (rule.id === id ? normalizedRule : rule)))
    setClassificationRules(nextRules)
    setReclassificationCandidate({
      ruleId: normalizedRule.id,
      rules: nextRules,
    })
    setFeedback('Regra atualizada com sucesso.')
    setSavingRuleId('')
    return true
  }

  async function deleteClassificationRule(id: string): Promise<boolean> {
    setSavingRuleId(id)
    setError('')
    setFeedback('')

    const { error } = await getSupabaseOrThrow().from('transaction_classification_rules').delete().eq('id', id)
    if (error) {
      setError(error.message)
      setSavingRuleId('')
      return false
    }

    setClassificationRules((current) => current.filter((rule) => rule.id !== id))
    setFeedback('Regra excluída com sucesso.')
    setSavingRuleId('')
    return true
  }

  function dismissReclassificationPrompt() {
    if (!reclassifying) {
      setReclassificationCandidate(null)
    }
  }

  async function reclassifyExistingTransactions() {
    if (!reclassificationCandidate) {
      return false
    }

    setReclassifying(true)
    setError('')

    const { changedCount, transactions: nextTransactions } = reclassifyTransactionsWithRules(
      transactions,
      reclassificationCandidate.rules,
    )

    if (!changedCount) {
      setFeedback('Nenhuma transação existente precisou ser reclassificada.')
      setReclassificationCandidate(null)
      setReclassifying(false)
      return true
    }

    const changedTransactions = nextTransactions.filter((transaction, index) => {
      const previousTransaction = transactions[index]
      if (!previousTransaction) {
        return false
      }
      return (
        transaction.type !== previousTransaction.type
        || transaction.category !== previousTransaction.category
        || (transaction.budgetGroupId ?? null) !== (previousTransaction.budgetGroupId ?? null)
      )
    })

    for (const transaction of changedTransactions) {
      const { error } = await getSupabaseOrThrow()
        .from('transactions')
        .update({
          type: transaction.type,
          category: transaction.category,
          budget_group_id: transaction.budgetGroupId,
        })
        .eq('id', transaction.id)

      if (error) {
        setError(error.message)
        setReclassifying(false)
        return false
      }
    }

    setTransactions(nextTransactions)
    setFeedback(
      changedCount === 1
        ? '1 transação existente foi reclassificada.'
        : `${changedCount} transações existentes foram reclassificadas.`,
    )
    setReclassificationCandidate(null)
    setReclassifying(false)
    return true
  }

  return {
    savingRuleId,
    reclassificationCandidate,
    reclassifying,
    upsertClassificationRule,
    createRuleFromTransaction,
    updateClassificationRule,
    deleteClassificationRule,
    dismissReclassificationPrompt,
    reclassifyExistingTransactions,
  }
}
