import { toCurrency } from '../lib/formatters'
import type {
  MonthlyProjectionInsight,
  ProjectionCategorySummary,
  ProjectionGroupSummary,
} from '../types'

type MonthlyProjectionBreakdownProps = {
  insight: MonthlyProjectionInsight
}

type SummaryRow = {
  itemCount: number
  label: string
  probableAmount: number
  registeredAmount: number
  totalAmount: number
}

type ProjectionSummaryTableProps = {
  caption: string
  rows: SummaryRow[]
}

function itemCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'item' : 'itens'}`
}

function ProjectionSummaryTable({ caption, rows }: ProjectionSummaryTableProps) {
  return (
    <div className="table-wrap monthly-projection-table-wrap">
      <table className="summary-table monthly-projection-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Registrado</th>
            <th>Provável</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">
                <span>{row.label}</span>
                <small>{itemCountLabel(row.itemCount)}</small>
              </th>
              <td>{toCurrency(row.registeredAmount)}</td>
              <td>{toCurrency(row.probableAmount)}</td>
              <td><strong>{toCurrency(row.totalAmount)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function groupRows(groups: ProjectionGroupSummary[]): SummaryRow[] {
  return groups.map((group) => ({
    label: group.budgetGroupName,
    registeredAmount: group.registeredAmount,
    probableAmount: group.probableAmount,
    totalAmount: group.totalAmount,
    itemCount: group.itemCount,
  }))
}

function categoryRows(categories: ProjectionCategorySummary[]): SummaryRow[] {
  return categories.map((category) => ({
    label: category.category,
    registeredAmount: category.registeredAmount,
    probableAmount: category.probableAmount,
    totalAmount: category.totalAmount,
    itemCount: category.itemCount,
  }))
}

export function MonthlyProjectionBreakdown({ insight }: MonthlyProjectionBreakdownProps) {
  const headingId = `monthly-projection-breakdown-${insight.monthKey}`
  const revenueCategories = insight.categorySummaries.filter((summary) => summary.type === 'Receita')
  const expenseCategories = insight.categorySummaries.filter((summary) => summary.type === 'Despesa')

  return (
    <section className="panel monthly-projection-breakdown" aria-labelledby={headingId}>
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Composição</div>
          <h2 id={headingId}>Resumo da projeção</h2>
        </div>
      </div>

      <div className="monthly-projection-breakdown-grid">
        <section aria-labelledby={`${headingId}-groups`}>
          <h3 id={`${headingId}-groups`}>Despesas por grupo</h3>
          {insight.groupSummaries.length > 0 ? (
            <ProjectionSummaryTable
              caption="Resumo de despesas por grupo de orçamento"
              rows={groupRows(insight.groupSummaries)}
            />
          ) : (
            <p className="projection-empty-copy">Receitas não pertencem a grupos de orçamento.</p>
          )}
        </section>

        <section aria-labelledby={`${headingId}-revenue-categories`}>
          <h3 id={`${headingId}-revenue-categories`}>Receitas por categoria</h3>
          {revenueCategories.length > 0 ? (
            <ProjectionSummaryTable
              caption="Resumo de receitas por categoria"
              rows={categoryRows(revenueCategories)}
            />
          ) : (
            <p className="projection-empty-copy">Nenhuma receita restante nesta projeção.</p>
          )}
        </section>

        <section aria-labelledby={`${headingId}-expense-categories`}>
          <h3 id={`${headingId}-expense-categories`}>Despesas por categoria</h3>
          {expenseCategories.length > 0 ? (
            <ProjectionSummaryTable
              caption="Resumo de despesas por categoria"
              rows={categoryRows(expenseCategories)}
            />
          ) : (
            <p className="projection-empty-copy">Nenhuma despesa restante nesta projeção.</p>
          )}
        </section>
      </div>
    </section>
  )
}
