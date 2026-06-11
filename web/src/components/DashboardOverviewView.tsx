/* eslint-disable max-lines-per-function */
import { useMemo, useState } from 'react'
import { monthLabel, toCurrency, toPercent } from '../lib/formatters'
import type { BudgetGroup, FinancialOverview } from '../types'

type DashboardOverviewViewProps = {
  budgetGroups: BudgetGroup[]
  overview: FinancialOverview
}

function KpiCard({ label, value, detail }: { detail: string; label: string; value: string }) {
  return (
    <article className="kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  )
}

export function DashboardOverviewView({ budgetGroups, overview }: DashboardOverviewViewProps) {
  const adjustableGroups = budgetGroups.filter((budgetGroup) => budgetGroup.name.trim() !== '')
  const [selectedGroupId, setSelectedGroupId] = useState(adjustableGroups[0]?.id ?? '')
  const [adjustmentPercent, setAdjustmentPercent] = useState('-10')

  const simulation = useMemo(() => {
    const delta = Number(adjustmentPercent) / 100
    const impactedMonths = overview.projectedMonths.map((month) => {
      const basePlanned = month.plannedByGroup[selectedGroupId] ?? 0
      const baseProbable = month.probableByGroup[selectedGroupId] ?? 0
      const adjustableTotal = basePlanned + baseProbable
      const simulatedDelta = adjustableTotal * delta

      return {
        monthKey: month.monthKey,
        simulatedDelta,
        nextNet: month.net - simulatedDelta,
      }
    })

    return {
      totalDelta: impactedMonths.reduce((total, month) => total + month.simulatedDelta, 0),
      impactedMonths,
    }
  }, [adjustmentPercent, overview.projectedMonths, selectedGroupId])

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow">Visão geral</div>
          <h2>Saúde financeira com leitura do presente e do que já vem pela frente.</h2>
          <p>
            A dashboard combina histórico recente, parcelas futuras já previstas e padrões de recorrência para ajudar a
            entender tendência, pressão de gastos e espaço de manobra.
          </p>
        </div>
        <div className="hero-grid">
          <KpiCard
            label="Receita média"
            value={toCurrency(overview.averageRevenue)}
            detail="Média dos últimos 3 meses confirmados."
          />
          <KpiCard
            label="Saída média"
            value={toCurrency(overview.averageExpenses)}
            detail="Despesas e transferências que consumiram caixa."
          />
          <KpiCard
            label="Compromissos previstos"
            value={toCurrency(overview.plannedCommitments)}
            detail="Parcelas e outros lançamentos já presentes nos próximos 3 meses."
          />
          <KpiCard
            label="Sinal de futuro"
            value={toPercent(overview.futureAllocationRate)}
            detail="Percentual projetado de alocação no grupo Futuro."
          />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Tendência recente</div>
            <h3>Últimos meses confirmados</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Receita</th>
                <th>Saídas</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentMonths.map((month) => (
                <tr key={month.monthKey}>
                  <td>{monthLabel(month.monthKey)}</td>
                  <td>{toCurrency(month.revenue)}</td>
                  <td>{toCurrency(month.expenses)}</td>
                  <td className={month.net >= 0 ? 'negative' : 'positive'}>{toCurrency(month.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid two-up">
        <section className="panel">
          <div className="panel-header compact">
            <div>
              <div className="eyebrow">Projeção</div>
              <h3>Horizonte dos próximos 3 meses</h3>
            </div>
          </div>
          <div className="projection-list">
            {overview.projectedMonths.map((month) => (
              <article key={month.monthKey} className="projection-card">
                <div>
                  <strong>{monthLabel(month.monthKey)}</strong>
                  <p className="muted">
                    {month.plannedTransactionsCount} previstos • {month.probableTransactionsCount} prováveis
                  </p>
                </div>
                <dl className="projection-metrics">
                  <div>
                    <dt>Receitas</dt>
                    <dd>{toCurrency(month.revenue)}</dd>
                  </div>
                  <div>
                    <dt>Previsto</dt>
                    <dd>{toCurrency(month.confirmedExpenses)}</dd>
                  </div>
                  <div>
                    <dt>Provável</dt>
                    <dd>{toCurrency(month.probableExpenses)}</dd>
                  </div>
                  <div>
                    <dt>Saldo</dt>
                    <dd className={month.net >= 0 ? 'negative' : 'positive'}>{toCurrency(month.net)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header compact">
            <div>
              <div className="eyebrow">Simulação rápida</div>
              <h3>Ajustar um grupo e ver o impacto</h3>
            </div>
          </div>
          <form className="simulation-form">
            <label>
              Grupo
              <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
                {adjustableGroups.map((budgetGroup) => (
                  <option key={budgetGroup.id} value={budgetGroup.id}>
                    {budgetGroup.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ajuste percentual
              <input
                type="number"
                step="1"
                inputMode="numeric"
                value={adjustmentPercent}
                onChange={(event) => setAdjustmentPercent(event.target.value)}
              />
            </label>
          </form>
          <p className="feedback" role="status">
            Impacto acumulado no horizonte: <strong>{toCurrency(simulation.totalDelta)}</strong>
          </p>
          <div className="simulation-results">
            {simulation.impactedMonths.map((month) => (
              <div key={month.monthKey} className="simulation-row">
                <span>{monthLabel(month.monthKey)}</span>
                <span>{toCurrency(month.simulatedDelta)}</span>
                <strong>{toCurrency(month.nextNet)}</strong>
              </div>
            ))}
          </div>
          <p className="muted">
            A simulação não altera dados. Ela aplica o ajuste sobre gastos previstos e prováveis do grupo selecionado.
          </p>
        </section>
      </div>
    </div>
  )
}
