/* eslint-disable max-lines */
import type {
  BudgetGroup,
  FinancialAnalysis,
  FinancialOverview,
  MonthSummary,
  MonthlyProjectionInsight,
  MonthlyProjectionTotals,
  ProjectionCategorySummary,
  ProjectionGroupSummary,
  ProjectionLineItem,
  ProjectionMonth,
  RecurringCandidate,
  Transaction,
  TransactionType,
  TrendMonth,
} from '../types'
import {
  addMonthsToMonthKey,
  buildExpectedDateKey,
  compareMonthKeys,
  getCurrentMonthKey,
  getLastDayOfMonth,
  getLocalDateKey,
  getRemainingMonthTime,
} from './monthKeys'
import { normalizeProjectionDescription } from './projectionExclusions'

const PROJECTION_HORIZON_MONTHS = 3

function getValidDateKey(transaction: Transaction): string | null {
  const date = transaction.date ?? ''
  const match = /^(?<monthKey>\d{4}-\d{2})-(?<day>\d{2})$/.exec(date)
  if (!match?.groups) {
    return null
  }

  const monthKey = match.groups.monthKey
  if (monthKey === undefined) {
    return null
  }

  const lastDay = getLastDayOfMonth(monthKey)
  const day = Number(match.groups.day)
  if (lastDay === null || day < 1 || day > lastDay) {
    return null
  }

  return date
}

function accumulateAmount(collection: Record<string, number>, key: string, amount: number): void {
  collection[key] = (collection[key] ?? 0) + amount
}

export function buildMonthSummaries(transactions: Transaction[]): MonthSummary[] {
  const monthMap = new Map<string, MonthSummary>()

  for (const transaction of transactions) {
    const date = getValidDateKey(transaction)
    if (date === null) {
      continue
    }

    const monthKey = date.slice(0, 7)
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        revenue: 0,
        expenses: 0,
        transferOut: 0,
        net: 0,
      })
    }

    const summary = monthMap.get(monthKey)
    if (!summary) {
      continue
    }

    if (transaction.type === 'Receita') {
      summary.revenue += transaction.amount
      summary.net += transaction.amount
    } else if (transaction.type === 'Transferência') {
      summary.transferOut += transaction.amount
    } else {
      summary.expenses += transaction.amount
      summary.net -= transaction.amount
    }
  }

  return [...monthMap.values()].sort((left, right) => left.monthKey.localeCompare(right.monthKey))
}

// eslint-disable-next-line complexity
function buildRecurringCandidates(transactions: Transaction[], currentMonthKey: string): RecurringCandidate[] {
  const recentMonths = Array.from({ length: 4 }, (_, index) => addMonthsToMonthKey(currentMonthKey, -index))
  const recentMonthSet = new Set(recentMonths)
  const grouped = new Map<string, { months: Set<string>; transactions: Transaction[] }>()

  for (const transaction of transactions) {
    const date = getValidDateKey(transaction)
    const monthKey = date?.slice(0, 7)
    if (
      date === null
      || monthKey === undefined
      || !recentMonthSet.has(monthKey)
      || transaction.type === 'Transferência'
      || (transaction.installment ?? '') !== ''
    ) {
      continue
    }

    const normalizedDescription = normalizeProjectionDescription(transaction.description)
    if (normalizedDescription === '') {
      continue
    }

    const key = `${transaction.type}:${normalizedDescription}`
    const current = grouped.get(key) ?? { months: new Set<string>(), transactions: [] }
    current.months.add(monthKey)
    current.transactions.push(transaction)
    grouped.set(key, current)
  }

  return [...grouped.entries()]
    .filter(([, entry]) => entry.months.size >= 2)
    .map(([key, entry]) => {
      const [type] = key.split(':') as [Exclude<TransactionType, 'Transferência'>]
      const latestTransaction = [...entry.transactions].sort((left, right) => (right.date ?? '').localeCompare(left.date ?? ''))[0]!
      const lastObservedDate = getValidDateKey(latestTransaction)!

      return {
        description: latestTransaction.description,
        normalizedDescription: normalizeProjectionDescription(latestTransaction.description),
        amount: entry.transactions.reduce((total, transaction) => total + transaction.amount, 0) / entry.transactions.length,
        type,
        category: latestTransaction.category,
        budgetGroupId: latestTransaction.budgetGroupId,
        occurrenceCount: entry.transactions.length,
        observedMonthCount: entry.months.size,
        lastObservedDate,
        expectedDayOfMonth: Number(lastObservedDate.slice(8, 10)),
      }
    })
}

