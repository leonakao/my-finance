import { monthLabel, dateLabel, toCurrency } from '../lib/formatters'
import type {
  MonthlyProjectionInsight,
  ProjectionLineItem,
  RemovedProjectionItem,
} from '../types'

type MonthlyProjectionItemsProps = {
  insight: MonthlyProjectionInsight
  onRemoveProbableItem: (item: ProjectionLineItem) => void
  onRestoreExclusion: (id: string) => void
  onToggleRemovedPanel: (expanded: boolean) => void
  removedPanelExpanded: boolean
  savingProjectionExclusionId: string
}

function registeredBadgeLabel(item: ProjectionLineItem): string {
  if (item.sourceKind === 'manual_recurring') {
    return 'Planejado recorrente'
  }

  if (item.sourceKind === 'imported_installment') {
    return 'Planejado parcelado'
  }

  if (item.sourceKind === 'imported_statement' || item.sourceKind === 'imported_card') {
    return 'Registrado importado'
  }

  return 'Registrado'
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
                <small className="projection-origin-badge is-registered">{registeredBadgeLabel(item)}</small>
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

function ProbableItemsTable({
  items,
  onRemoveProbableItem,
}: {
  items: ProjectionLineItem[]
  onRemoveProbableItem: (item: ProjectionLineItem) => void
}) {
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
            <th>Ações</th>
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
              <td>
                <button
                  type="button"
                  className="ghost projection-inline-action"
                  aria-label={`Remover ${item.description} da projeção`}
                  onClick={() => onRemoveProbableItem(item)}
                >
                  Remover da projeção…
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function countDistinctRemovedItems(items: RemovedProjectionItem[]) {
  return new Set(items.map(({ exclusion }) => `${exclusion.type}:${exclusion.normalizedDescription}`)).size
}

function removedScopeLabel(item: RemovedProjectionItem) {
  const month = monthLabel(item.exclusion.monthStart.slice(0, 7))
  return item.exclusion.scope === 'month' ? `Somente em ${month}` : `Desde ${month}`
}

function RemovedItemsDisclosure({
  items,
  monthKey,
  onRestoreExclusion,
  onToggleRemovedPanel,
  removedPanelExpanded,
  savingProjectionExclusionId,
}: {
  items: RemovedProjectionItem[]
  monthKey: string
  onRestoreExclusion: (id: string) => void
  onToggleRemovedPanel: (expanded: boolean) => void
  removedPanelExpanded: boolean
  savingProjectionExclusionId: string
}) {
  const disclosureId = `monthly-projection-removed-${monthKey}`
  const hiddenCount = countDistinctRemovedItems(items)
  const countLabel = hiddenCount === 1 ? 'Ocultando 1 estimativa' : `Ocultando ${hiddenCount} estimativas`

  return (
    <div className="projection-removed-disclosure">
      <button
        type="button"
        className="ghost projection-removed-toggle"
        aria-controls={disclosureId}
        aria-expanded={removedPanelExpanded}
        onClick={() => onToggleRemovedPanel(!removedPanelExpanded)}
      >
        <span>{countLabel}</span>
        <small aria-hidden="true">{removedPanelExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}</small>
      </button>

      {removedPanelExpanded ? (
        <div
          id={disclosureId}
          className="projection-removed-panel"
          role="region"
          aria-label={`Estimativas removidas de ${monthLabel(monthKey)}`}
        >
          <ul className="projection-removed-list">
            {items.map(({ exclusion, currentEstimate }) => {
              const saving = savingProjectionExclusionId === exclusion.id
              return (
                <li key={exclusion.id} className="projection-removed-card">
                  <div className="projection-removed-copy">
                    <strong>{exclusion.description}</strong>
                    <p>
                      {exclusion.type} · {removedScopeLabel({ exclusion, currentEstimate })}
                    </p>
                    {currentEstimate ? (
                      <p>Valor médio atual: {toCurrency(currentEstimate.amount)}</p>
                    ) : (
                      <p>A recorrência não está mais sendo estimada.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ghost projection-inline-action"
                    aria-label={`Restaurar ${exclusion.description} na projeção`}
                    disabled={saving}
                    onClick={() => onRestoreExclusion(exclusion.id)}
                  >
                    {saving ? <span className="button-spinner" aria-hidden="true" /> : null}
                    Restaurar
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function MonthlyProjectionItems({
  insight,
  onRemoveProbableItem,
  onRestoreExclusion,
  onToggleRemovedPanel,
  removedPanelExpanded,
  savingProjectionExclusionId,
}: MonthlyProjectionItemsProps) {
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
          <ProbableItemsTable
            items={insight.probableItems}
            onRemoveProbableItem={onRemoveProbableItem}
          />
        ) : (
          <p className="projection-empty-copy">Nenhuma recorrência provável identificada.</p>
        )}
        {insight.removedProbableItems.length > 0 ? (
          <RemovedItemsDisclosure
            items={insight.removedProbableItems}
            monthKey={insight.monthKey}
            onRestoreExclusion={onRestoreExclusion}
            onToggleRemovedPanel={onToggleRemovedPanel}
            removedPanelExpanded={removedPanelExpanded}
            savingProjectionExclusionId={savingProjectionExclusionId}
          />
        ) : null}
      </section>
    </section>
  )
}
