import { useState, type Dispatch, type SetStateAction } from 'react'
import { getSupabaseOrThrow } from '../lib/supabase'
import type { BudgetGroup, ClassificationRule, ProjectionExclusion, Transaction } from '../types'

function getPasswordResetRedirectUrl() {
  const env = import.meta.env
  const siteUrl = typeof env.VITE_SITE_URL === 'string' ? env.VITE_SITE_URL : undefined

  if (siteUrl !== undefined && siteUrl.trim() !== '') {
    return siteUrl.replace(/\/+$/, '')
  }

  return window.location.origin
}

async function signInWithPassword(email: string, password: string) {
  return getSupabaseOrThrow().auth.signInWithPassword({ email, password })
}

async function signUpWithPassword(email: string, password: string) {
  return getSupabaseOrThrow().auth.signUp({ email, password })
}

async function requestPasswordReset(email: string) {
  return getSupabaseOrThrow().auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  })
}

async function updatePassword(password: string) {
  return getSupabaseOrThrow().auth.updateUser({ password })
}

export function useAuthActions(
  setBudgetGroups: Dispatch<SetStateAction<BudgetGroup[]>>,
  setClassificationRules: Dispatch<SetStateAction<ClassificationRule[]>>,
  setProjectionExclusions: Dispatch<SetStateAction<ProjectionExclusion[]>>,
  setTransactions: Dispatch<SetStateAction<Transaction[]>>,
  setSelectedMonth: Dispatch<SetStateAction<string>>,
  setError: Dispatch<SetStateAction<string>>,
  setFeedback: Dispatch<SetStateAction<string>>,
) {
  const [signInLoading, setSignInLoading] = useState(false)

  async function runAuthAction(
    action: () => Promise<{ error: Error | null }>,
    successMessage: string,
  ) {
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

  async function handleSignIn(email: string, password: string) {
    return runAuthAction(() => signInWithPassword(email, password), '')
  }

  async function handleSignUp(email: string, password: string) {
    return runAuthAction(
      () => signUpWithPassword(email, password),
      'Conta criada com sucesso. Se a sessão não abrir automaticamente, faça login.',
    )
  }

  async function handlePasswordReset(email: string) {
    return runAuthAction(
      () => requestPasswordReset(email),
      'Email de recuperação enviado. Abra o link para definir uma nova senha.',
    )
  }

  async function handlePasswordUpdate(password: string, onSuccess: () => void) {
    const ok = await runAuthAction(
      () => updatePassword(password),
      'Senha atualizada com sucesso.',
    )

    if (ok) {
      onSuccess()
    }
  }

  async function handleSignOut() {
    await getSupabaseOrThrow().auth.signOut()
    setBudgetGroups([])
    setClassificationRules([])
    setProjectionExclusions([])
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
