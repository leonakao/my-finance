import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { fileToBase64 } from '../lib/transactions'

function buildImportRequest(kind, invoice, file, pdfBase64, csvText) {
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

export function useTransactionsImport(loadTransactions, setError, setFeedback) {
  const [importLoading, setImportLoading] = useState(false)

  async function handleImport({ kind, invoice, file }) {
    if (!supabase || !file) {
      return
    }

    setImportLoading(true)
    setError('')
    setFeedback('')

    const pdfBase64 =
      kind === 'santander-card-pdf' || kind === 'santander-account-pdf' ? await fileToBase64(file) : ''
    const csvText = pdfBase64 ? '' : await file.text()
    const { functionName, body } = buildImportRequest(kind, invoice, file, pdfBase64, csvText)
    const { data, error: invokeError } = await supabase.functions.invoke(functionName, { body })

    if (invokeError) {
      setError(invokeError.message)
      setImportLoading(false)
      return
    }

    setFeedback(
      `Importação concluída: ${data.imported} linhas, ${data.confirmed} confirmadas, ${data.ignored} ignoradas.`,
    )
    setImportLoading(false)
    await loadTransactions()
  }

  return {
    importLoading,
    handleImport,
  }
}
