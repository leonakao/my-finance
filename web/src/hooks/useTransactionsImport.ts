import { FunctionsHttpError } from '@supabase/supabase-js'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import { fileToBase64 } from '../lib/transactions'
import type { ImportKind, ImportPayload, ImportResponse } from '../types'

async function describeImportError(invokeError: unknown): Promise<string> {
  if (invokeError instanceof FunctionsHttpError) {
    try {
      const context = invokeError.context as Response
      const body = (await context.json()) as { error?: string }
      if (typeof body.error === 'string' && body.error !== '') {
        return body.error
      }
    } catch {
      // corpo não-JSON: usa a mensagem genérica abaixo
    }
  }
  if (invokeError instanceof Error && invokeError.message !== '') {
    return invokeError.message
  }
  return 'Falha desconhecida ao importar o arquivo.'
}

function buildImportRequest(kind: ImportKind, invoice: string, file: File, pdfBase64: string, csvText: string) {
  if (kind === 'santander-card-pdf') {
    return {
      functionName: 'import-santander-pdf',
      body: {
        filename: file.name,
        invoice,
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
  loadTransactions: () => Promise<boolean>,
  setError: Dispatch<SetStateAction<string>>,
  setFeedback: Dispatch<SetStateAction<string>>,
) {
  const [importLoading, setImportLoading] = useState(false)

  async function handleImport({ kind, invoice, file }: ImportPayload) {
    setImportLoading(true)
    setError('')
    setFeedback('')

    try {
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
        setError(`Falha na importação: ${await describeImportError(invokeError)}`)
        return
      }

      const importResult = data ?? { imported: 0, inserted: 0, ignored: 0, classified: 0 }
      const duplicatesNote =
        importResult.duplicatesDropped !== undefined && importResult.duplicatesDropped > 0
          ? ` ${importResult.duplicatesDropped} linhas duplicadas no arquivo foram descartadas.`
          : ''
      setFeedback(
        `Importação concluída: ${importResult.imported} linhas identificadas, ${importResult.inserted} inseridas, ${importResult.ignored} ignoradas, ${importResult.classified ?? 0} classificadas automaticamente.${duplicatesNote}`,
      )
      await loadTransactions()
    } catch (unknownError) {
      setError(`Falha na importação: ${await describeImportError(unknownError)}`)
    } finally {
      setImportLoading(false)
    }
  }

  return {
    importLoading,
    handleImport,
  }
}
