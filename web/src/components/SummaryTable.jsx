import { GROUP_LABELS, GROUP_TARGETS } from '../constants'
import { monthLabel, toCurrency, toPercent } from '../lib/formatters'

export function SummaryTable({ monthKey, monthData }) {
  const rows = GROUP_LABELS.map((group) => {
    const total = monthData.groups[group].total
    const percent = monthData.revenue ? (total / monthData.revenue) * 100 : 0
    const target = GROUP_TARGETS[group]

    return {
      group,
      total,
      percent,
      target,
      difference: percent - target,
    }
  })

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Resumo por grupo</div>
          <h2>{monthLabel(monthKey)}</h2>
        </div>
        <div className="revenue-chip">
          Receita do mes
          <strong>{toCurrency(monthData.revenue)}</strong>
        </div>
      </div>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Total gasto</th>
            <th>% da receita</th>
            <th>Meta</th>
            <th>Diferenca</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.group}>
              <td>{row.group}</td>
              <td>{toCurrency(row.total)}</td>
              <td>{toPercent(row.percent)}</td>
              <td>{toPercent(row.target)}</td>
              <td className={row.difference > 0 ? 'positive' : 'negative'}>{toPercent(row.difference)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
