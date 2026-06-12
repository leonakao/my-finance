import { useState } from 'react'
import { monthLabel, toCurrency } from '../lib/formatters'
import type {
  ProjectionExclusionScope,
  ProjectionLineItem,
} from '../types'
import { AppDialog } from './ui/AppDialog'

type ProjectionExclusionDialogProps = {
  item: ProjectionLineItem | null
  monthKey: string
  saving: boolean
  onClose: () => void
  onConfirm: (scope: ProjectionExclusionScope) => Promise<void> | void
}

export function ProjectionExclusionDialog({
  item,
  monthKey,
  saving,
  onClose,
  onConfirm,
}: ProjectionExclusionDialogProps) {
  const [scope, setScope] = useState<ProjectionExclusionScope>('month')

  if (item === null) {
    return null
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => !open && onClose()}
      className="projection-exclusion-dialog"
      description={`${item.description} está estimada em ${toCurrency(item.amount)} para ${monthLabel(monthKey)}.`}
      eyebrow="Projeção provável"
      title="Remover estimativa da projeção"
    >
      <fieldset className="projection-exclusion-options" disabled={saving}>
        <legend>Por quanto tempo esta estimativa deve ficar oculta?</legend>
        <label>
          <input
            autoFocus
            type="radio"
            name="projectionExclusionScope"
            value="month"
            checked={scope === 'month'}
            onChange={() => setScope('month')}
          />
          <span>
            <strong>Somente neste mês</strong>
            <small>A recorrência volta a aparecer nas projeções seguintes.</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="projectionExclusionScope"
            value="from_month"
            checked={scope === 'from_month'}
            onChange={() => setScope('from_month')}
          />
          <span>
            <strong>Neste e nos meses futuros</strong>
            <small>Use quando a recorrência deixou de existir.</small>
          </span>
        </label>
      </fieldset>

      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onClose} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => void onConfirm(scope)}
          disabled={saving}
        >
          {saving ? <span className="button-spinner" aria-hidden="true" /> : null}
          Remover da projeção
        </button>
      </div>
    </AppDialog>
  )
}
