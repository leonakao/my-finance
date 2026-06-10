/* eslint-disable max-lines-per-function */
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  getClassificationSnapshot,
  normalizeClassificationRule,
  normalizeRuleDescription,
  sortClassificationRules,
} from '../lib/transactions'

function buildRulePayload(payload, userId) {
  const normalizedDescription = normalizeRuleDescription(payload.matchDescription)

  return {
    user_id: userId,
    match_mode: payload.matchMode,
    match_description: payload.matchDescription.trim(),
    match_description_normalized: normalizedDescription,
    match_amount: payload.matchMode === 'description_amount' ? Number(payload.matchAmount) : null,
    type: payload.type,
    category: payload.category,
    budget_group_id:
      payload.type === 'Receita' || payload.type === 'Transferência' ? null : (payload.budgetGroupId ?? null),
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

export function useClassificationRuleManagement(setClassificationRules, setError, setFeedback) {
  const [savingRuleId, setSavingRuleId] = useState('')

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
    setClassificationRules((current) => {
      const next = existingRule
        ? current.map((rule) => (rule.id === normalizedRule.id ? normalizedRule : rule))
        : [...current, normalizedRule]
      return sortClassificationRules(next)
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
    setClassificationRules((current) =>
      sortClassificationRules(current.map((rule) => (rule.id === id ? normalizedRule : rule))),
    )
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

  return {
    savingRuleId,
    upsertClassificationRule,
    createRuleFromTransaction,
    updateClassificationRule,
    deleteClassificationRule,
  }
}
