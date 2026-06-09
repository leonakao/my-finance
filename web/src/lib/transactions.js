import { UNGROUPED_FILTER_VALUE } from '../constants'

export function matchesFilter(value, filter) {
  return filter === 'all' || value === filter
}

export function nextBudgetGroupIdForType(type, currentBudgetGroupId) {
  if (type === 'Receita') {
    return null
  }

  return currentBudgetGroupId ?? null
}

export function normalizeBudgetGroup(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    targetPercentage: Number(row.target_percentage ?? 0),
  }
}

export function normalizeTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description ?? '',
    amount: Number(row.amount ?? 0),
    type: row.type ?? 'Despesa',
    category: row.category ?? 'Outros',
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
      needsReclassification: transaction.type !== 'Receita' && transaction.budgetGroupId === null,
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
      bucket.orphanedTotal += transaction.amount
      bucket.orphanedCount += 1
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
