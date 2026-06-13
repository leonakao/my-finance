import { inflate } from 'npm:pako@2.1.0'
import type { DefaultBudgetGroupName, ParsedImportedTransaction } from './budget-groups.ts'
import { extractDateLikeMovementLines, extractMovementLines, parseMovementTransactions, type PdfLine } from './santander-account-parser.ts'

type TextEvent = {
  page: number
  y: number
  x: number
  text: string
}

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

function textFromTjString(raw: string): string {
  const match = raw.match(/\((?<text>(?:\\.|[^\\)])*)\)/s)
  return match?.groups?.text ? decodePdfString(match.groups.text) : ''
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
    /BT|ET|\/[A-Za-z0-9]+\s+[-\d.]+\s+Tf|[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+Tm|[-\d.]+\s+[-\d.]+\s+Td|\[(?:\\.|[^\]])*\]\s*TJ|\((?:\\.|[^\\)])*\)\s*Tj/gs

  for (const stream of inflateStreams(pdfBytes)) {
    if (!stream.includes('TJ') && !stream.includes('Tj')) continue
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
      if (token.endsWith(' Tf')) continue
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
        continue
      }
      if (token.endsWith('Tj')) {
        const text = normalizeWhitespace(textFromTjString(token.slice(0, -2)))
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
      let lastX = -Infinity

      for (const event of [...rowEvents].sort((left, right) => left.x - right.x)) {
        const gap = event.x - lastX
        if (text && gap > 8 && !text.endsWith(' ') && !event.text.startsWith(' ')) {
          text += ' '
        }
        text += event.text
        lastX = event.x
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

function brlFromNumber(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

export async function parseSantanderAccountPdf(params: {
  userId: string
  pdfBytes: Uint8Array
  filename?: string
}): Promise<ParsedImportedTransaction[]> {
  const events = extractTextEvents(params.pdfBytes)
  const lines = eventsToLines(events)
  const statementYear = inferStatementYear(lines)
  const movementLines = extractMovementLines(lines)
  const effectiveMovementLines = movementLines.length > 0 ? movementLines : extractDateLikeMovementLines(lines)
  const parsedTransactions = parseMovementTransactions(effectiveMovementLines, statementYear)

  return parsedTransactions.map((transaction, index) => {
    const type = typeFor(transaction.description, transaction.amount)
    const category = categoryFor(transaction.description)
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
      notes: '',
      invoice: '',
      installment: '',
      external_id: `santander-account:${transaction.date}:${index + 1}:${transaction.description}:${Math.abs(transaction.amount).toFixed(2)}`,
      source: 'Santander',
    }
  })
}

export function inspectSantanderAccountPdf(pdfBytes: Uint8Array) {
  const streams = inflateStreams(pdfBytes)
  const events = extractTextEvents(pdfBytes)
  const lines = eventsToLines(events)
  const statementYear = inferStatementYear(lines)
  const movementLines = extractMovementLines(lines)
  const effectiveMovementLines = movementLines.length > 0 ? movementLines : extractDateLikeMovementLines(lines)
  const parsedTransactions = parseMovementTransactions(effectiveMovementLines, statementYear)

  return {
    streamCount: streams.length,
    streamOperatorHints: streams.slice(0, 10).map((stream) => ({
      hasTJ: stream.includes('TJ'),
      hasTj: stream.includes(' Tj'),
      hasTm: stream.includes(' Tm'),
      hasTd: stream.includes(' Td'),
      snippet: stream.slice(0, 300),
    })),
    eventCount: events.length,
    lineCount: lines.length,
    statementYear,
    movementLineCount: movementLines.length,
    effectiveMovementLineCount: effectiveMovementLines.length,
    parsedTransactionCount: parsedTransactions.length,
    sampleTexts: events.slice(0, 20).map((event) => event.text),
    sampleLines: lines.slice(0, 20).map((line) => line.text),
    dateLikeLines: lines
      .map((line) => line.text)
      .filter((text) => /\b\d{2}\/\d{2}\b/.test(text) || /^\d{2}\s/.test(text))
      .slice(0, 50),
    movementLines: effectiveMovementLines.slice(0, 30),
  }
}
