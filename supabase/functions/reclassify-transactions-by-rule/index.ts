import { createClient } from 'npm:@supabase/supabase-js@2'
import { applyUserClassificationRulesWithCount, loadUserClassificationRules } from '../_shared/classification-rules.ts'

type ReclassificationPayload = {
  rule_id: string
}

type ReclassifiableTransaction = {
  id: string
  description: string
  amount: number
  type: 'Despesa' | 'Receita' | 'Transferência'
  category: string
  budget_group_id: string | null
  account: string
  institution: string
  description_normalized: string
}

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
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

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

async function loadCandidateTransactions(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  rule: Awaited<ReturnType<typeof loadUserClassificationRules>>[number],
): Promise<ReclassifiableTransaction[]> {
  let query = supabase
    .from('transactions')
    .select('id, description, amount, type, category, budget_group_id, account, institution, description_normalized')
    .eq('user_id', userId)
    .ilike('description_normalized', `%${escapeLikePattern(rule.match_description_normalized)}%`)

  if (rule.match_institution !== null) {
    query = query.eq('institution', rule.match_institution)
  }

  if (rule.match_account !== null) {
    query = query.eq('account', rule.match_account)
  }

  if (rule.match_mode === 'description_amount') {
    query = query.eq('amount', rule.match_amount)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as ReclassifiableTransaction[]
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

  let payload: ReclassificationPayload
  try {
    payload = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!payload.rule_id) {
    return json({ error: 'rule_id is required' }, 400)
  }

  const { data: selectedRule, error: selectedRuleError } = await supabase
    .from('transaction_classification_rules')
    .select('id')
    .eq('id', payload.rule_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (selectedRuleError) {
    return json({ error: selectedRuleError.message }, 400)
  }

  if (!selectedRule) {
    return json({ error: 'Classification rule not found' }, 404)
  }

  const rules = await loadUserClassificationRules(supabase, user.id)
  if (!rules.length) {
    return json({ updated_count: 0 })
  }

  const candidateSets = await Promise.all(
    rules.map((rule) => loadCandidateTransactions(supabase, user.id, rule)),
  )

  const candidateTransactionsById = new Map<string, ReclassifiableTransaction>()
  for (const candidateSet of candidateSets) {
    for (const transaction of candidateSet) {
      candidateTransactionsById.set(transaction.id, transaction)
    }
  }

  const candidateTransactions = [...candidateTransactionsById.values()]
  if (!candidateTransactions.length) {
    return json({ updated_count: 0 })
  }

  const { transactions: classifiedTransactions } = applyUserClassificationRulesWithCount(candidateTransactions, rules)

  const updatesBySnapshot = new Map<string, { ids: string[]; type: ReclassifiableTransaction['type']; category: string; budget_group_id: string | null }>()
  candidateTransactions.forEach((transaction, index) => {
    const nextTransaction = classifiedTransactions[index]
    if (
      transaction.type === nextTransaction.type
      && transaction.category === nextTransaction.category
      && (transaction.budget_group_id ?? null) === (nextTransaction.budget_group_id ?? null)
    ) {
      return
    }

    const key = `${nextTransaction.type}::${nextTransaction.category}::${nextTransaction.budget_group_id ?? ''}`
    const group = updatesBySnapshot.get(key)
    if (group) {
      group.ids.push(transaction.id)
      return
    }

    updatesBySnapshot.set(key, {
      ids: [transaction.id],
      type: nextTransaction.type,
      category: nextTransaction.category,
      budget_group_id: nextTransaction.budget_group_id ?? null,
    })
  })

  let updatedCount = 0
  for (const group of updatesBySnapshot.values()) {
    for (const idsChunk of chunk(group.ids, 100)) {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          type: group.type,
          category: group.category,
          budget_group_id: group.budget_group_id,
        })
        .in('id', idsChunk)
        .select('id')

      if (error) {
        return json({ error: error.message }, 400)
      }

      updatedCount += data?.length ?? idsChunk.length
    }
  }

  return json({ updated_count: updatedCount })
})
