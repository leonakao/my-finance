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
  notes?: string
  installment?: string
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
  notes: string | null
  installment?: string | null
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
  inserted: number
  ignored: number
  classified?: number
  duplicatesDropped?: number
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

export type MonthSummary = {
  monthKey: string
  revenue: number
  expenses: number
  transferOut: number
  net: number
}

export type TrendMonth = MonthSummary & {
  isCurrent: boolean
  isProjected: boolean
}

export type RecurringCandidate = {
  description: string
  normalizedDescription: string
  amount: number
  type: Exclude<TransactionType, 'Transferência'>
  category: string
  budgetGroupId: string | null
  occurrenceCount: number
  observedMonthCount: number
  lastObservedDate: string
  expectedDayOfMonth: number
}

export type ProjectionItemBasis = {
  averageAmount: number
  occurrenceCount: number
  observedMonthCount: number
  lastObservedDate: string
}

export type ProjectionLineItem = {
  id: string
  kind: 'registered' | 'probable'
  date: string
  isDateEstimated: boolean
  description: string
  normalizedDescription: string
  amount: number
  type: Exclude<TransactionType, 'Transferência'>
  category: string
  budgetGroupId: string | null
  budgetGroupName: string
  installment: string | null
  basis: ProjectionItemBasis | null
}

export type ProjectionGroupSummary = {
  budgetGroupId: string | null
  budgetGroupName: string
  registeredAmount: number
  probableAmount: number
  totalAmount: number
  itemCount: number
}

export type ProjectionCategorySummary = {
  type: Exclude<TransactionType, 'Transferência'>
  category: string
  registeredAmount: number
  probableAmount: number
  totalAmount: number
  itemCount: number
}

export type MonthlyProjectionTotals = {
  registeredRevenue: number
  probableRevenue: number
  registeredExpenses: number
  probableExpenses: number
  totalRevenue: number
  totalExpenses: number
  remainingNet: number
}

export type MonthlyProjectionInsight = {
  monthKey: string
  isCurrentMonth: boolean
  hasProjection: boolean
  totals: MonthlyProjectionTotals
  balanceToDate: number | null
  availableToSpend: number | null
  daysRemaining: number | null
  weeksRemaining: number | null
  weeklyBalance: number | null
  weeklySpendingSuggestion: number | null
  registeredItems: ProjectionLineItem[]
  probableItems: ProjectionLineItem[]
  groupSummaries: ProjectionGroupSummary[]
  categorySummaries: ProjectionCategorySummary[]
}

export type ProjectionMonth = {
  monthKey: string
  revenue: number
  confirmedExpenses: number
  probableExpenses: number
  net: number
  plannedTransactionsCount: number
  probableTransactionsCount: number
  plannedByGroup: Record<string, number>
  probableByGroup: Record<string, number>
}

export type FinancialOverview = {
  currentMonthKey: string
  recentMonths: MonthSummary[]
  trendMonths: TrendMonth[]
  projectedMonths: ProjectionMonth[]
  averageRevenue: number
  averageExpenses: number
  averageNet: number
  plannedCommitments: number
  probableCommitments: number
}

export type FinancialAnalysis = {
  overview: FinancialOverview
  monthlyProjectionInsight: MonthlyProjectionInsight | null
}
