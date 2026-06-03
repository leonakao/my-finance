import { useEffect, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

const GROUP_LABELS = ['50 Necessidades', '30 Desejos', '20 Futuro']
const GROUP_TARGETS = {
  '50 Necessidades': 50,
  '30 Desejos': 30,
  '20 Futuro': 20,
}
const CATEGORY_OPTIONS = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Assinaturas',
  'Investimentos',
  'Salário',
  'Telefone',
  'Outros',
]

const IMPORT_OPTIONS = [
  { value: 'account', label: 'Nubank conta (CSV)' },
  { value: 'card', label: 'Nubank cartão (CSV)' },
]

function toCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function toPercent(value) {
  return `${(value || 0).toFixed(2)}%`
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-')
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1, 1))
}

function normalizeTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    description: row.description ?? '',
    amount: Number(row.amount ?? 0),
    type: row.type ?? 'Despesa',
    category: row.category ?? 'Outros',
    budgetGroup: row.budget_group ?? '30 Desejos',
    account: row.account ?? '',
    institution: row.institution ?? '',
    status: row.status ?? 'Confirmado',
    notes: row.notes ?? row.observations ?? '',
  }
}

function buildMonthData(transactions) {
  const monthMap = new Map()

  for (const transaction of transactions) {
    if (!transaction.date) continue
    const month = transaction.date.slice(0, 7)
    if (!monthMap.has(month)) {
      monthMap.set(month, {
        revenue: 0,
        groups: {
          '50 Necessidades': { total: 0, byCategory: {}, transactions: [] },
          '30 Desejos': { total: 0, byCategory: {}, transactions: [] },
          '20 Futuro': { total: 0, byCategory: {}, transactions: [] },
        },
      })
    }

    const bucket = monthMap.get(month)
    if (transaction.status !== 'Confirmado') continue

    if (transaction.type === 'Receita' || transaction.budgetGroup === 'Receita') {
      bucket.revenue += transaction.amount
      continue
    }

    if (!GROUP_LABELS.includes(transaction.budgetGroup)) continue
    const group = bucket.groups[transaction.budgetGroup]
    group.total += transaction.amount
    group.transactions.push(transaction)
    group.byCategory[transaction.category] = (group.byCategory[transaction.category] || 0) + transaction.amount
  }

  return monthMap
}

