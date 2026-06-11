import { dateLabel, toCurrency } from '../lib/formatters'
import type { MonthlyProjectionInsight, ProjectionLineItem } from '../types'

type MonthlyProjectionItemsProps = {
  insight: MonthlyProjectionInsight
}

function RegisteredItemsTable({ items }: { items: ProjectionLineItem[] }) {
  return (
    <div className="table-wrap monthly-projection-items-wrap">
      <table className="monthly-projection-items-table">
        <caption className="sr-only">Lançamentos registrados restantes</caption>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Categoria</th>
            <th>Grupo</th>
            <th>Parcela</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{dateLabel(item.date)}</td>
              <th scope="row" className="projection-description">
                <span>{item.description}</span>
                <small className="projection-origin-badge is-registered">Registrado</small>
              </th>
              <td>{item.type}</td>
              <td>{item.category}</td>
              <td>{item.budgetGroupName}</td>
              <td>{item.installment ?? '—'}</td>
              <td className="projection-amount">{toCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function basisLabel(item: ProjectionLineItem): string {
  if (item.basis === null) {
    return ''
  }

  const occurrences = `${item.basis.occurrenceCount} ${item.basis.occurrenceCount === 1 ? 'ocorrência' : 'ocorrências'}`
  const months = `${item.basis.observedMonthCount} ${item.basis.observedMonthCount === 1 ? 'mês' : 'meses'}`
  return `${occurrences} em ${months} · Última em ${dateLabel(item.basis.lastObservedDate)}`
}

function ProbableItemsTable({ items }: { items: ProjectionLineItem[] }) {
  return (
    <div className="table-wrap monthly-projection-items-wrap">
      <table className="monthly-projection-items-table">
        <caption className="sr-only">Estimativas prováveis</caption>
        <thead>
          <tr>
            <th>Data estimada</th>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Categoria</th>
            <th>Grupo</th>
            <th>Base da estimativa</th>
            <th>Valor médio</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{dateLabel(item.date)} estimada</td>
              <th scope="row" className="projection-description">
                <span>{item.description}</span>
                <small className="projection-origin-badge is-probable">Provável</small>
              </th>
              <td>{item.type}</td>
              <td>{item.category}</td>
              <td>{item.budgetGroupName}</td>
              <td className="projection-basis">{basisLabel(item)}</td>
              <td className="projection-amount">{toCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MonthlyProjectionItems({ insight }: MonthlyProjectionItemsProps) {
  const headingId = `monthly-projection-items-${insight.monthKey}`

  return (
    <section className="panel monthly-projection-items" aria-labelledby={headingId}>
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Detalhes</div>
          <h2 id={headingId}>Itens que compõem a projeção</h2>
        </div>
      </div>

      <section className="monthly-projection-item-section" aria-labelledby={`${headingId}-registered`}>
        <h3 id={`${headingId}-registered`}>Lançamentos registrados restantes</h3>
        {insight.registeredItems.length > 0 ? (
          <RegisteredItemsTable items={insight.registeredItems} />
        ) : (
          <p className="projection-empty-copy">Nenhum lançamento registrado restante.</p>
        )}
      </section>

      <section className="monthly-projection-item-section" aria-labelledby={`${headingId}-probable`}>
        <h3 id={`${headingId}-probable`}>Estimativas prováveis</h3>
        {insight.probableItems.length > 0 ? (
          <ProbableItemsTable items={insight.probableItems} />
        ) : (
          <p className="projection-empty-copy">Nenhuma recorrência provável identificada.</p>
        )}
      </section>
    </section>
  )
}