function hasPersistedRecurringMatch(
  transactions: Transaction[],
  candidate: RecurringCandidate,
  monthKey: string,
): boolean {
  return transactions.some((transaction) => {
    const date = getValidDateKey(transaction)
    if (transaction.type !== candidate.type || date?.slice(0, 7) !== monthKey) {
      return false
    }

    return normalizeProjectionDescription(transaction.description) === candidate.normalizedDescription
  })
}

// eslint-disable-next-line complexity
function buildTrendMonth(
  monthKey: string,
  currentMonthKey: string,
  summaryByMonth: Map<string, MonthSummary>,
  projectionByMonth: Map<string, ProjectionMonth>,
): TrendMonth {
  const summary = summaryByMonth.get(monthKey)
  const projection = projectionByMonth.get(monthKey)

  if (compareMonthKeys(monthKey, currentMonthKey) > 0 && projection !== undefined) {
    return {
      monthKey,
      revenue: projection.revenue,
      expenses: projection.confirmedExpenses + projection.probableExpenses,
      transferOut: 0,
      net: projection.net,
      isCurrent: false,
      isProjected: true,
    }
  }

  return {
    monthKey,
    revenue: summary?.revenue ?? 0,
    expenses: summary?.expenses ?? 0,
    transferOut: summary?.transferOut ?? 0,
    net: summary?.net ?? 0,
    isCurrent: monthKey === currentMonthKey,
    isProjected: false,
  }
}

// eslint-disable-next-line max-lines-per-function, complexity
function buildOverview(
  transactions: Transaction[],
  currentMonthKey: string,
  monthSummaries: MonthSummary[],
  recurringCandidates: RecurringCandidate[],
): FinancialOverview {
  const recentMonths = monthSummaries.slice(-6)
  const currentMonthWindow = Array.from(
    { length: PROJECTION_HORIZON_MONTHS },
    (_, index) => addMonthsToMonthKey(currentMonthKey, index),
  )
  const projectedMonths: ProjectionMonth[] = currentMonthWindow.map((monthKey) => ({
    monthKey,
    revenue: 0,
    confirmedExpenses: 0,
    probableExpenses: 0,
    net: 0,
    plannedTransactionsCount: 0,
    probableTransactionsCount: 0,
    plannedByGroup: {},
    probableByGroup: {},
  }))
  const projectionByMonth = new Map(projectedMonths.map((projection) => [projection.monthKey, projection]))

  for (const transaction of transactions) {
    const date = getValidDateKey(transaction)
    const projection = date === null ? null : projectionByMonth.get(date.slice(0, 7))
    if (projection === null || projection === undefined) {
      continue
    }

    projection.plannedTransactionsCount += 1
    if (transaction.type === 'Receita') {
      projection.revenue += transaction.amount
      projection.net += transaction.amount
    } else if (transaction.type === 'Despesa') {
      projection.confirmedExpenses += transaction.amount
      projection.net -= transaction.amount
      accumulateAmount(projection.plannedByGroup, transaction.budgetGroupId ?? 'ungrouped', transaction.amount)
    }
  }

  for (const candidate of recurringCandidates) {
    for (const monthKey of currentMonthWindow) {
      if (hasPersistedRecurringMatch(transactions, candidate, monthKey)) {
        continue
      }

      const projection = projectionByMonth.get(monthKey)
      if (projection === undefined) {
        continue
      }

      if (candidate.type === 'Receita') {
        projection.revenue += candidate.amount
        projection.net += candidate.amount
      } else {
        projection.probableTransactionsCount += 1
        projection.probableExpenses += candidate.amount
        projection.net -= candidate.amount
        accumulateAmount(projection.probableByGroup, candidate.budgetGroupId ?? 'ungrouped', candidate.amount)
      }
    }
  }

  const trailingMonths = recentMonths.slice(-3)
  const averageRevenue = trailingMonths.length
    ? trailingMonths.reduce((total, month) => total + month.revenue, 0) / trailingMonths.length
    : 0
  const averageExpenses = trailingMonths.length
    ? trailingMonths.reduce((total, month) => total + month.expenses, 0) / trailingMonths.length
    : 0
  const averageNet = trailingMonths.length
    ? trailingMonths.reduce((total, month) => total + month.net, 0) / trailingMonths.length
    : 0
  const summaryByMonth = new Map(monthSummaries.map((summary) => [summary.monthKey, summary]))
  const trendMonths = Array.from({ length: 5 }, (_, index) => addMonthsToMonthKey(currentMonthKey, index - 2))
    .map((monthKey) => buildTrendMonth(monthKey, currentMonthKey, summaryByMonth, projectionByMonth))

  return {
    currentMonthKey,
    recentMonths,
    trendMonths,
    projectedMonths,
    averageRevenue,
    averageExpenses,
    averageNet,
    plannedCommitments: projectedMonths.reduce((total, month) => total + month.confirmedExpenses, 0),
    probableCommitments: projectedMonths.reduce((total, month) => total + month.probableExpenses, 0),
  }
}

