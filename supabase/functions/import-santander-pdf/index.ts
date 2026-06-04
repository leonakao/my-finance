import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseSantanderPdf } from '../_shared/santander.ts'

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

  const transactions = parseSantanderPdf({
    userId: user.id,
    pdfBytes: decodeBase64(payload.pdfBase64),
    filename: payload.filename,
  })

  const { error: upsertError } = await supabase
    .from('transactions')
    .upsert(transactions, { onConflict: 'user_id,external_id' })

  if (upsertError) {
    return json({ error: upsertError.message }, 400)
  }

  const total = transactions.reduce((sum, item) => sum + item.amount, 0)

  return json({
    imported: transactions.length,
    confirmed: transactions.length,
    ignored: 0,
    confirmedTotal: total,
    filename: payload.filename ?? '',
    kind: 'santander-pdf',
  })
})
