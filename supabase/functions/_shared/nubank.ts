export type ImportKind = 'account' | 'card'

export type ImportedTransaction = {
  user_id: string
  date: string
  description: string
  amount: number
  type: 'Despesa' | 'Receita' | 'Transferência'
  category: string
  budget_group: string
  account: string
  institution: string
  status: 'Confirmado' | 'Pendente' | 'Ignorar'
  notes: string
  invoice: string
  installment: string
  external_id: string
  source: string
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      field = ''
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      continue
    }

    field += char
  }

  row.push(field)
  if (row.some((value) => value.length > 0)) rows.push(row)
  return rows
}

function csvObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''))
  if (!rows.length) return []
  const [header, ...data] = rows
  return data.map((line) =>
    header.reduce<Record<string, string>>((record, key, index) => {
      record[key] = line[index] ?? ''
      return record
    }, {}),
  )
}

function isoFromBr(date: string): string {
  const [day, month, year] = date.split('/')
  return `${year}-${month}-${day}`
}

function categoryFor(description: string): string {
  const text = description.toUpperCase()
  const rules: Array<[string, string[]]> = [
    ['Moradia', ['DÉBITO EM CONTA', 'DEBITO EM CONTA']],
    ['Assinaturas', ['SPOTIFY', 'NETFLIX', 'APPLE.COM/BILL', 'CHATGPT', 'OPENAI', 'WINDSURF', 'IFOOD CLUB']],
    ['Saúde', ['SEGURO VIDA', 'SEGURO CELULAR', 'YELUMSEG']],
    ['Telefone', ['BCO C6', 'BANCO C6', ' C6 ']],
    ['Alimentação', ['COMERCIALBARROS', 'IFOOD']],
    ['Investimentos', ['RDB', 'AVENUE SECURITIES', 'BANCO INTER', 'BCO INTER', 'INTER']],
    ['Transporte', ['UBER', 'POSTO']],
  ]

  for (const [category, needles] of rules) {
    if (needles.some((needle) => text.includes(needle))) return category
  }
  return 'Outros'
}

function transactionType(amount: number, description: string, source: ImportKind): ['Despesa' | 'Receita' | 'Transferência', 'Confirmado' | 'Ignorar'] {
  const text = description.toUpperCase()
  if (source === 'card') {
    if (amount < 0 || text.includes('IOF DE VOLTA') || text.includes('PAGAMENTO RECEBIDO')) {
      return ['Transferência', 'Ignorar']
    }
    return ['Despesa', 'Confirmado']
  }

  if (text.includes('TRANSFERÊNCIA RECEBIDA') && text.includes('LEONARDO NAKAO') && amount >= 10000) {
    return ['Receita', 'Confirmado']
  }
  if (text.includes('LEONARDO NAKAO')) return ['Transferência', 'Confirmado']
  if (text.includes('BCO C6') || text.includes('BANCO C6')) return ['Despesa', 'Confirmado']
  if (text.includes('TRANSFERÊNCIA RECEBIDA')) return ['Receita', 'Confirmado']
  if (text.includes('APLICAÇÃO RDB') || text.includes('RESGATE RDB') || text.includes('PAGAMENTO DE FATURA')) {
    return ['Transferência', 'Confirmado']
  }
  if (text.includes('AVENUE SECURITIES') || text.includes('BANCO INTER') || text.includes('BCO INTER')) {
    return ['Transferência', 'Confirmado']
  }
  if (amount < 0) return ['Despesa', 'Confirmado']
  return ['Receita', 'Confirmado']
}

function budgetGroupFor(kind: string, status: string, category: string, description: string): string {
  const text = description.toUpperCase()
  if (status === 'Ignorar') return 'Ignorar'
  if (kind === 'Receita') return 'Receita'
  if (['VERO', 'OPENAI', 'CHATGPT', 'WINDSURF'].some((needle) => text.includes(needle))) return '50 Necessidades'
  if (text.includes('LUCILENE DA SILVA NAKAO')) return '50 Necessidades'
  if (text.includes('DÉBITO EM CONTA') || text.includes('DEBITO EM CONTA')) return '50 Necessidades'
  if (kind === 'Transferência') {
    if (category === 'Investimentos' || ['APLICAÇÃO RDB', 'AVENUE', 'BANCO INTER', 'BCO INTER'].some((needle) => text.includes(needle))) {
      return '20 Futuro'
    }
    return 'Transferência'
  }
  if (['Saúde', 'Moradia', 'Telefone'].includes(category)) return '50 Necessidades'
  if (category === 'Transporte') return '50 Necessidades'
  if (category === 'Alimentação') {
    if (['IFOOD', 'BAR', 'CAFE', 'PUB', 'SUSHI', 'PIZZARIA', 'LANCHES'].some((needle) => text.includes(needle))) {
      return '30 Desejos'
    }
    return '50 Necessidades'
  }
  return '30 Desejos'
}

export function parseNubankCsv(params: {
  userId: string
  kind: ImportKind
  csvText: string
  invoice?: string
  filename?: string
}): ImportedTransaction[] {
  const rows = csvObjects(params.csvText)
  const invoice = params.invoice ?? ''

  if (params.kind === 'card') {
    return rows.map((row, index) => {
      const amount = Number(row.amount)
      const [type, status] = transactionType(amount, row.title, 'card')
      const category = categoryFor(row.title)
      return {
        user_id: params.userId,
        date: row.date,
        description: row.title,
        amount: Math.abs(amount),
        type,
        category,
        budget_group: budgetGroupFor(type, status, category, row.title),
        account: 'Cartão de crédito',
        institution: 'Nubank',
        status,
        notes: 'Importado de CSV de fatura do cartão Nubank via Edge Function.',
        invoice,
        installment: '',
        external_id: `nubank-card:${row.date}:${index + 1}:${row.title}:${row.amount}`,
        source: 'Nubank',
      }
    })
  }

  return rows.map((row) => {
    const amount = Number(row['Valor'].replace(/\./g, '').replace(',', '.'))
    const description = row['Descrição']
    const [type, status] = transactionType(amount, description, 'account')
    const category = categoryFor(description)
    return {
      user_id: params.userId,
      date: isoFromBr(row['Data']),
      description,
      amount: Math.abs(amount),
      type,
      category,
      budget_group: budgetGroupFor(type, status, category, description),
      account: 'Conta principal',
      institution: 'Nubank',
      status,
      notes: 'Importado de CSV de extrato da conta Nubank via Edge Function.',
      invoice: '',
      installment: '',
      external_id: row['Identificador'],
      source: 'Nubank',
    }
  })
}
