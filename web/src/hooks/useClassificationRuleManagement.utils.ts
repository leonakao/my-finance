import type { FunctionsHttpError } from '@supabase/supabase-js'
import { getSupabaseOrThrow } from '../lib/supabase'
import { normalizeCategoryForType, normalizeClassificationRule, normalizeRuleDescription } from '../lib/transactions'
import type { ClassificationRule, ClassificationRulePayload, ClassificationRuleRecord, TransactionType } from '../types'

export type RulePayloadRecord = {
  user_id: string
  match_mode: 'description' | 'description_amount'
  match_description: string
  match_description_normalized: string
  match_amount: number | null
  match_institution: string | null
  match_account: string | null
  type: TransactionType
  category: string
  budget_group_id: string | null
  notes: string | null
}

type RuleContext = Pick<ClassificationRule, 'matchInstitution' | 'matchAccount'>
type RuleRecord = ClassificationRuleRecord

export function normalizeRuleContextValue(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim()
  return normalized === '' ? null : normalized
}

function getRuleMatchAmount(payload: ClassificationRulePayload): number | null {
  return payload.matchMode === 'description_amount' ? Number(payload.matchAmount) : null
}

function getRuleBudgetGroupId(type: TransactionType, budgetGroupId: string | null): string | null {
  return type === 'Receita' ? null : budgetGroupId
}

function resolveRuleContextValue(value: string | null | undefined, fallback: string | null | undefined): string | null {
  return normalizeRuleContextValue(value ?? fallback ?? null)
}

function normalizeRuleNotes(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim()
  return normalized === '' ? null : normalized
}

export function findMatchingRule(
  rules: ClassificationRule[],
  payload: ClassificationRulePayload,
): ClassificationRule | null {
  return rules.find(
    (rule) =>
      rule.matchMode === payload.matchMode
      && rule.matchDescriptionNormalized === normalizeRuleDescription(payload.matchDescription)
      && (payload.matchMode === 'description_amount'
        ? rule.matchAmount === Number(payload.matchAmount)
        : rule.matchAmount === null)
      && normalizeRuleContextValue(rule.matchInstitution) === normalizeRuleContextValue(payload.matchInstitution)
      && normalizeRuleContextValue(rule.matchAccount) === normalizeRuleContextValue(payload.matchAccount),
  ) ?? null
}

export function buildRulePayload(
  payload: ClassificationRulePayload,
  userId: string,
  existingRule: RuleContext | null = null,
): RulePayloadRecord {
  const normalizedDescription = normalizeRuleDescription(payload.matchDescription)
  const normalizedType = payload.type
  const normalizedCategory = normalizeCategoryForType(normalizedType, payload.category)

  return {
    user_id: userId,
    match_mode: payload.matchMode,
    match_description: payload.matchDescription.trim(),
    match_description_normalized: normalizedDescription,
    match_amount: getRuleMatchAmount(payload),
    match_institution: resolveRuleContextValue(payload.matchInstitution, existingRule?.matchInstitution),
    match_account: resolveRuleContextValue(payload.matchAccount, existingRule?.matchAccount),
    type: normalizedType,
    category: normalizedCategory,
    budget_group_id: getRuleBudgetGroupId(normalizedType, payload.budgetGroupId ?? null),
    notes: normalizeRuleNotes(payload.notes),
  }
}

async function findExistingRule(
  payload: RulePayloadRecord,
): Promise<{ data: RuleRecord | null; error: { message: string } | null }> {
  let query = getSupabaseOrThrow()
    .from('transaction_classification_rules')
    .select(
      'id, match_mode, match_description, match_description_normalized, match_amount, match_institution, match_account, type, category, budget_group_id, notes, updated_at',
    )
    .eq('match_mode', payload.match_mode)
    .eq('match_description_normalized', payload.match_description_normalized)

  query =
    payload.match_institution === null
      ? query.is('match_institution', null)
      : query.eq('match_institution', payload.match_institution)

  query =
    payload.match_account === null
      ? query.is('match_account', null)
      : query.eq('match_account', payload.match_account)

  query =
    payload.match_mode === 'description_amount'
      ? query.eq('match_amount', payload.match_amount)
      : query.is('match_amount', null)

  const result = await query.maybeSingle()
  return result
}

async function persistRule(
  databasePayload: RulePayloadRecord,
  ruleId: string | null,
): Promise<{ data: RuleRecord | null; error: { message: string } | null }> {
  const client = getSupabaseOrThrow().from('transaction_classification_rules')
  const query = ruleId ? client.update(databasePayload).eq('id', ruleId) : client.insert(databasePayload)

  const result = await query
    .select(
      'id, match_mode, match_description, match_description_normalized, match_amount, match_institution, match_account, type, category, budget_group_id, notes, updated_at',
    )
    .single()

  return result
}

export async function saveClassificationRule(
  payload: ClassificationRulePayload,
  userId: string,
  rules: ClassificationRule[],
): Promise<{ normalizedRule: ClassificationRule; persisted: boolean } | { error: string }> {
  const matchedRule = findMatchingRule(rules, payload)
  const databasePayload = buildRulePayload(payload, userId, matchedRule)
  const { data: existingRule, error: existingError } = await findExistingRule(databasePayload)
  if (existingError) {
    return { error: existingError.message }
  }

  const { data, error } = await persistRule(databasePayload, existingRule?.id ?? null)
  if (error) {
    return { error: error.message }
  }
  if (!data) {
    return { error: 'Falha ao salvar regra de classificação.' }
  }

  return {
    normalizedRule: normalizeClassificationRule(data),
    persisted: existingRule !== null,
  }
}

export function formatReclassificationFeedback(updatedCount: number): string {
  return updatedCount === 1
    ? '1 transação existente foi reclassificada.'
    : `${updatedCount} transações existentes foram reclassificadas.`
}

export async function reclassifyWithBackend(ruleId: string): Promise<number> {
  const response = (await getSupabaseOrThrow().functions.invoke('reclassify-transactions-by-rule', {
    body: {
      rule_id: ruleId,
    },
  })) as {
    data: { updated_count: number } | null
    error: FunctionsHttpError | Error | null
  }

  if (response.error) {
    throw response.error
  }

  return response.data?.updated_count ?? 0
}
