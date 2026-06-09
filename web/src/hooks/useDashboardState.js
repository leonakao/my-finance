import {
  buildMonthData,
  decorateTransactions,
  filterTransactions,
  getMonthTransactions,
  getTransactionOptions,
} from '../lib/transactions'

export function useDashboardState(budgetGroups, transactions, selectedMonth, transactionFilters) {
  const visibleTransactions = decorateTransactions(transactions, budgetGroups)
  const monthMap = buildMonthData(visibleTransactions, budgetGroups)
  const months = [...monthMap.keys()].sort().reverse()
  const activeMonth = selectedMonth || months[0] || ''
  const monthData = activeMonth ? monthMap.get(activeMonth) : null
  const monthTransactions = getMonthTransactions(visibleTransactions, activeMonth)
  const filteredTransactions = filterTransactions(monthTransactions, transactionFilters)
  const { typeOptions, categoryOptions, groupOptions } = getTransactionOptions(monthTransactions, budgetGroups)

  return {
    activeMonth,
    monthData,
    filteredTransactions,
    months,
    typeOptions,
    categoryOptions,
    groupOptions,
  }
}
