export function MissingConfig() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="eyebrow">Configuração necessária</div>
        <h1>Variáveis do Supabase ausentes</h1>
        <p className="auth-copy">
          Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> em
          <code>web/.env.local</code>.
        </p>
      </section>
    </main>
  )
}