function SignIn({ onSignIn, loading, error }) {
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

function MissingConfig() {
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

function SummaryTable({ monthKey, monthData }) {
  const rows = GROUP_LABELS.map((group) => {
    const total = monthData.groups[group].total
    const percent = monthData.revenue ? (total / monthData.revenue) * 100 : 0
    const target = GROUP_TARGETS[group]
    return {
      group,
      total,
      percent,
      target,
      difference: percent - target,
    }
  })

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Resumo por grupo</div>
          <h2>{monthLabel(monthKey)}</h2>
        </div>
        <div className="revenue-chip">
          Receita do mes
          <strong>{toCurrency(monthData.revenue)}</strong>
        </div>
      </div>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Total gasto</th>
            <th>% da receita</th>
            <th>Meta</th>
            <th>Diferenca</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.group}>
              <td>{row.group}</td>
              <td>{toCurrency(row.total)}</td>
              <td>{toPercent(row.percent)}</td>
              <td>{toPercent(row.target)}</td>
              <td className={row.difference > 0 ? 'positive' : 'negative'}>{toPercent(row.difference)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function CategorySection({ group, monthData }) {
  const rows = Object.entries(monthData.groups[group].byCategory)
    .map(([category, total]) => ({
      category,
      total,
      percent: monthData.revenue ? (total / monthData.revenue) * 100 : 0,
    }))
    .sort((left, right) => right.total - left.total)

  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">{group}</div>
          <h3>Categorias</h3>
        </div>
      </div>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Total gasto</th>
            <th>% da receita</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={`${group}-${row.category}`}>
                <td>{row.category}</td>
                <td>{toCurrency(row.total)}</td>
                <td>{toPercent(row.percent)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="empty-cell">
                Nenhum lancamento neste grupo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

function TransactionTable({ transactions, savingId, onUpdate }) {
  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Revisao</div>
          <h3>Lancamentos do mes</h3>
        </div>
      </div>
      <div className="table-wrap">
        <table className="transactions-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descricao</th>
              <th>Valor</th>
              <th>Categoria</th>
              <th>Grupo</th>
              <th>Conta</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.date}</td>
                <td>
                  <div className="description-cell">
                    <strong>{transaction.description}</strong>
                    <span>{transaction.institution || transaction.notes || 'Sem observacoes'}</span>
                  </div>
                </td>
                <td>{toCurrency(transaction.amount)}</td>
                <td>
                  <select
                    value={transaction.category}
                    onChange={(event) => onUpdate(transaction.id, 'category', event.target.value)}
                    disabled={savingId === transaction.id}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={transaction.budgetGroup}
                    onChange={(event) => onUpdate(transaction.id, 'budget_group', event.target.value)}
                    disabled={savingId === transaction.id}
                  >
                    {GROUP_LABELS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{transaction.account || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ImportPanel({ onImport, loading }) {
  const [kind, setKind] = useState('account')
  const [invoice, setInvoice] = useState('')
  const [file, setFile] = useState(null)

  return (
    <section className="panel">
      <div className="panel-header compact">
        <div>
          <div className="eyebrow">Importar</div>
          <h3>CSV do Nubank</h3>
        </div>
      </div>
      <form
        className="import-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!file) return
          onImport({ kind, invoice, file })
        }}
      >
        <label>
          Tipo de arquivo
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            {IMPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Referência da fatura
          <input
            type="text"
            value={invoice}
            onChange={(event) => setInvoice(event.target.value)}
            placeholder="Opcional para cartão"
            disabled={kind !== 'card'}
          />
        </label>
        <label>
          Arquivo CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={loading || !file}>
          {loading ? 'Importando...' : 'Importar para o Supabase'}
        </button>
      </form>
    </section>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [signInLoading, setSignInLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [savingId, setSavingId] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  async function loadTransactions() {
    if (!supabase || !session) return

    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('transactions')
      .select(
        'id, date, description, amount, type, category, budget_group, account, institution, status, notes, observations',
      )
      .order('date', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    const normalized = (data ?? []).map(normalizeTransaction)
    setTransactions(normalized)

    const availableMonths = [...new Set(normalized.map((item) => item.date?.slice(0, 7)).filter(Boolean))].sort().reverse()
    setSelectedMonth((current) => current || availableMonths[0] || '')
    setLoading(false)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
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

  useEffect(() => {
    if (!session || !supabase) return
    loadTransactions()
  }, [session])

  if (!supabase) {
    return <MissingConfig />
  }

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

  async function handleUpdate(id, field, value) {
    setSavingId(id)
    setError('')

    const { error: updateError } = await supabase.from('transactions').update({ [field]: value }).eq('id', id)
    if (updateError) {
      setError(updateError.message)
      setSavingId('')
      return
    }

    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              [field === 'budget_group' ? 'budgetGroup' : field]: value,
            }
          : transaction,
      ),
    )
    setSavingId('')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setTransactions([])
    setSelectedMonth('')
  }

  async function handleImport({ kind, invoice, file }) {
    if (!supabase || !file) return

    setImportLoading(true)
    setError('')
    setFeedback('')

    const csvText = await file.text()
    const { data, error: invokeError } = await supabase.functions.invoke('import-nubank-csv', {
      body: {
        kind,
        invoice,
        filename: file.name,
        csvText,
      },
    })

    if (invokeError) {
      setError(invokeError.message)
      setImportLoading(false)
      return
    }

    setFeedback(
      `Importação concluída: ${data.imported} linhas, ${data.confirmed} confirmadas, ${data.ignored} ignoradas.`,
    )
    setImportLoading(false)
    await loadTransactions()
  }

  if (!session) {
    return <SignIn onSignIn={handleSignIn} loading={signInLoading} error={error || feedback} />
  }

  const monthMap = buildMonthData(transactions)
  const months = [...monthMap.keys()].sort().reverse()
  const activeMonth = selectedMonth || months[0] || ''
  const monthData = activeMonth ? monthMap.get(activeMonth) : null
  const monthTransactions = transactions
    .filter((transaction) => transaction.date?.startsWith(activeMonth))
    .filter((transaction) => transaction.status === 'Confirmado')
    .sort((left, right) => right.amount - left.amount)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Financas pessoais</div>
          <h1>Resumo mensal e revisao</h1>
        </div>
        <div className="toolbar">
          <select value={activeMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {months.map((month) => (
              <option key={month} value={month}>
                {monthLabel(month)}
              </option>
            ))}
          </select>
          <button type="button" className="ghost" onClick={handleSignOut}>
            Sair
          </button>
        </div>
      </header>

      {loading ? <p className="feedback">Carregando dados...</p> : null}
      {error ? <p className="feedback error">{error}</p> : null}
      {feedback && !error ? <p className="feedback">{feedback}</p> : null}

      {!loading ? <ImportPanel onImport={handleImport} loading={importLoading} /> : null}

      {!loading && monthData ? (
        <>
          <SummaryTable monthKey={activeMonth} monthData={monthData} />
          <div className="grid two-up">
            {GROUP_LABELS.map((group) => (
              <CategorySection key={group} group={group} monthData={monthData} />
            ))}
          </div>
          <TransactionTable transactions={monthTransactions} savingId={savingId} onUpdate={handleUpdate} />
        </>
      ) : null}

      {!loading && !monthData ? (
        <section className="panel">
          <h2>Nenhum dado encontrado</h2>
          <p className="muted">
            O app espera uma tabela <code>transactions</code> no Supabase com os campos usados neste dashboard.
          </p>
        </section>
      ) : null}
    </main>
  )
}

export default App
