import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const DEFAULT_BUDGET_GROUP_NAMES = ['Necessidades', 'Desejos', 'Futuro'] as const

export type DefaultBudgetGroupName = (typeof DEFAULT_BUDGET_GROUP_NAMES)[number]

export type ParsedImportedTransaction = {
  user_id: string
  date: string
  description: string
  amount: number
  type: 'Despesa' | 'Receita' | 'Transferência'
  category: string
  budget_group_name: DefaultBudgetGroupName | null
  account: string
  institution: string
  ignored: boolean
  notes: string
  invoice: string
  installment: string
  external_id: string
  source: string
}

export type ImportedTransaction = Omit<ParsedImportedTransaction, 'budget_group_name'> & {
  budget_group_id: string | null
}

export async function resolveImportedTransactionBudgetGroups(
  supabase: SupabaseClient,
  userId: string,
  transactions: ParsedImportedTransaction[],
): Promise<ImportedTransaction[]> {
  const candidateNames = [...new Set(transactions.flatMap((transaction) => (transaction.budget_group_name ? [transaction.budget_group_name] : [])))]

  if (!candidateNames.length) {
    return transactions.map(({ budget_group_name: _budgetGroupName, ...transaction }) => ({
      ...transaction,
      budget_group_id: null,
    }))
  }

  const { data, error } = await supabase
    .from('budget_groups')
    .select('id, name')
    .eq('user_id', userId)
    .in('name', candidateNames)

  if (error) {
    throw error
  }

  const idsByName = new Map(data.map((budgetGroup) => [budgetGroup.name, budgetGroup.id]))

  return transactions.map(({ budget_group_name: budgetGroupName, ...transaction }) => ({
    ...transaction,
    budget_group_id: budgetGroupName ? (idsByName.get(budgetGroupName) ?? null) : null,
  }))
}
