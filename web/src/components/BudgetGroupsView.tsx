import { BudgetGroupManager } from './BudgetGroupManager'
import type { BudgetGroup } from '../types'

type BudgetGroupsViewProps = {
  budgetGroups: BudgetGroup[]
  createBudgetGroup: (payload: { name: string; targetPercentage: number }) => Promise<boolean>
  deleteBudgetGroup: (id: string) => Promise<boolean>
  orphanedCount: number
  savingGroupId: string
  updateBudgetGroup: (id: string, payload: { name: string; targetPercentage: number }) => Promise<boolean>
}

export function BudgetGroupsView({
  budgetGroups,
  createBudgetGroup,
  deleteBudgetGroup,
  orphanedCount,
  savingGroupId,
  updateBudgetGroup,
}: BudgetGroupsViewProps) {
  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero">
        <div className="hero-copy">
          <div className="eyebrow">Budget groups</div>
          <h2>Organize os grupos que sustentam metas, leitura mensal e projeções.</h2>
          <p>
            Ajuste nomes e metas percentuais com uma área dedicada. As mudanças refletem a navegação mensal e a
            dashboard estratégica.
          </p>
        </div>
      </section>
      <BudgetGroupManager
        budgetGroups={budgetGroups}
        orphanedCount={orphanedCount}
        savingGroupId={savingGroupId}
        onCreate={createBudgetGroup}
        onDelete={deleteBudgetGroup}
        onUpdate={updateBudgetGroup}
      />
    </div>
  )
}
