import type { BudgetGroup, GroupOption, MonthData, Transaction, TransactionFilters, TransactionType } from '../types'
import {
  buildMonthData,
  decorateTransactions,
  filterTransactions,
  getMonthTransactions,
  getTransactionOptions,
} from '../lib/transactions'

export function useDashboardState(
  budgetGroups: BudgetGroup[],
  transactions: Transaction[],
  selectedMonth: string,
  transactionFilters: TransactionFilters,
): {
  activeMonth: string
  monthData: MonthData | null
  filteredTransactions: ReturnType<typeof filterTransactions>
  months: string[]
  typeOptions: TransactionType[]
  categoryOptions: string[]
  groupOptions: GroupOption[]
} {
  const visibleTransactions = decorateTransactions(transactions, budgetGroups)
  const monthMap = buildMonthData(visibleTransactions, budgetGroups)
  const months = [...monthMap.keys()].sort().reverse()
  const activeMonth = selectedMonth !== '' ? selectedMonth : (months[0] ?? '')
  const monthData = activeMonth ? (monthMap.get(activeMonth) ?? null) : null
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
