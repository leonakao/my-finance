import { GROUP_LABELS } from '../constants'

export function isExpenseGroup(group) {
  return GROUP_LABELS.includes(group)
}

export function matchesFilter(value, filter) {
  return filter === 'all' || value === filter
}

export function nextGroupForType(type, currentGroup) {
  if (type === 'Receita') {
    return 'Receita'
  }
  if (type === 'Transferência') {
    return isExpenseGroup(currentGroup) ? 'Transferência' : currentGroup || 'Transferência'
  }
  return isExpenseGroup(currentGroup) ? currentGroup : 'Desejos'
}

export function normalizeTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description ?? '',
    amount: Number(row.amount ?? 0),
    type: row.type ?? 'Despesa',
    category: row.category ?? 'Outros',
    budgetGroup: row.budget_group ?? 'Desejos',
    account: row.account ?? '',
    institution: row.institution ?? '',
    status: row.status ?? 'Confirmado',
    notes: row.notes ?? '',
  }
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

export function buildMonthData(transactions) {
  const monthMap = new Map()

  for (const transaction of transactions) {
    if (!transaction.date) {
      continue
    }

    const month = transaction.date.slice(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, {
        revenue: 0,
        groups: {
          Necessidades: { total: 0, byCategory: {}, transactions: [] },
          Desejos: { total: 0, byCategory: {}, transactions: [] },
          Futuro: { total: 0, byCategory: {}, transactions: [] },
        },
      })
    }

    const bucket = monthMap.get(month)
    if (transaction.status !== 'Confirmado') {
      continue
    }

    if (transaction.type === 'Receita' || transaction.budgetGroup === 'Receita') {
      bucket.revenue += transaction.amount
      continue
    }

    if (!GROUP_LABELS.includes(transaction.budgetGroup)) {
      continue
    }

    const group = bucket.groups[transaction.budgetGroup]
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
    if (!matchesFilter(transaction.budgetGroup, filters.group)) {
      return false
    }

    return true
  })
}

export function getTransactionOptions(monthTransactions) {
  return {
    typeOptions: [...new Set(monthTransactions.map((transaction) => transaction.type))].sort(),
    categoryOptions: [...new Set(monthTransactions.map((transaction) => transaction.category))].sort(),
    groupOptions: [...new Set(monthTransactions.map((transaction) => transaction.budgetGroup))].sort(),
  }
}
