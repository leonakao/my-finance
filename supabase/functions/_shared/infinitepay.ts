import type { DefaultBudgetGroupName, ParsedImportedTransaction } from './budget-groups.ts'

export class ImportFormatError extends Error {}

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

function decimalFromCurrency(value: string): number {
  const normalized = value.trim().replace(/\s+/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.')
  if (!normalized) return 0
  return Number(normalized)
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function buildDescription(row: Record<string, string>): string {
  const transactionType = row['Tipo de transação']?.trim() ?? ''
  const name = row.Nome?.trim() ?? ''
  const detail = row.Detalhe?.trim() ?? ''

  if (transactionType === 'Depósito de vendas' && detail) {
    return detail
  }

  if (!detail || normalizeText(detail) === normalizeText(transactionType)) {
    return name || transactionType
  }

  if (!name) return `${transactionType} - ${detail}`
  return `${name} - ${detail}`
}

function transactionTypeFor(
  sourceType: string,
  detail: string,
  amount: number,
): ParsedImportedTransaction['type'] {
  const normalizedSourceType = normalizeText(sourceType)
  const normalizedDetail = normalizeText(detail)

  if (normalizedSourceType.includes('DEPOSITO DE VENDAS')) return 'Receita'
  if (normalizedSourceType.includes('ESTORNO') || normalizedDetail.includes('ESTORNO')) {
    return amount >= 0 ? 'Receita' : 'Despesa'
  }
  if (normalizedSourceType.includes('TARIFA')) return 'Despesa'
  if (normalizedSourceType.includes('PIX')) return amount >= 0 ? 'Receita' : 'Despesa'
  if (amount < 0) return 'Despesa'
  return 'Receita'
}

function categoryFor(sourceType: string, detail: string, amount: number): string {
  const normalizedSourceType = normalizeText(sourceType)
  const normalizedDetail = normalizeText(detail)

  if (normalizedSourceType.includes('DEPOSITO DE VENDAS')) return 'Venda'
  if (normalizedSourceType.includes('TARIFA')) return 'Serviços financeiros'
  if (normalizedSourceType.includes('ESTORNO') || normalizedDetail.includes('ESTORNO')) return 'Reembolso'
  if (normalizedSourceType.includes('PIX')) return amount >= 0 ? 'Outros' : 'Outros'
  return amount < 0 ? 'Outros' : 'Outros'
}

function budgetGroupFor(type: ParsedImportedTransaction['type'], category: string): DefaultBudgetGroupName | null {
  if (type !== 'Despesa') return null
  if (category === 'Serviços financeiros') return 'Necessidades'
  return 'Desejos'
}

export function parseInfinitePayCsv(params: {
  userId: string
  csvText: string
  filename?: string
}): ParsedImportedTransaction[] {
  const headerLine = params.csvText.replace(/^\uFEFF/, '').split(/\r?\n/).find((line) => line.trim() !== '') ?? ''
  const normalizedHeader = headerLine.trim().toLowerCase()

  if (normalizedHeader !== 'data,hora,tipo de transação,nome,detalhe,valor') {
    throw new ImportFormatError(
      'O arquivo não parece ser um extrato CSV do InfinitePay (cabeçalho esperado: "Data,Hora,Tipo de transação,Nome,Detalhe,Valor"). Confira se o tipo de arquivo selecionado está correto.',
    )
  }

  const rows = csvObjects(params.csvText)
  return rows.map((row) => {
    const amount = decimalFromCurrency(row.Valor)
    const description = buildDescription(row)
    const type = transactionTypeFor(row['Tipo de transação'] ?? '', row.Detalhe ?? '', amount)
    const category = categoryFor(row['Tipo de transação'] ?? '', row.Detalhe ?? '', amount)

    return {
      user_id: params.userId,
      date: row.Data,
      description,
      amount: Math.abs(amount),
      type,
      category,
      budget_group_name: budgetGroupFor(type, category),
      account: 'Conta digital',
      institution: 'InfinitePay',
      ignored: false,
      notes: '',
      invoice: '',
      installment: '',
      external_id: `infinitepay:${row.Data}:${row.Hora}:${row['Tipo de transação']}:${row.Nome}:${row.Detalhe}:${Math.abs(amount).toFixed(2)}`,
      source: 'InfinitePay',
    }
  })
}
