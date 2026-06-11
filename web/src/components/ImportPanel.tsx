import { FileUp } from 'lucide-react'
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
  const isCardImport = kind === 'card' || kind === 'santander-card-pdf'

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
        {isCardImport ? (
          <label>
            Referência da fatura
            <input
              name="invoice"
              type="text"
              value={invoice}
              onChange={(event) => setInvoice(event.target.value)}
              placeholder="Opcional para cartão…"
            />
          </label>
        ) : null}
        <label className="file-field">
          Arquivo
          <input
            name="file"
            type="file"
            className="sr-only"
            accept={isSantanderPdf ? '.pdf,application/pdf' : '.csv,text/csv'}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <span className="file-trigger" aria-hidden="true">
            <FileUp size={16} strokeWidth={1.8} />
            <span className="file-trigger-label">{file ? file.name : 'Escolher arquivo…'}</span>
          </span>
        </label>
        <button type="submit" disabled={loading || !file}>
          {loading ? <span className="button-spinner" aria-hidden="true" /> : null}
          {loading ? 'Importando…' : 'Importar arquivo'}
        </button>
      </form>
    </section>
  )
}