function sortProjectionItems(items: ProjectionLineItem[]): ProjectionLineItem[] {
  const typeOrder: Record<ProjectionLineItem['type'], number> = { Receita: 0, Despesa: 1 }

  return [...items].sort((left, right) => (
    left.date.localeCompare(right.date)
    || typeOrder[left.type] - typeOrder[right.type]
    || right.amount - left.amount
    || left.description.localeCompare(right.description, 'pt-BR')
  ))
}

function buildRegisteredItems(
  transactions: Transaction[],
  budgetGroupsById: Map<string, BudgetGroup>,
  monthKey: string,
  isCurrentMonth: boolean,
  todayKey: string,
): ProjectionLineItem[] {
  // eslint-disable-next-line complexity
  const items = transactions.flatMap((transaction): ProjectionLineItem[] => {
    const date = getValidDateKey(transaction)
    if (date === null) {
      return []
    }
    if (
      date.slice(0, 7) !== monthKey
      || transaction.type === 'Transferência'
      || (isCurrentMonth && date <= todayKey)
    ) {
      return []
    }

    return [{
      id: transaction.id,
      kind: 'registered',
      date,
      isDateEstimated: false,
      description: transaction.description,
      normalizedDescription: normalizeProjectionDescription(transaction.description),
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      budgetGroupId: transaction.budgetGroupId,
      budgetGroupName: transaction.budgetGroupId !== null
        ? (budgetGroupsById.get(transaction.budgetGroupId)?.name ?? 'Sem grupo')
        : 'Sem grupo',
      installment: transaction.installment === undefined || transaction.installment === ''
        ? null
        : transaction.installment,
      basis: null,
    }]
  })

  return sortProjectionItems(items)
}

