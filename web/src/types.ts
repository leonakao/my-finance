export type TransactionType = 'Despesa' | 'Receita' | 'Transferência'

export type ClassificationRuleMatchMode = 'description' | 'description_amount'

export type ImportKind = 'account' | 'card' | 'santander-card-pdf' | 'santander-account-pdf'

export type BudgetGroup = {
  id: string
  name: string
  targetPercentage: number
}

export type BudgetGroupRecord = {
  id: string
  name: string | null
  target_percentage: number | string | null
}

export type BudgetGroupPayload = {
  name: string
  targetPercentage: number
}

export type Transaction = {
  id: string
  date?: string | null
  description: string
  amount: number
  type: TransactionType
  category: string
  budgetGroupId: string | null
  account?: string
  institution?: string
  status?: string
  notes?: string
}

export type DecoratedTransaction = Transaction & {
  budgetGroupName: string | null
  needsReclassification: boolean
}

export type TransactionRecord = {
  id: string
  date: string | null
  description: string | null
  amount: number | string | null
  type: TransactionType | null
  category: string | null
  budget_group_id: string | null
  account: string | null
  institution: string | null
  status: string | null
  notes: string | null
}

export type TransactionEditPayload = {
  type: TransactionType
  category: string
  budgetGroupId: string | null
}

export type TransactionFilters = {
  search: string
  type: TransactionType | 'all'
  category: string
  group: string
}

export type ClassificationSnapshot = {
  type: TransactionType
  category: string
  budget_group_id: string | null
}

export type ClassificationRule = {
  id: string
  matchMode: ClassificationRuleMatchMode
  matchDescription: string
  matchDescriptionNormalized: string
  matchAmount: number | null
  type: TransactionType
  category: string
  budgetGroupId: string | null
  updatedAt?: string
}

export type ClassificationRulePayload = {
  matchMode: ClassificationRuleMatchMode
  matchDescription: string
  matchAmount: number | null
  type: TransactionType
  category: string
  budgetGroupId: string | null
}

export type ClassificationRuleRecord = {
  id: string
  match_mode: ClassificationRuleMatchMode | null
  match_description: string | null
  match_description_normalized: string | null
  match_amount: number | string | null
  type: TransactionType | null
  category: string | null
  budget_group_id: string | null
  updated_at: string | null
}

export type RulePromptOverrides = Partial<Pick<ClassificationRulePayload, 'matchDescription' | 'matchAmount'>>

export type ReclassificationCandidate = {
  ruleId: string
  rules: ClassificationRule[]
}

export type GroupOption = {
  value: string
  label: string
}

export type ImportOption = {
  value: ImportKind
  label: string
}

export type ImportPayload = {
  kind: ImportKind
  invoice: string
  file: File
}

export type ImportResponse = {
  imported: number
  confirmed: number
  ignored: number
}

export type MonthGroupBucket = BudgetGroup & {
  total: number
  byCategory: Record<string, number>
  transactions: Transaction[]
}

export type MonthData = {
  revenue: number
  groups: Record<string, MonthGroupBucket>
  groupOrder: string[]
  orphanedTotal: number
  orphanedCount: number
}
