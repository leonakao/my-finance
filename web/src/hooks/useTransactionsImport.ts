import { useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import { fileToBase64 } from '../lib/transactions'
import type { ImportKind, ImportPayload, ImportResponse } from '../types'

function buildImportRequest(kind: ImportKind, invoice: string, file: File, pdfBase64: string, csvText: string) {
  if (kind === 'santander-card-pdf') {
    return {
      functionName: 'import-santander-pdf',
      body: {
        filename: file.name,
        pdfBase64,
      },
    }
  }

  if (kind === 'santander-account-pdf') {
    return {
      functionName: 'import-santander-account-pdf',
      body: {
        filename: file.name,
        pdfBase64,
      },
    }
  }

  return {
    functionName: 'import-nubank-csv',
    body: {
      kind,
      invoice,
      filename: file.name,
      csvText,
    },
  }
}

export function useTransactionsImport(
  loadTransactions: () => Promise<void>,
  setError: Dispatch<SetStateAction<string>>,
  setFeedback: Dispatch<SetStateAction<string>>,
) {
  const [importLoading, setImportLoading] = useState(false)

  async function handleImport({ kind, invoice, file }: ImportPayload) {
    setImportLoading(true)
    setError('')
    setFeedback('')

    const pdfBase64 =
      kind === 'santander-card-pdf' || kind === 'santander-account-pdf' ? await fileToBase64(file) : ''
    const csvText = pdfBase64 ? '' : await file.text()
    const { functionName, body } = buildImportRequest(kind, invoice, file, pdfBase64, csvText)
    const response = await getSupabaseOrThrow().functions.invoke(functionName, { body }) as {
      data: ImportResponse | null
      error: Error | null
    }
    const { data, error: invokeError } = response

    if (invokeError) {
      setError(invokeError.message)
      setImportLoading(false)
      return
    }

    const importResult = data ?? { imported: 0, confirmed: 0, ignored: 0 }
    setFeedback(
      `Importação concluída: ${importResult.imported} linhas, ${importResult.confirmed} confirmadas, ${importResult.ignored} ignoradas.`,
    )
    setImportLoading(false)
    await loadTransactions()
  }

  return {
    importLoading,
    handleImport,
  }
}
