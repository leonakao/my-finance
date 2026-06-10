/* eslint-disable max-lines */
import { CATEGORY_OPTIONS_BY_TYPE, DEFAULT_CATEGORY_BY_TYPE, UNGROUPED_FILTER_VALUE } from '../constants'
import type {
  BudgetGroup,
  BudgetGroupRecord,
  ClassificationRule,
  ClassificationRuleMatchMode,
  ClassificationRuleRecord,
  ClassificationSnapshot,
  DecoratedTransaction,
  GroupOption,
  MonthData,
  MonthGroupBucket,
  Transaction,
  TransactionFilters,
  TransactionRecord,
  TransactionType,
} from '../types'

type RuleLike = Partial<ClassificationRule> & Partial<ClassificationRuleRecord>
type TransactionLike = Partial<Transaction> & { budget_group_id?: string | null }

export function matchesFilter(value: string, filter: string): boolean {
  return filter === 'all' || value === filter
}

export function nextBudgetGroupIdForType(type: TransactionType, currentBudgetGroupId: string | null): string | null {
  if (type === 'Receita') {
    return null
  }

  return currentBudgetGroupId
}

export function getCategoryOptionsForType(type: TransactionType): string[] {
  return CATEGORY_OPTIONS_BY_TYPE[type]
}

export function getDefaultCategoryForType(type: TransactionType): string {
  return DEFAULT_CATEGORY_BY_TYPE[type]
}

export function normalizeCategoryForType(type: TransactionType, category: string): string {
  const options = getCategoryOptionsForType(type)
  return options.includes(category) ? category : getDefaultCategoryForType(type)
}

export function normalizeBudgetGroup(row: BudgetGroupRecord): BudgetGroup {
  return {
    id: row.id,
    name: row.name ?? '',
    targetPercentage: Number(row.target_percentage ?? 0),
  }
}