function buildProbableItems(
  transactions: Transaction[],
  candidates: RecurringCandidate[],
  budgetGroupsById: Map<string, BudgetGroup>,
  monthKey: string,
  isCurrentMonth: boolean,
  todayKey: string,
): ProjectionLineItem[] {
  const items = candidates.flatMap((candidate): ProjectionLineItem[] => {
    if (hasPersistedRecurringMatch(transactions, candidate, monthKey)) {
      return []
    }

    const expectedDate = buildExpectedDateKey(monthKey, candidate.expectedDayOfMonth)
    if (expectedDate === null || (isCurrentMonth && expectedDate < todayKey)) {
      return []
    }

    return [{
      id: `probable:${monthKey}:${candidate.type}:${candidate.normalizedDescription}`,
      kind: 'probable',
      date: expectedDate,
      isDateEstimated: true,
      description: candidate.description,
      normalizedDescription: candidate.normalizedDescription,
      amount: candidate.amount,
      type: candidate.type,
      category: candidate.category,
      budgetGroupId: candidate.budgetGroupId,
      budgetGroupName: candidate.budgetGroupId !== null
        ? (budgetGroupsById.get(candidate.budgetGroupId)?.name ?? 'Sem grupo')
        : 'Sem grupo',
      installment: null,
      basis: {
        averageAmount: candidate.amount,
        occurrenceCount: candidate.occurrenceCount,
        observedMonthCount: candidate.observedMonthCount,
        lastObservedDate: candidate.lastObservedDate,
      },
    }]
  })

  return sortProjectionItems(items)
}

function buildProjectionTotals(items: ProjectionLineItem[]): MonthlyProjectionTotals {
  const totals: MonthlyProjectionTotals = {
    registeredRevenue: 0,
    probableRevenue: 0,
    registeredExpenses: 0,
    probableExpenses: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    remainingNet: 0,
  }

  for (const item of items) {
    const origin = item.kind === 'registered' ? 'registered' : 'probable'
    if (item.type === 'Receita') {
      totals[origin === 'registered' ? 'registeredRevenue' : 'probableRevenue'] += item.amount
      totals.totalRevenue += item.amount
    } else {
      totals[origin === 'registered' ? 'registeredExpenses' : 'probableExpenses'] += item.amount
      totals.totalExpenses += item.amount
    }
  }

  totals.remainingNet = totals.totalRevenue - totals.totalExpenses
  return totals
}

function buildGroupSummaries(
  items: ProjectionLineItem[],
  budgetGroups: BudgetGroup[],
): ProjectionGroupSummary[] {
  const summaries = new Map<string, ProjectionGroupSummary>()

  for (const item of items) {
    if (item.type !== 'Despesa') {
      continue
    }

    const key = item.budgetGroupId ?? 'ungrouped'
    const summary = summaries.get(key) ?? {
      budgetGroupId: item.budgetGroupId,
      budgetGroupName: item.budgetGroupName,
      registeredAmount: 0,
      probableAmount: 0,
      totalAmount: 0,
      itemCount: 0,
    }
    if (item.kind === 'registered') {
      summary.registeredAmount += item.amount
    } else {
      summary.probableAmount += item.amount
    }
    summary.totalAmount += item.amount
    summary.itemCount += 1
    summaries.set(key, summary)
  }

  const groupOrder = new Map(budgetGroups.map((group, index) => [group.id, index]))
  return [...summaries.values()].sort((left, right) => {
    if (left.budgetGroupId === null) {
      return 1
    }
    if (right.budgetGroupId === null) {
      return -1
    }
    return (groupOrder.get(left.budgetGroupId) ?? Number.MAX_SAFE_INTEGER)
      - (groupOrder.get(right.budgetGroupId) ?? Number.MAX_SAFE_INTEGER)
  })
}

function buildCategorySummaries(items: ProjectionLineItem[]): ProjectionCategorySummary[] {
  const summaries = new Map<string, ProjectionCategorySummary>()

  for (const item of items) {
    const key = `${item.type}:${item.category}`
    const summary = summaries.get(key) ?? {
      type: item.type,
      category: item.category,
      registeredAmount: 0,
      probableAmount: 0,
      totalAmount: 0,
      itemCount: 0,
    }
    if (item.kind === 'registered') {
      summary.registeredAmount += item.amount
    } else {
      summary.probableAmount += item.amount
    }
    summary.totalAmount += item.amount
    summary.itemCount += 1
    summaries.set(key, summary)
  }

  const typeOrder: Record<ProjectionCategorySummary['type'], number> = { Receita: 0, Despesa: 1 }
  return [...summaries.values()].sort((left, right) => (
    typeOrder[left.type] - typeOrder[right.type]
    || right.totalAmount - left.totalAmount
    || left.category.localeCompare(right.category, 'pt-BR')
  ))
}

