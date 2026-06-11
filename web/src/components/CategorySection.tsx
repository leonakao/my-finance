import type { MonthGroupBucket } from '../types'
import { toCurrency, toPercent } from '../lib/formatters'

type CategorySectionProps = {
  group: MonthGroupBucket
  revenue: number
}

export function CategorySection({ group, revenue }: CategorySectionProps) {
  const rows = Object.entries(group.byCategory)
    .map(([category, total]) => ({
      category,
      total,
      percent: revenue ? (total / revenue) * 100 : 0,
    }))
    .sort((left, right) => right.total - left.total)

  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Categorias</div>
          <h3>{group.name}</h3>
        </div>
      </div>
      <div className="table-wrap">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Total alocado</th>
              <th>% da receita</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={`${group.id}-${row.category}`}>
                  <td>{row.category}</td>
                  <td>{toCurrency(row.total)}</td>
                  <td>{toPercent(row.percent)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="empty-cell">
                  Nenhum lançamento neste grupo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
