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
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
      {feedback && !error ? <p className="feedback" role="status">{feedback}</p> : null}
      <ImportPanel onImport={handleImport} loading={importLoading} />
    </div>
  )
}
