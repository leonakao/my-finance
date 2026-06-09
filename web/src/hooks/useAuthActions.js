import { useState } from 'react'
import { supabase } from '../lib/supabase'

async function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

async function signUpWithPassword(email, password) {
  return supabase.auth.signUp({ email, password })
}

async function requestPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  })
}

async function updatePassword(password) {
  return supabase.auth.updateUser({ password })
}

export function useAuthActions(setBudgetGroups, setTransactions, setSelectedMonth, setError, setFeedback) {
  const [signInLoading, setSignInLoading] = useState(false)

  async function runAuthAction(action, successMessage) {
    setSignInLoading(true)
    setError('')
    setFeedback('')

    const { error: authError } = await action()

    if (authError) {
      setError(authError.message)
    } else if (successMessage) {
      setFeedback(successMessage)
    }

    setSignInLoading(false)
    return !authError
  }

  async function handleSignIn(email, password) {
    await runAuthAction(() => signInWithPassword(email, password), '')
  }

  async function handleSignUp(email, password) {
    await runAuthAction(
      () => signUpWithPassword(email, password),
      'Conta criada com sucesso. Se a sessão não abrir automaticamente, faça login.',
    )
  }

  async function handlePasswordReset(email) {
    await runAuthAction(
      () => requestPasswordReset(email),
      'Email de recuperação enviado. Abra o link para definir uma nova senha.',
    )
  }

  async function handlePasswordUpdate(password, onSuccess) {
    const ok = await runAuthAction(
      () => updatePassword(password),
      'Senha atualizada com sucesso.',
    )

    if (ok) {
      onSuccess()
    }
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
    handleSignUp,
    handlePasswordReset,
    handlePasswordUpdate,
    handleSignOut,
  }
}
