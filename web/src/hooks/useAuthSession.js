import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function hasRecoveryTokenInHash() {
  return window.location.hash.includes('type=recovery')
}

export function useAuthSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(supabase))
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => hasRecoveryTokenInHash())

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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    session,
    loading,
    setLoading,
    isRecoveryMode,
    setIsRecoveryMode,
  }
}
