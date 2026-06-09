import { getDocument } from 'npm:pdfjs-dist@6.0.227/legacy/build/pdf.mjs'
import type { DefaultBudgetGroupName, ParsedImportedTransaction } from './budget-groups.ts'

type PdfTextItem = {
  str: string
  transform: number[]
  width: number
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
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

function transactionStatus(): 'Confirmado' | 'Ignorar' {
  return 'Confirmado'
}

function isOwnTransfer(description: string): boolean {
  return description.toUpperCase().includes('LEONARDO NAKAO')
}

function isCardPayment(description: string): boolean {
  return description.toUpperCase().includes('PAGAMENTO CARTAO CREDITO')
}

function isInvestmentIncome(description: string): boolean {
  return description.toUpperCase().includes('REMUNERACAO APLICACAO AUTOMATICA')
}

function categoryFor(description: string): string {
  const text = description.toUpperCase()
  if (isInvestmentIncome(description)) return 'Investimentos'
  if (text.includes('VERO')) return 'Moradia'
  if (['CHATGPT', 'OPENAI', 'WINDSURF', 'SPOTIFY', 'NETFLIX', 'APPLE.COM/BILL', 'IFOOD CLUB'].some((needle) => text.includes(needle))) {
    return 'Assinaturas'
  }
  if (['SEGURO VIDA', 'SEGURO CELULAR', 'YELUMSEG'].some((needle) => text.includes(needle))) return 'Saúde'
  if (['UBER', 'POSTO'].some((needle) => text.includes(needle))) return 'Transporte'
  if (['IFOOD', 'BAR', 'CAFE', 'PIZZARIA', 'LANCHES'].some((needle) => text.includes(needle))) return 'Alimentação'
  return 'Outros'
}

function typeFor(description: string, amount: number): 'Despesa' | 'Receita' | 'Transferência' {
  if (isCardPayment(description) || isOwnTransfer(description)) return 'Transferência'
  if (isInvestmentIncome(description)) return 'Receita'
  return amount < 0 ? 'Despesa' : 'Receita'
}

function budgetGroupFor(
  type: 'Despesa' | 'Receita' | 'Transferência',
  category: string,
  description: string,
) : DefaultBudgetGroupName | null {
  const text = description.toUpperCase()
  if (type === 'Receita') return null
  if (type === 'Transferência') return category === 'Investimentos' ? 'Futuro' : null
  if (['Moradia', 'Saúde', 'Telefone', 'Transporte'].includes(category)) return 'Necessidades'
  if (category === 'Alimentação') {
    if (['BAR', 'CAFE', 'PIZZARIA', 'LANCHES'].some((needle) => text.includes(needle))) return 'Desejos'
    return 'Necessidades'
  }
  if (['VERO', 'OPENAI', 'CHATGPT', 'WINDSURF'].some((needle) => text.includes(needle))) return 'Necessidades'
  return 'Desejos'
}

function joinLineItems(items: Array<{ x: number; width: number; str: string }>): string {
  let text = ''
  let endX = -Infinity

  for (const item of items.sort((left, right) => left.x - right.x)) {
    if (!item.str) continue
    const gap = item.x - endX
    if (text && gap > 3 && !text.endsWith(' ') && !item.str.startsWith(' ')) text += ' '
    text += item.str
    endX = Math.max(endX, item.x + item.width)
  }

  return normalizeWhitespace(text)
}

async function extractPdfLines(pdfBytes: Uint8Array): Promise<PdfLine[]> {
  const document = await getDocument({
    data: pdfBytes,
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise

  const lines: PdfLine[] = []

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const rows = new Map<number, Array<{ x: number; width: number; str: string }>>()

    for (const item of content.items as PdfTextItem[]) {
      const y = Math.round(item.transform[5] * 10) / 10
      rows.set(y, [...(rows.get(y) ?? []), { x: item.transform[4], width: item.width, str: item.str }])
    }

    for (const [y, rowItems] of [...rows.entries()].sort((left, right) => right[0] - left[0])) {
      const text = joinLineItems(rowItems)
      if (!text) continue
      lines.push({ page: pageNumber, y, text })
    }
  }

  return lines
}

function extractMovementLines(lines: PdfLine[]): string[] {
  const pageLines = [...lines].sort((left, right) => {
    if (left.page !== right.page) return left.page - right.page
    return right.y - left.y
  })

  const movementLines: string[] = []
  let inSection = false
  let movementPage = 0

  for (const line of pageLines) {
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
  const lines = await extractPdfLines(params.pdfBytes)
  const statementYear = inferStatementYear(lines)
  const movementLines = extractMovementLines(lines)
  const parsedTransactions = parseMovementTransactions(movementLines, statementYear)

  return parsedTransactions.map((transaction, index) => {
    const type = typeFor(transaction.description, transaction.amount)
    const category = categoryFor(transaction.description)
    const status = transactionStatus()
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
      status,
      notes: notesParts.join(' '),
      invoice: '',
      installment: '',
      external_id: `santander-account:${transaction.date}:${index + 1}:${transaction.description}:${Math.abs(transaction.amount).toFixed(2)}`,
      source: 'Santander',
    }
  })
}
