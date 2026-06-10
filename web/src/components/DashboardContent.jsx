import { BudgetGroupManager } from './BudgetGroupManager'
import { CategorySection } from './CategorySection'
import { SummaryTable } from './SummaryTable'
import { TransactionTable } from './TransactionTable'

function EmptyTransactionsState() {
  return (
    <section className="panel">
      <h2>Nenhum lançamento no período</h2>
      <p className="muted">Importe dados ou cadastre transações para começar a preencher o painel.</p>
    </section>
  )
}

export function DashboardContent({
  activeMonth,
  budgetGroups,
  categoryOptions,
  createBudgetGroup,
  deleteBudgetGroup,
  filteredTransactions,
  groupOptions,
  handleEditTransaction,
  monthData,
  onFiltersChange,
  savingGroupId,
  savingId,
  transactionFilters,
  typeOptions,
  updateBudgetGroup,
}) {
  return (
    <>
      <BudgetGroupManager
        budgetGroups={budgetGroups}
        orphanedCount={monthData?.orphanedCount ?? 0}
        savingGroupId={savingGroupId}
        onCreate={createBudgetGroup}
        onUpdate={updateBudgetGroup}
        onDelete={deleteBudgetGroup}
      />
      {monthData ? (
        <>
          <SummaryTable monthKey={activeMonth} monthData={monthData} />
          {monthData.orphanedCount ? (
            <p className="feedback warning">
              {monthData.orphanedCount} transações confirmadas estão sem grupo e fora dos totais por budget group.
            </p>
          ) : null}
          <div className="grid two-up">
            {monthData.groupOrder.map((groupId) => (
              <CategorySection key={groupId} group={monthData.groups[groupId]} revenue={monthData.revenue} />
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
        <EmptyTransactionsState />
      )}
    </>
  )
}
