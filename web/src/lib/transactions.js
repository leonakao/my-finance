import { CATEGORY_OPTIONS_BY_TYPE, DEFAULT_CATEGORY_BY_TYPE, UNGROUPED_FILTER_VALUE } from '../constants'

export function matchesFilter(value, filter) {
  return filter === 'all' || value === filter
}

export function nextBudgetGroupIdForType(type, currentBudgetGroupId) {
  if (type === 'Receita') {
    return null
  }

  return currentBudgetGroupId ?? null
}

export function getCategoryOptionsForType(type) {
  return CATEGORY_OPTIONS_BY_TYPE[type] ?? CATEGORY_OPTIONS_BY_TYPE.Despesa
}

export function getDefaultCategoryForType(type) {
  return DEFAULT_CATEGORY_BY_TYPE[type] ?? DEFAULT_CATEGORY_BY_TYPE.Despesa
}

export function normalizeCategoryForType(type, category) {
  const options = getCategoryOptionsForType(type)
  return options.includes(category) ? category : getDefaultCategoryForType(type)
}

export function normalizeBudgetGroup(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    targetPercentage: Number(row.target_percentage ?? 0),
  }
}

export function normalizeRuleDescription(description) {
  return String(description ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function getClassificationSnapshot(transaction) {
  return {
    type: transaction.type ?? 'Despesa',
    category: normalizeCategoryForType(transaction.type ?? 'Despesa', transaction.category ?? 'Outros'),
    budget_group_id: transaction.budgetGroupId ?? transaction.budget_group_id ?? null,
  }
}

export function classificationSnapshotsEqual(left, right) {
  return left.type === right.type && left.category === right.category && (left.budget_group_id ?? null) === (right.budget_group_id ?? null)
}

function normalizeRuleMatchAmount(value) {
  return value === null || value === undefined ? null : Number(value)
}

export function normalizeClassificationRule(row) {
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

export function sortClassificationRules(rules) {
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

export function getRuleDescriptionWarning(description) {
  const normalized = normalizeRuleDescription(description)
  if (normalized.length < 4) {
    return 'Descrições muito curtas podem classificar transações demais.'
  }

  if (!normalized.includes(' ') && normalized.length < 6) {
    return 'Descrições muito genéricas podem gerar matches parciais amplos.'
  }

  return ''
}

function normalizeRuleMatchMode(rule) {
  return rule.matchMode ?? rule.match_mode ?? 'description'
}

function normalizeRuleMatchDescriptionNormalized(rule) {
  return rule.matchDescriptionNormalized
    ?? rule.match_description_normalized
    ?? normalizeRuleDescription(rule.matchDescription ?? rule.match_description ?? '')
}

function normalizeRuleMatchAmountFromRule(rule) {
  const value = rule.matchAmount ?? rule.match_amount
  return value === null || value === undefined ? null : Number(value)
}

export function doesClassificationRuleMatchTransaction(transaction, rule) {
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

export function applyClassificationRulesToTransaction(transaction, rules) {
  const matchedRule = rules.find((rule) => doesClassificationRuleMatchTransaction(transaction, rule))
  if (!matchedRule) {
    return transaction
  }

  const nextType = matchedRule.type ?? transaction.type ?? 'Despesa'
  const nextCategory = normalizeCategoryForType(nextType, matchedRule.category ?? transaction.category ?? 'Outros')

  return {
    ...transaction,
    type: nextType,
    category: nextCategory,
    budgetGroupId: nextType === 'Receita' ? null : (matchedRule.budgetGroupId ?? matchedRule.budget_group_id ?? null),
  }
}

export function reclassifyTransactionsWithRules(transactions, rules) {
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

export function normalizeTransaction(row) {
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

export function decorateTransactions(transactions, budgetGroups) {
  const budgetGroupsById = new Map(budgetGroups.map((budgetGroup) => [budgetGroup.id, budgetGroup]))

  return transactions.map((transaction) => {
    const budgetGroup = transaction.budgetGroupId ? (budgetGroupsById.get(transaction.budgetGroupId) ?? null) : null

    return {
      ...transaction,
      budgetGroupName: budgetGroup?.name ?? null,
      needsReclassification: transaction.type === 'Despesa' && transaction.budgetGroupId === null,
    }
  })
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const [, base64 = ''] = result.split(',')
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

function buildGroupBuckets(budgetGroups) {
  return Object.fromEntries(
    budgetGroups.map((budgetGroup) => [
      budgetGroup.id,
      {
        ...budgetGroup,
        total: 0,
        byCategory: {},
        transactions: [],
      },
    ]),
  )
}

export function buildMonthData(transactions, budgetGroups) {
  const monthMap = new Map()

  for (const transaction of transactions) {
    if (!transaction.date) {
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
    if (transaction.status !== 'Confirmado') {
      continue
    }

    if (transaction.type === 'Receita') {
      bucket.revenue += transaction.amount
      continue
    }

    if (!transaction.budgetGroupId || !bucket.groups[transaction.budgetGroupId]) {
      if (transaction.type === 'Despesa') {
        bucket.orphanedTotal += transaction.amount
        bucket.orphanedCount += 1
      }
      continue
    }

    const group = bucket.groups[transaction.budgetGroupId]
    group.total += transaction.amount
    group.transactions.push(transaction)
    group.byCategory[transaction.category] = (group.byCategory[transaction.category] || 0) + transaction.amount
  }

  return monthMap
}

export function getAvailableMonths(transactions) {
  return [...new Set(transactions.map((item) => item.date?.slice(0, 7)).filter(Boolean))].sort().reverse()
}

export function getMonthTransactions(transactions, activeMonth) {
  return transactions
    .filter((transaction) => transaction.date?.startsWith(activeMonth))
    .filter((transaction) => transaction.status === 'Confirmado')
    .sort((left, right) => right.amount - left.amount)
}

export function filterTransactions(transactions, filters) {
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

export function getTransactionOptions(monthTransactions, budgetGroups) {
  const groupOptions = budgetGroups.map((budgetGroup) => ({
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
