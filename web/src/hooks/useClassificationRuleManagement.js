/* eslint-disable max-lines-per-function */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  reclassifyTransactionsWithRules,
  normalizeCategoryForType,
  getClassificationSnapshot,
  normalizeClassificationRule,
  normalizeRuleDescription,
  sortClassificationRules,
} from '../lib/transactions'

function buildRulePayload(payload, userId) {
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

async function findExistingRule(payload) {
  let query = supabase
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
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error(error?.message ?? 'Usuário não autenticado.')
  }

  return user.id
}

export function useClassificationRuleManagement(classificationRules, setClassificationRules, transactions, setTransactions, setError, setFeedback) {
  const [savingRuleId, setSavingRuleId] = useState('')
  const [reclassificationCandidate, setReclassificationCandidate] = useState(null)
  const [reclassifying, setReclassifying] = useState(false)

  async function upsertClassificationRule(payload, options = {}) {
    let userId
    try {
      userId = await getAuthenticatedUserId()
    } catch (error) {
      setError(error.message)
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
      ? supabase
          .from('transaction_classification_rules')
          .update(databasePayload)
          .eq('id', existingRule.id)
      : supabase.from('transaction_classification_rules').insert(databasePayload)

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

  async function createRuleFromTransaction(transaction, matchMode, overrides = {}) {
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

  async function updateClassificationRule(id, payload) {
    let userId
    try {
      userId = await getAuthenticatedUserId()
    } catch (error) {
      setError(error.message)
      return false
    }

    setSavingRuleId(id)
    setError('')
    setFeedback('')

    const databasePayload = buildRulePayload(payload, userId)
    const { data, error } = await supabase
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

  async function deleteClassificationRule(id) {
    setSavingRuleId(id)
    setError('')
    setFeedback('')

    const { error } = await supabase.from('transaction_classification_rules').delete().eq('id', id)
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
      return (
        transaction.type !== previousTransaction.type
        || transaction.category !== previousTransaction.category
        || (transaction.budgetGroupId ?? null) !== (previousTransaction.budgetGroupId ?? null)
      )
    })

    for (const transaction of changedTransactions) {
      const { error } = await supabase
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
