import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuthSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    session,
    loading,
    setLoading,
  }
}
