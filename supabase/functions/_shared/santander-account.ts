import { inflate } from 'npm:pako@2.1.0'
import type { DefaultBudgetGroupName, ParsedImportedTransaction } from './budget-groups.ts'

type TextEvent = {
  page: number
  y: number
  x: number
  text: string
}

type PdfLine = {
  page: number
  y: number
  text: string
}

type PendingTransaction = {
  date: string
  descriptionParts: string[]
  amount: number | null
  balance: number | null
  startedWithDate: boolean
}

const datePrefixRe = /^(?<date>\d{2}\/\d{2})\s+(?<rest>.*)$/
const amountSuffixRe =
  /(?<description>.*?)(?:\s+|^)-?\s*(?<amount>\d{1,3}(?:\.\d{3})*,\d{2})(?<signal>-?)(?:\s+(?<balance>\d{1,3}(?:\.\d{3})*,\d{2}))?$/

function binaryStringFromBytes(bytes: Uint8Array): string {
  let out = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    out += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return out
}

function bytesFromBinaryString(value: string): Uint8Array {
  const out = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) out[index] = value.charCodeAt(index) & 0xff
  return out
}

function decodePdfString(raw: string): string {
  const out: number[] = []
  let index = 0
  while (index < raw.length) {
    const code = raw.charCodeAt(index)
    if (code === 92) {
      index += 1
      if (index >= raw.length) break
      const next = raw.charCodeAt(index)
      const escapes: Record<number, number> = {
        [110]: 10,
        [114]: 13,
        [116]: 9,
        [98]: 8,
        [102]: 12,
      }
      if (escapes[next]) {
        out.push(escapes[next])
        index += 1
      } else if ([40, 41, 92].includes(next)) {
        out.push(next)
        index += 1
      } else if (next >= 48 && next <= 55) {
        let end = index
        while (end < raw.length && end < index + 3 && raw.charCodeAt(end) >= 48 && raw.charCodeAt(end) <= 55) end += 1
        out.push(Number.parseInt(raw.slice(index, end), 8))
        index = end
      } else {
        out.push(next)
        index += 1
      }
    } else {
      out.push(code)
      index += 1
    }
  }
  return binaryStringFromBytes(new Uint8Array(out))
}

function textFromTjArray(raw: string): string {
  const parts = raw.match(/\((?:\\.|[^\\)])*\)/gs) ?? []
  return parts.map((part) => decodePdfString(part.slice(1, -1))).join('')
}

function inflateStreams(pdfBytes: Uint8Array): string[] {
  const pdf = binaryStringFromBytes(pdfBytes)
  const streams: string[] = []
  const regex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(pdf))) {
    try {
      const inflated = inflate(bytesFromBinaryString(match[1]))
      streams.push(binaryStringFromBytes(inflated))
    } catch {
      continue
    }
  }

  return streams
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function extractTextEvents(pdfBytes: Uint8Array): TextEvent[] {
  const events: TextEvent[] = []
  let page = 0
  const commandRe =
    /BT|ET|\/F\d+\s+1\s+Tf|[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+Tm|[-\d.]+\s+[-\d.]+\s+Td|\[(?:\\.|[^\]])*\]TJ/gs

  for (const stream of inflateStreams(pdfBytes)) {
    if (!stream.includes('TJ')) continue
    page += 1
    let inText = false
    let x = 0
    let y = 0

    for (const match of stream.matchAll(commandRe)) {
      const token = match[0]
      if (token === 'BT') {
        inText = true
        continue
      }
      if (token === 'ET') {
        inText = false
        continue
      }
      if (!inText) continue
      if (token.startsWith('/F')) continue
      if (token.endsWith(' Tm')) {
        const parts = token.trim().split(/\s+/)
        x = Number(parts[4])
        y = Number(parts[5])
        continue
      }
      if (token.endsWith(' Td')) {
        const parts = token.trim().split(/\s+/)
        x += Number(parts[0])
        y += Number(parts[1])
        continue
      }
      if (token.endsWith('TJ')) {
        const text = normalizeWhitespace(textFromTjArray(token.slice(0, -2)))
        if (text) {
          events.push({ page, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, text })
        }
      }
    }
  }

  return events
}

