import { monthLabel, toCurrency } from '../lib/formatters'
import type { MonthlyProjectionInsight } from '../types'

type MonthlyProjectionSummaryProps = {
  insight: MonthlyProjectionInsight
}

type ProjectionMetricProps = {
  className?: string
  detail?: string
  label: string
  value: number
}

function ProjectionMetric({ className = '', detail, label, value }: ProjectionMetricProps) {
  return (
    <div className={`monthly-projection-metric ${className}`.trim()}>
      <dt>{label}</dt>
      <dd>{toCurrency(value)}</dd>
      {detail ? <p>{detail}</p> : null}
    </div>
  )
}

function CurrentMonthMetrics({ insight }: MonthlyProjectionSummaryProps) {
  const { totals } = insight
  const projectedBalance = insight.availableToSpend ?? 0
  const weeklySuggestion = insight.weeklySpendingSuggestion ?? 0
  const weeksRemaining = insight.weeksRemaining ?? 0

  return (
    <>
      <ProjectionMetric
        label="Saldo projetado do mês"
        value={projectedBalance}
        className={`is-primary ${projectedBalance >= 0 ? 'positive' : 'negative'}`}
      />
      <ProjectionMetric
        label="Sugestão por semana"
        value={weeklySuggestion}
        className="is-primary"
        detail={`${weeksRemaining} ${weeksRemaining === 1 ? 'semana restante' : 'semanas restantes'}`}
      />
      <ProjectionMetric label="Saldo realizado até hoje" value={insight.balanceToDate ?? 0} />
      <ProjectionMetric
        label="Receitas restantes"
        value={totals.totalRevenue}
        detail={`Registrado: ${toCurrency(totals.registeredRevenue)} · Provável: ${toCurrency(totals.probableRevenue)}`}
      />
      <ProjectionMetric label="Despesas registradas restantes" value={totals.registeredExpenses} />
      <ProjectionMetric label="Despesas prováveis" value={totals.probableExpenses} />
    </>
  )
}

function FutureMonthMetrics({ insight }: MonthlyProjectionSummaryProps) {
  const { totals } = insight

  return (
    <>
      <ProjectionMetric
        label="Saldo projetado"
        value={totals.remainingNet}
        className={`is-primary ${totals.remainingNet >= 0 ? 'positive' : 'negative'}`}
      />
      <ProjectionMetric label="Receitas registradas" value={totals.registeredRevenue} />
      <ProjectionMetric label="Receitas prováveis" value={totals.probableRevenue} />
      <ProjectionMetric label="Despesas registradas" value={totals.registeredExpenses} />
      <ProjectionMetric label="Despesas prováveis" value={totals.probableExpenses} />
    </>
  )
}

function getProjectionStatus(insight: MonthlyProjectionInsight): string {
  if (!insight.isCurrentMonth) {
    if (insight.totals.remainingNet < 0) {
      return `Há um déficit projetado de ${toCurrency(Math.abs(insight.totals.remainingNet))} neste mês.`
    }
    return `O saldo projetado deste mês é ${toCurrency(insight.totals.remainingNet)}.`
  }

  const availableToSpend = insight.availableToSpend ?? 0
  if (availableToSpend < 0) {
    return `Há um déficit projetado de ${toCurrency(Math.abs(availableToSpend))}. A sugestão semanal foi limitada a ${toCurrency(0)}.`
  }
  if (availableToSpend === 0) {
    return `O saldo projetado do mês está totalmente comprometido. A sugestão semanal é ${toCurrency(0)}.`
  }

  return `Você ainda pode gastar ${toCurrency(insight.weeklySpendingSuggestion ?? 0)} por semana.`
}

export function MonthlyProjectionSummary({ insight }: MonthlyProjectionSummaryProps) {
  const headingId = `monthly-projection-summary-${insight.monthKey}`
  const title = insight.isCurrentMonth
    ? `Projeção restante de ${monthLabel(insight.monthKey)}`
    : `Projeção de ${monthLabel(insight.monthKey)}`

  return (
    <section className="panel monthly-projection-summary" aria-labelledby={headingId}>
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Projeção mensal</div>
          <h2 id={headingId}>{title}</h2>
        </div>
      </div>

      <p className={getProjectionStatus(insight).includes('déficit') ? 'projection-status negative' : 'projection-status'} aria-live="polite">
        {getProjectionStatus(insight)}
      </p>

      <dl className="monthly-projection-metrics">
        {insight.isCurrentMonth
          ? <CurrentMonthMetrics insight={insight} />
          : <FutureMonthMetrics insight={insight} />}
      </dl>

      {!insight.hasProjection ? (
        <div className="projection-empty-state">
          <strong>Nenhum lançamento registrado ou provável para este período.</strong>
          <p>Revise outro mês ou importe lançamentos para ampliar a análise.</p>
        </div>
      ) : null}
    </section>
  )
}
