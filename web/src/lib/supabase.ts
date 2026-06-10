import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env = import.meta.env
const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL : undefined
const anonKey = typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY : undefined

export const supabase =
  url !== undefined && url !== '' && anonKey !== undefined && anonKey !== ''
    ? createClient(url, anonKey)
    : null

export function getSupabaseOrThrow(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase não configurado.')
  }

  return supabase
}
