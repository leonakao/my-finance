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
