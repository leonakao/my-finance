import { AppDialog } from './AppDialog'

type ConfirmDialogProps = {
  busy?: boolean
  confirmLabel: string
  description: string
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
}

export function ConfirmDialog({ busy = false, confirmLabel, description, onCancel, onConfirm, open, title }: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <AppDialog open onOpenChange={(nextOpen) => !nextOpen && onCancel()} className="prompt-panel" eyebrow="Confirmação" title={title}>
      <p className="muted">{description}</p>
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button type="button" className="danger" onClick={onConfirm} disabled={busy}>
          {busy ? <span className="button-spinner" aria-hidden="true" /> : null}
          {confirmLabel}
        </button>
      </div>
    </AppDialog>
  )
}
