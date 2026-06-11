import type { BudgetGroup, GroupOption, MonthData, Transaction, TransactionFilters, TransactionType } from '../types'
import {
  buildFinancialOverview,
  buildMonthRange,
  buildMonthData,
  decorateTransactions,
  filterTransactions,
  getMonthTransactions,
  getTransactionOptions,
  getCurrentMonthKey,
} from '../lib/transactions'

export function useDashboardState(
  budgetGroups: BudgetGroup[],
  transactions: Transaction[],
  selectedMonth: string,
  transactionFilters: TransactionFilters,
): {
  activeMonth: string
  currentMonth: string
  financialOverview: ReturnType<typeof buildFinancialOverview>
  monthData: MonthData | null
  filteredTransactions: ReturnType<typeof filterTransactions>
  months: string[]
  typeOptions: TransactionType[]
  categoryOptions: string[]
  groupOptions: GroupOption[]
} {
  const currentMonth = getCurrentMonthKey()
  const visibleTransactions = decorateTransactions(transactions, budgetGroups)
  const monthMap = buildMonthData(visibleTransactions, budgetGroups)
  const months = buildMonthRange(transactions)
  const activeMonth = selectedMonth !== '' ? selectedMonth : currentMonth
  const monthData = activeMonth ? (monthMap.get(activeMonth) ?? null) : null
  const monthTransactions = getMonthTransactions(visibleTransactions, activeMonth)
  const filteredTransactions = filterTransactions(monthTransactions, transactionFilters)
  const { typeOptions, categoryOptions, groupOptions } = getTransactionOptions(monthTransactions, budgetGroups)
  const financialOverview = buildFinancialOverview(transactions, budgetGroups)

  return {
    activeMonth,
    currentMonth,
    financialOverview,
    monthData,
    filteredTransactions,
    months,
    typeOptions,
    categoryOptions,
    groupOptions,
  }
}
