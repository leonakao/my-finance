import { ImportPanel } from './ImportPanel'
import type { ImportPayload } from '../types'

type ImportViewProps = {
  error: string
  feedback: string
  handleImport: (payload: ImportPayload) => Promise<void>
  importLoading: boolean
}

export function ImportView({ error, feedback, handleImport, importLoading }: ImportViewProps) {
  return (
    <div className="page-stack">
      <section className="hero-panel compact-hero">
        <div className="hero-copy">
          <div className="eyebrow">Importação</div>
          <h2>Traga novos dados para a base com um fluxo mais guiado.</h2>
          <p>
            Use esta página para enviar faturas e extratos. O sistema diferencia arquivos previstos, mantém contexto do
            envio e devolve um resumo do que entrou.
          </p>
        </div>
      </section>
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
      {feedback && !error ? <p className="feedback" role="status">{feedback}</p> : null}
      <ImportPanel onImport={handleImport} loading={importLoading} />
    </div>
  )
}
