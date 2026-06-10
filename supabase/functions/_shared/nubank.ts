import type { DefaultBudgetGroupName, ParsedImportedTransaction } from './budget-groups.ts'

export type ImportKind = 'account' | 'card'

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

function accountCsvObjects(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const header = ['Data', 'Valor', 'Identificador', 'Descrição']

  return lines.slice(1).map((line) => {
    const firstComma = line.indexOf(',')
    const secondComma = line.indexOf(',', firstComma + 1)
    const thirdComma = line.indexOf(',', secondComma + 1)
    return {
      [header[0]]: line.slice(0, firstComma),
      [header[1]]: line.slice(firstComma + 1, secondComma),
      [header[2]]: line.slice(secondComma + 1, thirdComma),
      [header[3]]: line.slice(thirdComma + 1),
    }
  })
}

function isoFromBr(date: string): string {
  const [day, month, year] = date.split('/')
  return `${year}-${month}-${day}`
}

function isRdbApplication(description: string): boolean {
  return description.toUpperCase().includes('APLICAÇÃO RDB')
}

function isRdbRedemption(description: string): boolean {
  return description.toUpperCase().includes('RESGATE RDB')
}

function categoryFor(description: string, amount: number): string {
  const text = description.toUpperCase()
  const rules: Array<[string, string[]]> = [
    ['Moradia', ['DÉBITO EM CONTA', 'DEBITO EM CONTA']],
    ['Assinaturas', ['SPOTIFY', 'NETFLIX', 'APPLE.COM/BILL', 'YOUTUBE', 'AMAZON PRIME']],
    ['Saúde', ['SEGURO', 'DROGARIA', 'DROGASIL', 'FARMACIA']],
    ['Telefone', ['TIM', 'VIVO', 'CLARO', 'OI ']],
    ['Alimentação', ['IFOOD', 'RESTAURANTE', 'LANCHES', 'PADARIA', 'MERCADO', 'SUPERMERCADO']],
    ['Investimentos', ['RDB', 'CDB', 'TESOURO', 'CORRETORA', 'INVEST']],
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

  if (isRdbApplication(description)) return ['Despesa', 'Confirmado']
  if (isRdbRedemption(description)) return ['Receita', 'Confirmado']
  if (text.includes('TRANSFERÊNCIA RECEBIDA')) return ['Receita', 'Confirmado']
  if (text.includes('PAGAMENTO DE FATURA')) {
    return ['Transferência', 'Confirmado']
  }
  if (['RDB', 'CDB', 'TESOURO', 'CORRETORA', 'INVEST'].some((needle) => text.includes(needle))) {
    return ['Transferência', 'Confirmado']
  }
  if (amount < 0) return ['Despesa', 'Confirmado']
  return ['Receita', 'Confirmado']
}

function budgetGroupFor(
  kind: string,
  status: string,
  category: string,
  description: string,
  amount: number,
): DefaultBudgetGroupName | null {
  const text = description.toUpperCase()
  if (status === 'Ignorar') return null
  if (kind === 'Receita') return null
  if (text.includes('DÉBITO EM CONTA') || text.includes('DEBITO EM CONTA')) return 'Necessidades'
  if (kind === 'Transferência') {
    if (category === 'Investimentos' || ['APLICAÇÃO RDB', 'RDB', 'CDB', 'TESOURO', 'CORRETORA', 'INVEST'].some((needle) => text.includes(needle))) {
      return 'Futuro'
    }
    return null
  }
  if (['Saúde', 'Moradia', 'Telefone'].includes(category)) return 'Necessidades'
  if (category === 'Transporte') return 'Necessidades'
  if (category === 'Alimentação') {
    if (['BAR', 'CAFE', 'PUB', 'SUSHI', 'PIZZARIA', 'LANCHES'].some((needle) => text.includes(needle))) {
      return 'Desejos'
    }
    return 'Necessidades'
  }
  return 'Desejos'
}

export function parseNubankCsv(params: {
  userId: string
  kind: ImportKind
  csvText: string
  invoice?: string
  filename?: string
}): ParsedImportedTransaction[] {
  const invoice = params.invoice ?? ''

  if (params.kind === 'card') {
    const rows = csvObjects(params.csvText)
    return rows.map((row, index) => {
      const amount = Number(row.amount)
      const [type, status] = transactionType(amount, row.title, 'card')
      const category = categoryFor(row.title, amount)
      return {
        user_id: params.userId,
        date: row.date,
        description: row.title,
        amount: Math.abs(amount),
        type,
        category,
        budget_group_name: budgetGroupFor(type, status, category, row.title, amount),
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

  const rows = accountCsvObjects(params.csvText)
  return rows.map((row) => {
    const amount = Number(row['Valor'])
    const description = row['Descrição']
    const [type, status] = transactionType(amount, description, 'account')
    const category = categoryFor(description, amount)
    return {
      user_id: params.userId,
      date: isoFromBr(row['Data']),
      description,
      amount: Math.abs(amount),
      type,
      category,
      budget_group_name: budgetGroupFor(type, status, category, description, amount),
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