function calculateBalanceToDate(transactions: Transaction[], monthKey: string, todayKey: string): number {
  return transactions.reduce((balance, transaction) => {
    const date = getValidDateKey(transaction)
    if (date === null) {
      return balance
    }
    if (date.slice(0, 7) !== monthKey || date > todayKey || transaction.type === 'Transferência') {
      return balance
    }

    return balance + (transaction.type === 'Receita' ? transaction.amount : -transaction.amount)
  }, 0)
}

// eslint-disable-next-line complexity
function buildMonthlyProjectionInsight(
  transactions: Transaction[],
  budgetGroups: BudgetGroup[],
  candidates: RecurringCandidate[],
  activeMonth: string,
  currentMonthKey: string,
  now: Date,
): MonthlyProjectionInsight | null {
  if (compareMonthKeys(activeMonth, currentMonthKey) < 0) {
    return null
  }

  const isCurrentMonth = activeMonth === currentMonthKey
  const todayKey = getLocalDateKey(now)
  const budgetGroupsById = new Map(budgetGroups.map((group) => [group.id, group]))
  const registeredItems = buildRegisteredItems(
    transactions,
    budgetGroupsById,
    activeMonth,
    isCurrentMonth,
    todayKey,
  )
  const probableItems = buildProbableItems(
    transactions,
    candidates,
    budgetGroupsById,
    activeMonth,
    isCurrentMonth,
    todayKey,
  )
  const allItems = sortProjectionItems([...registeredItems, ...probableItems])
  const totals = buildProjectionTotals(allItems)
  const balanceToDate = isCurrentMonth ? calculateBalanceToDate(transactions, activeMonth, todayKey) : null
  const availableToSpend = balanceToDate === null ? null : balanceToDate + totals.remainingNet
  const remainingTime = isCurrentMonth ? getRemainingMonthTime(now) : null
  const weeklyBalance = availableToSpend !== null && remainingTime !== null && remainingTime.weeksRemaining > 0
    ? availableToSpend / remainingTime.weeksRemaining
    : null

  return {
    monthKey: activeMonth,
    isCurrentMonth,
    hasProjection: allItems.length > 0,
    totals,
    balanceToDate,
    availableToSpend,
    daysRemaining: remainingTime?.daysRemaining ?? null,
    weeksRemaining: remainingTime?.weeksRemaining ?? null,
    weeklyBalance,
    weeklySpendingSuggestion: weeklyBalance === null ? null : Math.max(0, weeklyBalance),
    registeredItems,
    probableItems,
    removedProbableItems: [],
    groupSummaries: buildGroupSummaries(allItems, budgetGroups),
    categorySummaries: buildCategorySummaries(allItems),
  }
}

export function buildFinancialAnalysis(
  transactions: Transaction[],
  budgetGroups: BudgetGroup[],
  activeMonth: string,
  now = new Date(),
): FinancialAnalysis {
  const currentMonthKey = getCurrentMonthKey(now)
  const monthSummaries = buildMonthSummaries(transactions)
  const recurringCandidates = buildRecurringCandidates(transactions, currentMonthKey)

  return {
    overview: buildOverview(transactions, currentMonthKey, monthSummaries, recurringCandidates),
    monthlyProjectionInsight: buildMonthlyProjectionInsight(
      transactions,
      budgetGroups,
      recurringCandidates,
      activeMonth,
      currentMonthKey,
      now,
    ),
  }
}

export function buildFinancialOverview(
  transactions: Transaction[],
  budgetGroups: BudgetGroup[],
  now = new Date(),
): FinancialOverview {
  return buildFinancialAnalysis(
    transactions,
    budgetGroups,
    getCurrentMonthKey(now),
    now,
  ).overview
}