function eventsToLines(events: TextEvent[]): PdfLine[] {
  const rows = new Map<string, TextEvent[]>()

  for (const event of events) {
    const key = `${event.page}:${event.y}`
    rows.set(key, [...(rows.get(key) ?? []), event])
  }

  return [...rows.entries()]
    .map(([key, rowEvents]) => {
      const [pageText, yText] = key.split(':')
      let text = ''
      let endX = -Infinity

      for (const event of [...rowEvents].sort((left, right) => left.x - right.x)) {
        const gap = event.x - endX
        if (text && gap > 3 && !text.endsWith(' ') && !event.text.startsWith(' ')) {
          text += ' '
        }
        text += event.text
        endX = Math.max(endX, event.x + event.text.length)
      }

      return {
        page: Number(pageText),
        y: Number(yText),
        text: normalizeWhitespace(text),
      }
    })
    .filter((line) => line.text)
    .sort((left, right) => {
      if (left.page !== right.page) return left.page - right.page
      return right.y - left.y
    })
}

function decimalFromBrl(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function brlFromNumber(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isoFromStatementDate(date: string, year: number): string {
  const [day, month] = date.split('/')
  return `${year}-${month}-${day}`
}

function inferStatementYear(lines: PdfLine[]): number {
  for (const line of lines) {
    const match = line.text.match(/\/(20\d{2})\b/)
    if (match) return Number(match[1])
  }

  return new Date().getFullYear()
}

function isCardPayment(description: string): boolean {
  return description.toUpperCase().includes('PAGAMENTO CARTAO CREDITO')
}

function isInvestmentIncome(description: string): boolean {
  return description.toUpperCase().includes('REMUNERACAO APLICACAO AUTOMATICA')
}

function isRdbApplication(description: string): boolean {
  return description.toUpperCase().includes('APLICAÇÃO RDB')
}

function isRdbRedemption(description: string): boolean {
  return description.toUpperCase().includes('RESGATE RDB')
}

function isSalaryIncome(description: string): boolean {
  const text = description.toUpperCase()
  return text.includes('SALARIO') || text.includes('SALÁRIO') || text.includes('FOLHA') || text.includes('PROVENTO')
}

function categoryFor(description: string): string {
  const text = description.toUpperCase()
  if (isCardPayment(description)) return 'Pagamento de fatura'
  if (isInvestmentIncome(description)) return 'Rendimentos'
  if (isRdbApplication(description) || isRdbRedemption(description)) return 'Investimentos'
  if (isSalaryIncome(description)) return 'Salário'
  if (['SPOTIFY', 'NETFLIX', 'APPLE.COM/BILL', 'YOUTUBE', 'AMAZON PRIME'].some((needle) => text.includes(needle))) {
    return 'Assinaturas'
  }
  if (['SEGURO', 'SEGURO VIDA', 'SEGURO CELULAR', 'SEGURO AUTO'].some((needle) => text.includes(needle))) return 'Seguros'
  if (['DROGARIA', 'DROGASIL', 'FARMACIA'].some((needle) => text.includes(needle))) return 'Saúde'
  if (['PETZ', 'COBASI', 'PETLOVE', 'PET CARE', 'VETERIN', 'VET '].some((needle) => text.includes(needle))) return 'Pets'
  if (['SALAO', 'SALÃO', 'CABEL', 'BARBEARIA', 'ESTETIC', 'MANICURE', 'SEPHORA', 'BOTICARIO', 'OBOTICARIO'].some((needle) => text.includes(needle))) return 'Cuidados pessoais'
  if (['UBER', 'POSTO', 'SEM PARAR', 'SEM*PARAR'].some((needle) => text.includes(needle))) return 'Transporte'
  if (['IFOOD', 'BAR', 'CAFE', 'PIZZARIA', 'LANCHES', 'RESTAURANTE', 'PADARIA', 'MERCADO', 'SUPERMERCADO'].some((needle) => text.includes(needle))) return 'Alimentação'
  return 'Outros'
}

function typeFor(description: string, amount: number): 'Despesa' | 'Receita' | 'Transferência' {
  if (isCardPayment(description)) return 'Transferência'
  if (isRdbApplication(description)) return 'Transferência'
  if (isRdbRedemption(description)) return 'Transferência'
  if (isInvestmentIncome(description)) return 'Receita'
  return amount < 0 ? 'Despesa' : 'Receita'
}

function budgetGroupFor(
  type: 'Despesa' | 'Receita' | 'Transferência',
  category: string,
  description: string,
): DefaultBudgetGroupName | null {
  const text = description.toUpperCase()
  if (type === 'Receita') return null
  if (type === 'Transferência') return category === 'Investimentos' ? 'Futuro' : null
  if (['Moradia', 'Saúde', 'Seguros', 'Telefone', 'Transporte', 'Pets'].includes(category)) return 'Necessidades'
  if (category === 'Cuidados pessoais') return 'Desejos'
  if (category === 'Alimentação') {
    if (['BAR', 'CAFE', 'PIZZARIA', 'LANCHES'].some((needle) => text.includes(needle))) return 'Desejos'
    return 'Necessidades'
  }
  return 'Desejos'
}

function extractMovementLines(lines: PdfLine[]): string[] {
  const movementLines: string[] = []
  let inSection = false
  let movementPage = 0

  for (const line of lines) {
    if (line.text === 'Movimentação') {
      inSection = true
      movementPage = line.page
      continue
    }

    if (!inSection) continue
    if (movementPage && line.page !== movementPage) break
    if (line.text === 'Extrato' || line.text === 'Saldos por Período') break
    if (line.y < 70) continue
    movementLines.push(line.text)
  }

  return movementLines
}

function flushPending(
  pending: PendingTransaction | null,
  year: number,
  transactions: Array<{ date: string; description: string; amount: number; balance: number | null }>,
) {
  if (!pending || pending.amount === null || !pending.date) return null
  const description = normalizeWhitespace(pending.descriptionParts.join(' '))
  if (!description) return null

  transactions.push({
    date: isoFromStatementDate(pending.date, year),
    description,
    amount: pending.amount,
    balance: pending.balance,
  })

  return null
}

function parseMovementTransactions(lines: string[], year: number) {
  const transactions: Array<{ date: string; description: string; amount: number; balance: number | null }> = []
  let currentDate = ''
  let pending: PendingTransaction | null = null

  for (const rawLine of lines) {
    let line = normalizeWhitespace(rawLine)
    if (!line) continue

    let lineDate = ''
    const dateMatch = line.match(datePrefixRe)
    if (dateMatch?.groups) {
      lineDate = dateMatch.groups.date
      line = normalizeWhitespace(dateMatch.groups.rest)
      currentDate = lineDate
    }

    const amountMatch = line.match(amountSuffixRe)
    const description = normalizeWhitespace(amountMatch?.groups?.description ?? line)
    const amountText = amountMatch?.groups?.amount ?? ''
    const balanceText = amountMatch?.groups?.balance ?? ''
    const signedAmount = amountText
      ? decimalFromBrl(amountText) * (amountMatch?.groups?.signal === '-' ? -1 : 1)
      : null
    const balance = balanceText ? decimalFromBrl(balanceText) : null

    if (lineDate && !amountText && pending?.amount !== null && !pending.startedWithDate) {
      pending.date = lineDate
      if (description) pending.descriptionParts.push(description)
      pending.startedWithDate = true
      continue
    }

    if (amountText) {
      if (pending?.amount !== null) pending = flushPending(pending, year, transactions)
      pending = {
        date: lineDate || currentDate,
        descriptionParts: description ? [description] : [],
        amount: signedAmount,
        balance,
        startedWithDate: Boolean(lineDate),
      }
      continue
    }

    if (!pending) {
      pending = {
        date: lineDate || currentDate,
        descriptionParts: description ? [description] : [],
        amount: null,
        balance: null,
        startedWithDate: Boolean(lineDate),
      }
      continue
    }

    if (lineDate && pending.amount !== null) {
      pending = flushPending(pending, year, transactions)
      pending = {
        date: lineDate || currentDate,
        descriptionParts: description ? [description] : [],
        amount: null,
        balance: null,
        startedWithDate: true,
      }
      continue
    }

    if (description) pending.descriptionParts.push(description)
  }

  flushPending(pending, year, transactions)
  return transactions
}

export async function parseSantanderAccountPdf(params: {
  userId: string
  pdfBytes: Uint8Array
  filename?: string
}): Promise<ParsedImportedTransaction[]> {
  const events = extractTextEvents(params.pdfBytes)
  const lines = eventsToLines(events)
  const statementYear = inferStatementYear(lines)
  const movementLines = extractMovementLines(lines)
  const parsedTransactions = parseMovementTransactions(movementLines, statementYear)

  return parsedTransactions.map((transaction, index) => {
    const type = typeFor(transaction.description, transaction.amount)
    const category = categoryFor(transaction.description)
    const notesParts = ['Importado de PDF de extrato Santander via Edge Function.']
    if (transaction.balance !== null) notesParts.push(`Saldo após lançamento: R$ ${brlFromNumber(transaction.balance)}.`)

    return {
      user_id: params.userId,
      date: transaction.date,
      description: transaction.description,
      amount: Math.abs(transaction.amount),
      type,
      category,
      budget_group_name: budgetGroupFor(type, category, transaction.description),
      account: 'Conta principal',
      institution: 'Santander',
      ignored: false,
      notes: notesParts.join(' '),
      invoice: '',
      installment: '',
      external_id: `santander-account:${transaction.date}:${index + 1}:${transaction.description}:${Math.abs(transaction.amount).toFixed(2)}`,
      source: 'Santander',
    }
  })
}
