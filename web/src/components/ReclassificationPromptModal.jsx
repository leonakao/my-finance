export function ReclassificationPromptModal({
  onDismiss,
  onReclassify,
  reclassifying,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-panel prompt-panel" role="dialog" aria-modal="true" aria-labelledby="reclassification-prompt-title">
        <div className="panel-header compact">
          <div>
            <div className="eyebrow">Reclassificação</div>
            <h3 id="reclassification-prompt-title">Reclassificar transações existentes?</h3>
          </div>
        </div>
        <p className="muted">
          A nova regra também pode ser aplicada às transações já importadas.
        </p>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onDismiss} disabled={reclassifying}>
            Agora não
          </button>
          <button type="button" onClick={() => void onReclassify()} disabled={reclassifying}>
            {reclassifying ? 'Reclassificando...' : 'Reclassificar'}
          </button>
        </div>
      </div>
    </div>
  )
}