export function normalizeRuleDescription(description: string | null | undefined): string {
  return String(description ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function getClassificationSnapshot(transaction: TransactionLike): ClassificationSnapshot {
  const type = transaction.type ?? 'Despesa'
  return {
    type,
    category: normalizeCategoryForType(type, transaction.category ?? 'Outros'),
    budget_group_id: transaction.budgetGroupId ?? transaction.budget_group_id ?? null,
  }
}

export function classificationSnapshotsEqual(left: ClassificationSnapshot, right: ClassificationSnapshot): boolean {
  return left.type === right.type && left.category === right.category && (left.budget_group_id ?? null) === (right.budget_group_id ?? null)
}

function normalizeRuleMatchAmount(value: number | string | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value)
}

export function normalizeClassificationRule(row: ClassificationRuleRecord): ClassificationRule {
  const type = row.type ?? 'Despesa'
  return {
    id: row.id,
    matchMode: row.match_mode ?? 'description',
    matchDescription: row.match_description ?? '',
    matchDescriptionNormalized: row.match_description_normalized ?? '',
    matchAmount: normalizeRuleMatchAmount(row.match_amount),
    type,
    category: normalizeCategoryForType(type, row.category ?? 'Outros'),
    budgetGroupId: row.budget_group_id ?? null,
    updatedAt: row.updated_at ?? '',
  }
}

export function sortClassificationRules(rules: ClassificationRule[]): ClassificationRule[] {
  return [...rules].sort((left, right) => {
    if (left.matchMode !== right.matchMode) {
      return left.matchMode === 'description_amount' ? -1 : 1
    }

    const lengthDelta = right.matchDescriptionNormalized.length - left.matchDescriptionNormalized.length
    if (lengthDelta !== 0) {
      return lengthDelta
    }

    return (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')
  })
}

export function getRuleDescriptionWarning(description: string): string {
  const normalized = normalizeRuleDescription(description)
  if (normalized.length < 4) {
    return 'Descrições muito curtas podem classificar transações demais.'
  }

  if (!normalized.includes(' ') && normalized.length < 6) {
    return 'Descrições muito genéricas podem gerar matches parciais amplos.'
  }

  return ''
}

function normalizeRuleMatchMode(rule: RuleLike): ClassificationRuleMatchMode {
  return rule.matchMode ?? rule.match_mode ?? 'description'
}

function normalizeRuleMatchDescriptionNormalized(rule: RuleLike): string {
  return rule.matchDescriptionNormalized
    ?? rule.match_description_normalized
    ?? normalizeRuleDescription(rule.matchDescription ?? rule.match_description ?? '')
}

function normalizeRuleMatchAmountFromRule(rule: RuleLike): number | null {
  const value = rule.matchAmount ?? rule.match_amount
  return value === null || value === undefined ? null : Number(value)
}

export function doesClassificationRuleMatchTransaction(transaction: TransactionLike, rule: RuleLike): boolean {
  const transactionDescription = normalizeRuleDescription(transaction.description ?? '')
  const ruleDescription = normalizeRuleMatchDescriptionNormalized(rule)

  if (!transactionDescription || !ruleDescription) {
    return false
  }

  if (!transactionDescription.includes(ruleDescription)) {
    return false
  }

  if (normalizeRuleMatchMode(rule) === 'description_amount') {
    return Number(transaction.amount ?? 0).toFixed(2) === Number(normalizeRuleMatchAmountFromRule(rule) ?? 0).toFixed(2)
  }

  return true
}

export function applyClassificationRulesToTransaction(transaction: Transaction, rules: ClassificationRule[]): Transaction {
  const matchedRule = rules.find((rule) => doesClassificationRuleMatchTransaction(transaction, rule))
  if (!matchedRule) {
    return transaction
  }

  const nextType = matchedRule.type
  const nextCategory = normalizeCategoryForType(nextType, matchedRule.category)

  return {
    ...transaction,
    type: nextType,
    category: nextCategory,
    budgetGroupId: nextType === 'Receita' ? null : matchedRule.budgetGroupId,
  }
}

export function reclassifyTransactionsWithRules(transactions: Transaction[], rules: ClassificationRule[]): {
  changedCount: number
  transactions: Transaction[]
} {
  let changedCount = 0

  const nextTransactions = transactions.map((transaction) => {
    const nextTransaction = applyClassificationRulesToTransaction(transaction, rules)
    const changed =
      nextTransaction.type !== transaction.type
      || nextTransaction.category !== transaction.category
      || (nextTransaction.budgetGroupId ?? null) !== (transaction.budgetGroupId ?? null)

    if (changed) {
      changedCount += 1
    }

    return nextTransaction
  })

  return {
    changedCount,
    transactions: nextTransactions,
  }
}

export function normalizeTransaction(row: TransactionRecord): Transaction {
  const type = row.type ?? 'Despesa'
  return {
    id: row.id,
    date: row.date,
    description: row.description ?? '',
    amount: Number(row.amount ?? 0),
    type,
    category: normalizeCategoryForType(type, row.category ?? 'Outros'),
    budgetGroupId: row.budget_group_id ?? null,
    account: row.account ?? '',
    institution: row.institution ?? '',
    status: row.status ?? 'Confirmado',
    notes: row.notes ?? '',
  }
}

export function decorateTransactions(transactions: Transaction[], budgetGroups: BudgetGroup[]): DecoratedTransaction[] {
  const budgetGroupsById = new Map(budgetGroups.map((budgetGroup) => [budgetGroup.id, budgetGroup]))

  return transactions.map((transaction) => {
    const budgetGroup =
      transaction.budgetGroupId !== null
        ? (budgetGroupsById.get(transaction.budgetGroupId) ?? null)
        : null

    return {
      ...transaction,
      budgetGroupName: budgetGroup?.name ?? null,
      needsReclassification: transaction.type === 'Despesa' && transaction.budgetGroupId === null,
    }
  })
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const [, base64 = ''] = result.split(',')
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

function buildGroupBuckets(budgetGroups: BudgetGroup[]): Record<string, MonthGroupBucket> {
  const buckets: Record<string, MonthGroupBucket> = {}

  for (const budgetGroup of budgetGroups) {
    buckets[budgetGroup.id] = {
      ...budgetGroup,
      total: 0,
      byCategory: {},
      transactions: [],
    }
  }

  return buckets
}

/* eslint-disable-next-line complexity */
export function buildMonthData(transactions: Transaction[], budgetGroups: BudgetGroup[]): Map<string, MonthData> {
  const monthMap = new Map<string, MonthData>()

  for (const transaction of transactions) {
    if (transaction.date === null || transaction.date === undefined || transaction.date === '') {
      continue
    }

    const month = transaction.date.slice(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, {
        revenue: 0,
        groups: buildGroupBuckets(budgetGroups),
        groupOrder: budgetGroups.map((budgetGroup) => budgetGroup.id),
        orphanedTotal: 0,
        orphanedCount: 0,
      })
    }

    const bucket = monthMap.get(month)
    if (!bucket) {
      continue
    }
    if (transaction.status !== 'Confirmado') {
      continue
    }

    if (transaction.type === 'Receita') {
      bucket.revenue += transaction.amount
      continue
    }

    if (transaction.budgetGroupId === null || bucket.groups[transaction.budgetGroupId] === undefined) {
      if (transaction.type === 'Despesa') {
        bucket.orphanedTotal += transaction.amount
        bucket.orphanedCount += 1
      }
      continue
    }

    const group = bucket.groups[transaction.budgetGroupId]!
    group.total += transaction.amount
    group.transactions.push(transaction)
    group.byCategory[transaction.category] = (group.byCategory[transaction.category] ?? 0) + transaction.amount
  }

  return monthMap
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  return [
    ...new Set(transactions.map((item) => item.date?.slice(0, 7)).filter((value): value is string => Boolean(value))),
  ].sort().reverse()
}

export function getMonthTransactions(transactions: DecoratedTransaction[], activeMonth: string): DecoratedTransaction[] {
  return transactions
    .filter((transaction) => transaction.date?.startsWith(activeMonth) === true)
    .filter((transaction) => transaction.status === 'Confirmado')
    .sort((left, right) => right.amount - left.amount)
}

export function filterTransactions(transactions: DecoratedTransaction[], filters: TransactionFilters): DecoratedTransaction[] {
  const searchTerm = filters.search.trim().toLowerCase()

  return transactions.filter((transaction) => {
    if (searchTerm) {
      const haystack = `${transaction.description} ${transaction.institution} ${transaction.notes}`.toLowerCase()
      if (!haystack.includes(searchTerm)) {
        return false
      }
    }

    if (!matchesFilter(transaction.type, filters.type)) {
      return false
    }
    if (!matchesFilter(transaction.category, filters.category)) {
      return false
    }
    if (filters.group === UNGROUPED_FILTER_VALUE) {
      return transaction.budgetGroupId === null
    }
    if (!matchesFilter(transaction.budgetGroupId ?? '', filters.group)) {
      return false
    }

    return true
  })
}

export function getTransactionOptions(
  monthTransactions: DecoratedTransaction[],
  budgetGroups: BudgetGroup[],
): {
  typeOptions: TransactionType[]
  categoryOptions: string[]
  groupOptions: GroupOption[]
} {
  const groupOptions: GroupOption[] = budgetGroups.map((budgetGroup) => ({
    value: budgetGroup.id,
    label: budgetGroup.name,
  }))

  if (monthTransactions.some((transaction) => transaction.budgetGroupId === null)) {
    groupOptions.unshift({
      value: UNGROUPED_FILTER_VALUE,
      label: 'Sem grupo',
    })
  }

  return {
    typeOptions: [...new Set(monthTransactions.map((transaction) => transaction.type))].sort(),
    categoryOptions: [...new Set(monthTransactions.map((transaction) => transaction.category))].sort(),
    groupOptions,
  }
}
