import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { ImportedTransaction } from './budget-groups.ts'

export type ClassificationRuleMatchMode = 'description' | 'description_amount'

export type UserClassificationRule = {
  id: string
  user_id: string
  match_mode: ClassificationRuleMatchMode
  match_description: string
  match_description_normalized: string
  match_amount: number | null
  type: ImportedTransaction['type']
  category: string
  budget_group_id: string | null
  updated_at: string
}

export function normalizeRuleDescription(description: string): string {
  return description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function compareRules(left: UserClassificationRule, right: UserClassificationRule): number {
  if (left.match_mode !== right.match_mode) {
    return left.match_mode === 'description_amount' ? -1 : 1
  }

  const lengthDelta = right.match_description_normalized.length - left.match_description_normalized.length
  if (lengthDelta !== 0) return lengthDelta

  return right.updated_at.localeCompare(left.updated_at)
}

function matchesRule(transaction: ImportedTransaction, rule: UserClassificationRule): boolean {
  const transactionDescription = normalizeRuleDescription(transaction.description)
  if (!transactionDescription || !rule.match_description_normalized) return false
  if (!transactionDescription.includes(rule.match_description_normalized)) return false

  if (rule.match_mode === 'description_amount') {
    return Number(rule.match_amount ?? 0).toFixed(2) === Number(transaction.amount).toFixed(2)
  }

  return true
}

export async function loadUserClassificationRules(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserClassificationRule[]> {
  const { data, error } = await supabase
    .from('transaction_classification_rules')
    .select(
      'id, user_id, match_mode, match_description, match_description_normalized, match_amount, type, category, budget_group_id, updated_at',
    )
    .eq('user_id', userId)

  if (error) throw error

  return [...(data ?? [])].sort(compareRules)
}

export function applyUserClassificationRule(
  transaction: ImportedTransaction,
  rules: UserClassificationRule[],
): ImportedTransaction {
  const matchedRule = rules.find((rule) => matchesRule(transaction, rule))
  if (!matchedRule) return transaction

  return {
    ...transaction,
    type: matchedRule.type,
    category: matchedRule.category,
    budget_group_id: matchedRule.budget_group_id,
  }
}

export function applyUserClassificationRules(
  transactions: ImportedTransaction[],
  rules: UserClassificationRule[],
): ImportedTransaction[] {
  if (!rules.length) return transactions
  return transactions.map((transaction) => applyUserClassificationRule(transaction, rules))
}
