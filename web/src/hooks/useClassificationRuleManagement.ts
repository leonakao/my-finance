/* eslint-disable max-lines-per-function */
import { useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import {
  getClassificationSnapshot,
  normalizeClassificationRule,
  sortClassificationRules,
} from '../lib/transactions'
import {
  buildRulePayload,
  formatReclassificationFeedback,
  reclassifyWithBackend,
  normalizeRuleContextValue,
  saveClassificationRule,
} from './useClassificationRuleManagement.utils'
import type {
  ClassificationRule,
  ClassificationRulePayload,
  ReclassificationCandidate,
  RulePromptOverrides,
  Transaction,
} from '../types'

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
  loadTransactions: () => Promise<boolean>,
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

    setSavingRuleId(options.savingRuleId ?? 'new')
    setError('')
    setFeedback('')

    const result = await saveClassificationRule(payload, userId, classificationRules)
    if ('error' in result) {
      setError(result.error)
      setSavingRuleId('')
      return null
    }

    const normalizedRule = result.normalizedRule
    const nextRules = sortClassificationRules(
      result.persisted
        ? classificationRules.map((rule) => (rule.id === normalizedRule.id ? normalizedRule : rule))
        : [...classificationRules, normalizedRule],
    )
    setClassificationRules(nextRules)
    setReclassificationCandidate({
      ruleId: normalizedRule.id,
      rules: nextRules,
    })
    setFeedback(result.persisted ? 'Regra atualizada com sucesso.' : 'Regra criada com sucesso.')
    setSavingRuleId('')
    return normalizedRule
  }

  async function createRuleFromTransaction(
    transaction: Transaction,
    matchMode: 'description' | 'description_amount',
    overrides: RulePromptOverrides = {},
  ) {
    const classificationSnapshot = getClassificationSnapshot(transaction)
    const matchInstitution = normalizeRuleContextValue(transaction.institution)
    const matchAccount = normalizeRuleContextValue(transaction.account)

    return upsertClassificationRule({
      matchMode,
      matchDescription: overrides.matchDescription ?? transaction.description,
      matchAmount: overrides.matchAmount ?? transaction.amount,
      matchInstitution,
      matchAccount,
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

    const existingRule = classificationRules.find((rule) => rule.id === id) ?? null
    const databasePayload = buildRulePayload(payload, userId, existingRule)
    const { data, error } = await getSupabaseOrThrow()
      .from('transaction_classification_rules')
      .update(databasePayload)
      .eq('id', id)
      .select(
        'id, match_mode, match_description, match_description_normalized, match_amount, match_institution, match_account, type, category, budget_group_id, updated_at',
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
    setFeedback('')

    try {
      const updatedCount = await reclassifyWithBackend(reclassificationCandidate.ruleId)
      const reloaded = await loadTransactions()
      if (!reloaded) {
        return false
      }

      setFeedback(formatReclassificationFeedback(updatedCount))
      setReclassificationCandidate(null)
      return true
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao reclassificar transações.')

      return false
    } finally {
      setReclassifying(false)
    }
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
