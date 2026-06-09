import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuthActions(setBudgetGroups, setTransactions, setSelectedMonth, setError, setFeedback) {
  const [signInLoading, setSignInLoading] = useState(false)

  async function handleSignIn(email) {
    setSignInLoading(true)
    setError('')
    setFeedback('')

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (authError) {
      setError(authError.message)
    } else {
      setFeedback('Magic link enviado. Confira seu email.')
    }

    setSignInLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setBudgetGroups([])
    setTransactions([])
    setSelectedMonth('')
  }

  return {
    signInLoading,
    handleSignIn,
    handleSignOut,
  }
}
