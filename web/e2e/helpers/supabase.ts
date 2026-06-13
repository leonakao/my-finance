import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

type TestSupabaseClient = SupabaseClient

function loadLocalEnv() {
  const envPath = new URL('../../.env.local', import.meta.url)
  const raw = readFileSync(envPath, 'utf8')
  const entries = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=')
      return [key, rest.join('=')]
    })

  return Object.fromEntries(entries)
}

const env = loadLocalEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

export async function createUserSession() {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
  const password = 'secret123'
  const client = createClient(supabaseUrl, supabaseAnonKey)

  const { error: signUpError } = await client.auth.signUp({
    email,
    password,
  })

  if (signUpError) {
    throw signUpError
  }

  const {
    data: { session },
    error: signInError,
  } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !session) {
    throw signInError ?? new Error('Failed to sign in test user')
  }

  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  })

  return {
    email,
    password,
    userId: session.user.id,
    accessToken: session.access_token,
    supabase: authedClient,
  }
}

export async function seedTransactionWithNoGroup(client: TestSupabaseClient, userId: string) {
  const { data: budgetGroups, error: budgetGroupsError } = await client
    .from('budget_groups')
    .select('id, name')
    .order('name', { ascending: true })

  if (budgetGroupsError) {
    throw budgetGroupsError
  }

  const [firstBudgetGroup] = budgetGroups
  if (!firstBudgetGroup) {
    throw new Error('No budget groups available for E2E setup')
  }

  const transaction = {
    user_id: userId,
    date: '2026-06-10',
    description: 'Compra e2e supermercado',
    amount: 59.9,
    type: 'Despesa',
    category: 'Outros',
    budget_group_id: null,
    account: 'Conta principal',
    institution: 'Nubank',
    notes: 'Seed E2E',
    invoice: '',
    installment: '',
    external_id: `e2e:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    source: 'E2E',
  }

  const { data, error } = await client
    .from('transactions')
    .insert(transaction)
    .select('id, budget_group_id')
    .single()

  if (error) {
    throw error
  }

  return {
    transactionId: data.id,
    initialBudgetGroupId: data.budget_group_id,
    selectableBudgetGroup: firstBudgetGroup,
  }
}

export async function seedTransaction(client: TestSupabaseClient, userId: string, overrides = {}) {
  const transaction = {
    user_id: userId,
    date: '2026-06-10',
    description: 'Compra e2e supermercado',
    amount: 59.9,
    type: 'Despesa',
    category: 'Outros',
    budget_group_id: null,
    account: 'Conta principal',
    institution: 'Nubank',
    notes: 'Seed E2E',
    invoice: '',
    installment: '',
    external_id: `e2e:${Date.now()}:${Math.random().toString(16).slice(2)}`,
    source: 'E2E',
    ...overrides,
  }

  const { data, error } = await client
    .from('transactions')
    .insert(transaction)
    .select('id, budget_group_id, category, type, description')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getBudgetGroups(client: TestSupabaseClient) {
  const { data, error } = await client
    .from('budget_groups')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function seedClassificationRule(client: TestSupabaseClient, userId: string, overrides = {}) {
  const rule = {
    user_id: userId,
    match_mode: 'description',
    match_description: 'supermercado',
    match_description_normalized: 'supermercado',
    match_amount: null,
    type: 'Despesa',
    category: 'Outros',
    budget_group_id: null,
    ...overrides,
  }

  const { data, error } = await client
    .from('transaction_classification_rules')
    .insert(rule)
    .select('id, match_description')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function fetchTransaction(client: TestSupabaseClient, transactionId: string) {
  const { data, error } = await client
    .from('transactions')
    .select('id, budget_group_id, category, type, notes')
    .eq('id', transactionId)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function fetchRules(client: TestSupabaseClient) {
  const { data, error } = await client
    .from('transaction_classification_rules')
    .select('match_mode, match_description, match_amount, type, category, budget_group_id')
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function fetchTransactions(client: TestSupabaseClient) {
  const { data, error } = await client
    .from('transactions')
    .select('id, description, budget_group_id, category, type')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function fetchTransactionsByExternalIds(client: TestSupabaseClient, externalIds: string[]) {
  const { data, error } = await client
    .from('transactions')
    .select('id, external_id, description, amount, type, category, source')
    .in('external_id', externalIds)
    .order('external_id', { ascending: true })

  if (error) {
    throw error
  }

  return data
}

export async function seedProjectionExclusion(client: TestSupabaseClient, userId: string, overrides = {}) {
  const exclusion = {
    user_id: userId,
    type: 'Despesa',
    description: 'Internet e2e',
    normalized_description: 'internet e2e',
    scope: 'month',
    month_start: '2026-06-01',
    ...overrides,
  }

  const { data, error } = await client
    .from('projection_exclusions')
    .insert(exclusion)
    .select('id, type, description, normalized_description, scope, month_start')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function fetchProjectionExclusions(client: TestSupabaseClient) {
  const { data, error } = await client
    .from('projection_exclusions')
    .select('id, type, description, normalized_description, scope, month_start')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}
