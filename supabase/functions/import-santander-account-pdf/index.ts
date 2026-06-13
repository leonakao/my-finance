import { createClient } from 'npm:@supabase/supabase-js@2'
import { resolveImportedTransactionBudgetGroups } from '../_shared/budget-groups.ts'
import { applyUserClassificationRulesWithCount, loadUserClassificationRules } from '../_shared/classification-rules.ts'
import { dropTransactionsAlreadyImported, inferImportedSourceKind, syncImportedInstallmentOrigins } from '../_shared/installments.ts'
import { inspectSantanderAccountPdf, parseSantanderAccountPdf } from '../_shared/santander-account.ts'

type ImportPayload = {
  filename?: string
  pdfBase64: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  })
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return json({ ok: true })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authHeader = request.headers.get('Authorization')

  if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
    return json({ error: 'Missing Supabase runtime configuration or auth header' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return json({ error: userError?.message ?? 'Unauthorized' }, 401)
  }

  let payload: ImportPayload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!payload.pdfBase64) {
    return json({ error: 'pdfBase64 is required' }, 400)
  }

  const pdfBytes = decodeBase64(payload.pdfBase64)
  const parsedTransactions = await parseSantanderAccountPdf({
    userId: user.id,
    pdfBytes,
    filename: payload.filename,
  })

  const imported = parsedTransactions.length
  const transactionsWithBudgetGroups = await resolveImportedTransactionBudgetGroups(supabase, user.id, parsedTransactions)
  const rules = await loadUserClassificationRules(supabase, user.id)
  const { transactions: classifiedTransactions, classifiedCount } = applyUserClassificationRulesWithCount(
    transactionsWithBudgetGroups,
    rules,
  )
  const insertableTransactions = classifiedTransactions.filter((item) => !item.ignored)
  const ignoredByStatusCount = classifiedTransactions.length - insertableTransactions.length
  const { transactions: newTransactions, alreadyImportedCount } = await dropTransactionsAlreadyImported(
    supabase,
    user.id,
    insertableTransactions,
  )
  const transactionsByExternalId = new Map(newTransactions.map((item) => [item.external_id, item]))
  const transactions = [...transactionsByExternalId.values()]
  const duplicatesDropped = newTransactions.length - transactions.length
  const transactionsToInsert = transactions.map(({ ignored: _ignored, ...transaction }) => ({
    ...transaction,
    source_kind: inferImportedSourceKind('statement', transaction),
    origin_transaction_id: null,
  }))

  let insertError: { message: string } | null = null
  if (transactionsToInsert.length > 0) {
    const { error } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
    insertError = error
  }

  if (insertError) {
    return json({ error: insertError.message }, 400)
  }

  if (transactionsToInsert.length > 0) {
    await syncImportedInstallmentOrigins(supabase, user.id, transactionsToInsert)
  }

  const inserted = transactions.length
  const ignored = ignoredByStatusCount + alreadyImportedCount + duplicatesDropped
  const insertedTotal = transactions.reduce((sum, item) => sum + item.amount, 0)

  return json({
    imported,
    inserted,
    ignored,
    classified: classifiedCount,
    duplicatesDropped,
    insertedTotal,
    filename: payload.filename ?? '',
    kind: 'santander-account-pdf',
    ...(imported === 0 ? { debug: inspectSantanderAccountPdf(pdfBytes) } : {}),
  })
})
