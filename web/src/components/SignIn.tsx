import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react'

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password'

type PasswordFieldsProps = {
  confirmPassword: string
  password: string
  setConfirmPassword: Dispatch<SetStateAction<string>>
  setPassword: Dispatch<SetStateAction<string>>
}

type AuthModeToggleProps = {
  mode: AuthMode
  setMode: Dispatch<SetStateAction<AuthMode>>
}

type ForgotPasswordLinkProps = {
  mode: AuthMode
  setMode: Dispatch<SetStateAction<AuthMode>>
}

type PanelProps = {
  children: ReactNode
  copy: string
  title: string
}

type AuthFeedbackProps = {
  error: string
  formError: string
}

type AuthFormBodyProps = {
  confirmPassword: string
  email: string
  isRecoveryMode: boolean
  loading: boolean
  mode: AuthMode
  onDismissRecovery: () => void
  password: string
  setConfirmPassword: Dispatch<SetStateAction<string>>
  setEmail: Dispatch<SetStateAction<string>>
  setPassword: Dispatch<SetStateAction<string>>
}

type SignInProps = {
  error: string
  isRecoveryMode: boolean
  loading: boolean
  onDismissRecovery: () => void
  onPasswordReset: (email: string) => Promise<void>
  onPasswordUpdate: (password: string) => Promise<void>
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (email: string, password: string) => Promise<void>
}

function PasswordFields({ confirmPassword, password, setConfirmPassword, setPassword }: PasswordFieldsProps) {
  return (
    <>
      <label>
        Senha
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
          minLength={6}
          required
        />
      </label>
      <label>
        Confirmar senha
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repita sua senha"
          minLength={6}
          required
        />
      </label>
    </>
  )
}

function AuthModeToggle({ mode, setMode }: AuthModeToggleProps) {
  return (
    <div className="auth-toggle" role="tablist" aria-label="Modo de autenticação">
      <button type="button" className={mode === 'sign-in' ? 'active' : 'ghost'} onClick={() => setMode('sign-in')}>
        Entrar
      </button>
      <button type="button" className={mode === 'sign-up' ? 'active' : 'ghost'} onClick={() => setMode('sign-up')}>
        Criar conta
      </button>
    </div>
  )
}

function ForgotPasswordLink({ mode, setMode }: ForgotPasswordLinkProps) {
  if (mode !== 'sign-in') {
    return null
  }

  return (
    <button type="button" className="text-link" onClick={() => setMode('forgot-password')}>
      Esqueci a senha
    </button>
  )
}

function Panel({ children, copy, title }: PanelProps) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="eyebrow">Supabase + React</div>
        <h1>{title}</h1>
        <p className="auth-copy">{copy}</p>
        {children}
      </section>
    </main>
  )
}

function AuthFeedback({ error, formError }: AuthFeedbackProps) {
  return (
    <>
      {formError ? <p className="feedback error">{formError}</p> : null}
      {error ? <p className="feedback error">{error}</p> : null}
    </>
  )
}

function buildContent(mode: AuthMode, isRecoveryMode: boolean) {
  if (isRecoveryMode) {
    return {
      title: 'Defina sua nova senha',
      copy: 'Digite a nova senha para concluir a recuperação da conta.',
      button: 'Salvar nova senha',
      loading: 'Salvando...',
    }
  }
  if (mode === 'sign-up') {
    return {
      title: 'Finanças',
      copy: 'Crie sua conta com email e senha para acessar o dashboard.',
      button: 'Criar conta',
      loading: 'Criando...',
    }
  }
  if (mode === 'forgot-password') {
    return {
      title: 'Recuperar senha',
      copy: 'Informe seu email para receber o link de redefinição de senha.',
      button: 'Enviar link de recuperação',
      loading: 'Enviando...',
    }
  }
  return {
    title: 'Finanças',
    copy: 'Entre com email e senha para abrir o dashboard e revisar seus lançamentos direto no Supabase.',
    button: 'Entrar',
    loading: 'Entrando...',
  }
}

function AuthFormBody({
  confirmPassword,
  email,
  isRecoveryMode,
  loading,
  mode,
  onDismissRecovery,
  password,
  setConfirmPassword,
  setEmail,
  setPassword,
}: AuthFormBodyProps) {
  return (
    <>
      {!isRecoveryMode ? (
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            required
          />
        </label>
      ) : null}
      {mode === 'sign-in' && !isRecoveryMode ? (
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha"
            minLength={6}
            required
          />
        </label>
      ) : null}
      {mode === 'sign-up' || isRecoveryMode ? (
        <PasswordFields
          confirmPassword={confirmPassword}
          password={password}
          setConfirmPassword={setConfirmPassword}
          setPassword={setPassword}
        />
      ) : null}
      {isRecoveryMode ? (
        <button type="button" className="ghost" onClick={onDismissRecovery} disabled={loading}>
          Voltar ao login
        </button>
      ) : null}
    </>
  )
}

export function SignIn({
  error,
  isRecoveryMode,
  loading,
  onDismissRecovery,
  onPasswordReset,
  onPasswordUpdate,
  onSignIn,
  onSignUp,
}: SignInProps) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const content = buildContent(mode, isRecoveryMode)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')

    if (isRecoveryMode || mode === 'sign-up') {
      if (password !== confirmPassword) {
        setFormError('As senhas não coincidem.')
        return
      }
    }

    if (isRecoveryMode) {
      await onPasswordUpdate(password)
      return
    }
    if (mode === 'forgot-password') {
      await onPasswordReset(email)
      return
    }
    if (mode === 'sign-up') {
      await onSignUp(email, password)
      return
    }
    await onSignIn(email, password)
  }

  return (
    <Panel title={content.title} copy={content.copy}>
      {!isRecoveryMode ? <AuthModeToggle mode={mode} setMode={setMode} /> : null}
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthFormBody
          confirmPassword={confirmPassword}
          email={email}
          isRecoveryMode={isRecoveryMode}
          loading={loading}
          mode={mode}
          onDismissRecovery={onDismissRecovery}
          password={password}
          setConfirmPassword={setConfirmPassword}
          setEmail={setEmail}
          setPassword={setPassword}
        />
        <button type="submit" disabled={loading}>
          {loading ? content.loading : content.button}
        </button>
      </form>
      {!isRecoveryMode ? <ForgotPasswordLink mode={mode} setMode={setMode} /> : null}
      <AuthFeedback error={error} formError={formError} />
    </Panel>
  )
}
