import { AppDialog } from './ui/AppDialog'

type ReclassificationPromptModalProps = {
  onDismiss: () => void
  onReclassify: () => Promise<boolean>
  reclassifying: boolean
}

export function ReclassificationPromptModal({
  onDismiss,
  onReclassify,
  reclassifying,
}: ReclassificationPromptModalProps) {
  return (
    <AppDialog open onOpenChange={(open) => !open && onDismiss()} className="prompt-panel" eyebrow="Reclassificação" title="Reclassificar transações existentes?">
      <p className="muted">
        A nova regra também pode ser aplicada às transações já importadas e persistidas no banco, não só ao que está visível na tela.
      </p>
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onDismiss} disabled={reclassifying}>
          Agora não
        </button>
        <button type="button" onClick={() => void onReclassify()} disabled={reclassifying}>
          {reclassifying ? 'Reclassificando…' : 'Reclassificar'}
        </button>
      </div>
    </AppDialog>
  )
}
