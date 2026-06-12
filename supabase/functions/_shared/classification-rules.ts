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
  match_institution: string | null
  match_account: string | null
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

function normalizeRuleContextValue(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim()
  return normalized === '' ? null : normalized
}

function normalizeCategoryForType(type: ImportedTransaction['type'], category: string): string {
  const categoriesByType: Record<ImportedTransaction['type'], string[]> = {
    Despesa: [
      'Alimentação',
      'Moradia',
      'Transporte',
      'Saúde',
      'Pets',
      'Seguros',
      'Educação',
      'Lazer',
      'Compras',
      'Assinaturas',
      'Telefone',
      'Cuidados pessoais',
      'Trabalho',
      'Impostos e taxas',
      'Serviços financeiros',
      'Outros',
    ],
    Receita: ['Salário', 'Freelance', 'Reembolso', 'Rendimentos', 'Venda', 'Benefícios', 'Outros'],
    Transferência: ['Investimentos', 'Pagamento de fatura', 'Transferência entre contas', 'Reserva', 'Outros'],
  }

  const options = categoriesByType[type]
  return options.includes(category) ? category : 'Outros'
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

  if (rule.match_institution !== null && normalizeRuleContextValue(transaction.institution) !== rule.match_institution) {
    return false
  }

  if (rule.match_account !== null && normalizeRuleContextValue(transaction.account) !== rule.match_account) {
    return false
  }

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
      'id, user_id, match_mode, match_description, match_description_normalized, match_amount, match_institution, match_account, type, category, budget_group_id, updated_at',
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

  const nextType = matchedRule.type
  const nextCategory = normalizeCategoryForType(nextType, matchedRule.category)

  return {
    ...transaction,
    type: nextType,
    category: nextCategory,
    budget_group_id: nextType === 'Receita' ? null : matchedRule.budget_group_id,
  }
}

export function applyUserClassificationRules(
  transactions: ImportedTransaction[],
  rules: UserClassificationRule[],
): ImportedTransaction[] {
  if (!rules.length) return transactions
  return transactions.map((transaction) => applyUserClassificationRule(transaction, rules))
}

export function applyUserClassificationRulesWithCount(
  transactions: ImportedTransaction[],
  rules: UserClassificationRule[],
): { transactions: ImportedTransaction[]; classifiedCount: number } {
  if (!rules.length) {
    return {
      transactions,
      classifiedCount: 0,
    }
  }

  let classifiedCount = 0
  const classifiedTransactions = transactions.map((transaction) => {
    const classifiedTransaction = applyUserClassificationRule(transaction, rules)
    const changed =
      classifiedTransaction.type !== transaction.type
      || classifiedTransaction.category !== transaction.category
      || (classifiedTransaction.budget_group_id ?? null) !== (transaction.budget_group_id ?? null)

    if (changed) {
      classifiedCount += 1
    }
    return classifiedTransaction
  })

  return {
    transactions: classifiedTransactions,
    classifiedCount,
  }
}
