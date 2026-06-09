import { toCurrency, toPercent } from '../lib/formatters'

export function CategorySection({ group, monthData }) {
  const rows = Object.entries(monthData.groups[group].byCategory)
    .map(([category, total]) => ({
      category,
      total,
      percent: monthData.revenue ? (total / monthData.revenue) * 100 : 0,
    }))
    .sort((left, right) => right.total - left.total)

  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">{group}</div>
          <h3>Categorias</h3>
        </div>
      </div>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Total gasto</th>
            <th>% da receita</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={`${group}-${row.category}`}>
                <td>{row.category}</td>
                <td>{toCurrency(row.total)}</td>
                <td>{toPercent(row.percent)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="empty-cell">
                Nenhum lancamento neste grupo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
