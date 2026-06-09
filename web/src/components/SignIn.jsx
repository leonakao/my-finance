import { useState } from 'react'

export function SignIn({ onSignIn, loading, error }) {
  const [email, setEmail] = useState('')

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="eyebrow">Supabase + React</div>
        <h1>Finanças</h1>
        <p className="auth-copy">
          Entre com magic link para abrir o dashboard e revisar seus lançamentos direto da tabela
          <code>transactions</code>.
        </p>
        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSignIn(email)
          }}
        >
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
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar magic link'}
          </button>
        </form>
        {error ? <p className="feedback error">{error}</p> : null}
      </section>
    </main>
  )
}
