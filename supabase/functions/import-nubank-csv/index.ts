import { createClient } from 'npm:@supabase/supabase-js@2'
import { resolveImportedTransactionBudgetGroups } from '../_shared/budget-groups.ts'
import { applyUserClassificationRules, loadUserClassificationRules } from '../_shared/classification-rules.ts'
import { parseNubankCsv, type ImportKind } from '../_shared/nubank.ts'

type ImportPayload = {
  kind: ImportKind
  csvText: string
  invoice?: string
  filename?: string
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

  if (!payload.kind || !payload.csvText) {
    return json({ error: 'kind and csvText are required' }, 400)
  }

  const parsedTransactions = parseNubankCsv({
    userId: user.id,
    kind: payload.kind,
    csvText: payload.csvText,
    invoice: payload.invoice,
    filename: payload.filename,
  })

  const transactionsWithBudgetGroups = await resolveImportedTransactionBudgetGroups(supabase, user.id, parsedTransactions)
  const rules = await loadUserClassificationRules(supabase, user.id)
  const transactions = applyUserClassificationRules(transactionsWithBudgetGroups, rules)

  const { error: upsertError } = await supabase
    .from('transactions')
    .upsert(transactions, { onConflict: 'user_id,external_id' })

  if (upsertError) {
    return json({ error: upsertError.message }, 400)
  }

  const confirmed = transactions.filter((item) => item.status === 'Confirmado')
  const ignored = transactions.filter((item) => item.status === 'Ignorar')
  const total = confirmed.reduce((sum, item) => sum + item.amount, 0)

  return json({
    imported: transactions.length,
    confirmed: confirmed.length,
    ignored: ignored.length,
    confirmedTotal: total,
    filename: payload.filename ?? '',
    kind: payload.kind,
  })
})
