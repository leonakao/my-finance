import type { DecoratedTransaction, GroupOption, MonthData, TransactionFilters, TransactionType } from '../types'
import { isFutureMonth } from '../lib/transactions'
import { CategorySection } from './CategorySection'
import { SummaryTable } from './SummaryTable'
import { TransactionTable } from './TransactionTable'

function EmptyTransactionsState({ futureMonth }: { futureMonth: boolean }) {
  return (
    <section className="panel">
      <h2>{futureMonth ? 'Nenhum lançamento previsto' : 'Nenhum lançamento no período'}</h2>
      <p className="muted">
        {futureMonth
          ? 'Ainda não há transações futuras persistidas para este mês.'
          : 'Importe dados ou cadastre transações para começar a preencher o painel.'}
      </p>
    </section>
  )
}

type DashboardContentProps = {
  activeMonth: string
  categoryOptions: string[]
  filteredTransactions: DecoratedTransaction[]
  groupOptions: GroupOption[]
  handleEditTransaction: (transactionId: string) => void
  monthData: MonthData | null
  onFiltersChange: (field: keyof TransactionFilters, value: string) => void
  savingId: string
  transactionFilters: TransactionFilters
  typeOptions: TransactionType[]
}

export function DashboardContent({
  activeMonth,
  categoryOptions,
  filteredTransactions,
  groupOptions,
  handleEditTransaction,
  monthData,
  onFiltersChange,
  savingId,
  transactionFilters,
  typeOptions,
}: DashboardContentProps) {
  const futureMonth = isFutureMonth(activeMonth)

  return (
    <>
      {monthData ? (
        <>
          <SummaryTable monthKey={activeMonth} monthData={monthData} />
          {monthData.orphanedCount ? (
            <p className="feedback warning" role="status">
              {monthData.orphanedCount} transações confirmadas estão sem grupo e fora dos totais por budget group.
            </p>
          ) : null}
          <div className="grid two-up">
            {monthData.groupOrder.map((groupId) => (
              <CategorySection key={groupId} group={monthData.groups[groupId]!} revenue={monthData.revenue} />
            ))}
          </div>
          <TransactionTable
            transactions={filteredTransactions}
            savingId={savingId}
            onEdit={handleEditTransaction}
            filters={transactionFilters}
            onFiltersChange={onFiltersChange}
            typeOptions={typeOptions}
            categoryOptions={categoryOptions}
            groupOptions={groupOptions}
          />
        </>
      ) : (
        <EmptyTransactionsState futureMonth={futureMonth} />
      )}
    </>
  )
}
