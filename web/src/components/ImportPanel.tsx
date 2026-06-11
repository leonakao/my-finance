import { useState } from 'react'
import { IMPORT_OPTIONS } from '../constants'
import type { ImportKind, ImportPayload } from '../types'

type ImportPanelProps = {
  onImport: (payload: ImportPayload) => Promise<void>
  loading: boolean
}

export function ImportPanel({ onImport, loading }: ImportPanelProps) {
  const [kind, setKind] = useState<ImportKind>('account')
  const [invoice, setInvoice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const isSantanderPdf = kind === 'santander-card-pdf' || kind === 'santander-account-pdf'

  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Importar</div>
          <h3>Arquivos bancários</h3>
        </div>
      </div>
      <form
        className="import-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!file) {
            return
          }
          void onImport({ kind, invoice, file })
        }}
      >
        <label>
          Tipo de arquivo
          <select value={kind} onChange={(event) => setKind(event.target.value as ImportKind)}>
            {IMPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Referência da fatura
          <input
            type="text"
            value={invoice}
            onChange={(event) => setInvoice(event.target.value)}
            placeholder="Opcional para cartão…"
            disabled={kind !== 'card'}
          />
        </label>
        <label>
          Arquivo
          <input
            type="file"
            accept={isSantanderPdf ? '.pdf,application/pdf' : '.csv,text/csv'}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Importando…' : 'Importar para o Supabase'}
        </button>
      </form>
    </section>
  )
}
