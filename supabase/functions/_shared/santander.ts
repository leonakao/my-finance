import { inflate } from 'npm:pako@2.1.0'
import type { DefaultBudgetGroupName, ParsedImportedTransaction } from './budget-groups.ts'
import { expandInstallmentSchedule } from './installments.ts'

type TextEvent = {
  page: number
  y: number
  x: number
  font: string
  text: string
}

const dateRe = /(?<day>\d{2})\/(?<month>\d{2})/
const moneyRe = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$|^-?\d+,\d{2}$/
const parcelRe = /^\d{2}\/\d{2}$/

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
    let font = ''

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
      if (token.startsWith('/F')) {
        font = token.split(/\s+/)[0]
        continue
      }
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
        const text = textFromTjArray(token.slice(0, -2)).trim()
        if (text) {
          events.push({ page, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, font, text })
        }
      }
    }
  }

  return events
}

function decimalFromBrl(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function inferClosingMonth(events: TextEvent[]): number {
  for (const event of events) {
    const match = event.text.match(/até\s+(\d{2})\/(\d{2})/)
    if (match) return Number(match[2])
  }
  return 12
}

function inferYear(events: TextEvent[]): number {
  for (const event of events) {
    const match = event.text.match(/\b\d{2}\/\d{2}\/(\d{4})\b/)
    if (match) return Number(match[1])
  }
  return 2026
}

function inferCardByPage(page: number, pageCards: Record<number, string>): string {
  if (pageCards[page]) return pageCards[page]

  for (let current = page - 1; current >= 1; current -= 1) {
    if (pageCards[current]) return pageCards[current]
  }

  return ''
}

function buildCandidateRows(events: TextEvent[]) {
  const rows = new Map<string, TextEvent[]>()

  for (const event of events) {
    const key = `${event.page}:${event.y}`
    rows.set(key, [...(rows.get(key) ?? []), event])
  }

  return rows
}

function detectCandidatePages(rows: Map<string, TextEvent[]>) {
  const pageScores = new Map<number, number>()

  for (const [, rowEvents] of rows) {
    const texts = [...rowEvents].sort((left, right) => left.x - right.x).map((event) => event.text)
    const rowText = texts.join(' ')
    const hasDate = dateRe.test(rowText)
    const hasAmount = texts.some((text) => moneyRe.test(text) && !text.startsWith('-'))
    if (!hasDate || !hasAmount) continue
    const page = rowEvents[0]?.page
    if (!page) continue
    pageScores.set(page, (pageScores.get(page) ?? 0) + 1)
  }

  return new Set(pageScores.keys())
}

function categoryFor(description: string): string {
  const text = description.toUpperCase()
  const rules: Array<[string, string[]]> = [
    ['Assinaturas', ['AMAZONPRIME', 'AMAZON PRIME', 'AMAZON MUSIC', 'YOUTUBE', 'SPOTIFY', 'NETFLIX', 'APPLE.COM/BILL']],
    ['Transporte', ['UBER', 'POSTO', 'SEM PARAR', 'SEM*PARAR', 'AZUL', 'AEREAS']],
    ['Seguros', ['SEGURO', 'SEGURO VIDA', 'SEGURO CELULAR', 'SEGURO AUTO']],
    ['Saúde', ['DROGASIL', 'DROGARIA', 'FARMACIA']],
    ['Pets', ['PETZ', 'COBASI', 'PETLOVE', 'PET CARE', 'VETERIN', 'VET ']],
    ['Cuidados pessoais', ['SALAO', 'SALÃO', 'CABEL', 'BARBEARIA', 'ESTETIC', 'MANICURE', 'SEPHORA', 'BOTICARIO', 'OBOTICARIO']],
    ['Lazer', ['INGRESSO', 'MULTIPLEX', 'AIRBNB']],
    [
      'Alimentação',
      [
        'SUSHI',
        'LANCHES',
        'PIZZARIA',
        'SUPERMERCADO',
        'MERCADO',
        'PADARIA',
        'RESTAURANTE',
      ],
    ],
    ['Compras', ['AMAZON', 'MERCADOLIVRE', 'KABUM', 'CASASBAHIA', 'MARKETPLACE', 'MKTPLC']],
  ]

  for (const [category, needles] of rules) {
    if (needles.some((needle) => text.includes(needle))) return category
  }
  return 'Outros'
}

function budgetGroupFor(category: string, description: string): DefaultBudgetGroupName | null {
  const text = description.toUpperCase()
  if (text.includes('ANUIDADE')) return 'Necessidades'
  if (['Saúde', 'Seguros', 'Moradia', 'Pets'].includes(category)) return 'Necessidades'
  if (category === 'Transporte') return text.includes('AZUL') || text.includes('AEREAS') ? 'Desejos' : 'Necessidades'
  if (category === 'Cuidados pessoais') return 'Desejos'
  if (category === 'Alimentação') {
    if (['SUSHI', 'PASTEL', 'ROOFTOP', 'LANCHES', 'LIBANESA', 'CAFE', 'PUB', 'PIZZARIA', 'LOS BRUTOS', 'MONTANA', 'SALGADOS', 'BOUCHERIE'].some((needle) => text.includes(needle))) {
      return 'Desejos'
    }
    return 'Necessidades'
  }
  if (category === 'Investimentos') return 'Futuro'
  return 'Desejos'
}

export function parseSantanderPdf(params: {
  userId: string
  pdfBytes: Uint8Array
  filename?: string
  invoice?: string
}): ParsedImportedTransaction[] {
  const events = extractTextEvents(params.pdfBytes)
  const closingMonth = inferClosingMonth(events)
  const statementYear = inferYear(events)
  const rows = buildCandidateRows(events)
  const candidatePages = detectCandidatePages(rows)
  const pageCards: Record<number, string> = {}

  for (const event of events) {
    const cardMatch = event.text.match(/(?:XXXX XXXX|5228 XXXX XXXX)\s+(\d{4})/)
    if (cardMatch) {
      pageCards[event.page] = cardMatch[1]
    }
  }

  const transactions: ParsedImportedTransaction[] = []
  let index = 0
  for (const [, rowEvents] of [...rows.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    if (!candidatePages.has(rowEvents[0]?.page ?? 0)) continue
    const ordered = [...rowEvents].sort((left, right) => left.x - right.x)
    const texts = ordered.map((event) => event.text)
    const rowText = texts.join(' ')
    const dateMatch = rowText.match(dateRe)
    if (!dateMatch?.groups) continue

    const positiveAmounts = texts.filter((text) => moneyRe.test(text) && !text.startsWith('-'))
    if (!positiveAmounts.length) continue
    const amountText = positiveAmounts.at(-1) ?? ''

    const firstDateIndex = texts.findIndex((text) => dateRe.test(text))
    const afterDate = texts[firstDateIndex].replace(dateRe, '').trim()
    const descriptionParts: string[] = []
    if (afterDate) descriptionParts.push(afterDate)
    for (const text of texts.slice(firstDateIndex + 1)) {
      if (moneyRe.test(text) || parcelRe.test(text)) continue
      if (['VALOR TOTAL', 'Descrição', 'R$', 'US$'].includes(text)) continue
      descriptionParts.push(text)
    }

    const description = descriptionParts.join(' ').trim()
    if (!description || description.includes('PAGAMENTO DE FATURA')) continue

    let installment = ''
    for (const text of texts.slice(firstDateIndex + 1)) {
      if (parcelRe.test(text)) {
        installment = text
        break
      }
    }

    const day = Number(dateMatch.groups.day)
    const month = Number(dateMatch.groups.month)
    const year = month > closingMonth ? statementYear - 1 : statementYear
    const card = inferCardByPage(ordered[0].page, pageCards)
    const category = categoryFor(description)
    const amount = decimalFromBrl(amountText)
    const originalDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
    const effectiveDate = installment
      ? `${statementYear.toString().padStart(4, '0')}-${closingMonth.toString().padStart(2, '0')}-${Math.min(day, new Date(statementYear, closingMonth, 0).getDate()).toString().padStart(2, '0')}`
      : originalDate
    const purchaseKey = `santander-card:${originalDate}:${index}:${card}:${description}:${amount.toFixed(2)}`
    const notes = installment
      ? `Importado de PDF de fatura Santander via Edge Function. Compra original em ${originalDate}. Parcela ${installment}.`
      : 'Importado de PDF de fatura Santander via Edge Function.'

    const transaction: ParsedImportedTransaction = {
      user_id: params.userId,
      date: effectiveDate,
      description,
      amount,
      type: 'Despesa',
      category,
      budget_group_name: budgetGroupFor(category, description),
      account: 'Cartão de crédito',
      institution: 'Santander',
      ignored: false,
      notes,
      invoice: params.invoice || (params.filename ?? ''),
      installment,
      external_id: purchaseKey,
      source: 'Santander',
    }

    transactions.push(...expandInstallmentSchedule({
      transaction,
      originalDate,
      purchaseKey,
    }))
    index += 1
  }

  return transactions
}

export function inspectSantanderPdf(pdfBytes: Uint8Array) {
  const events = extractTextEvents(pdfBytes)
  const rows = buildCandidateRows(events)
  const candidatePages = [...detectCandidatePages(rows)].sort((left, right) => left - right)
  const pageEventCounts: Record<string, number> = {}
  const pageRowCounts: Record<string, number> = {}

  for (const event of events) {
    pageEventCounts[String(event.page)] = (pageEventCounts[String(event.page)] ?? 0) + 1
  }

  for (const [, rowEvents] of rows) {
    const page = rowEvents[0]?.page
    if (!page) continue
    pageRowCounts[String(page)] = (pageRowCounts[String(page)] ?? 0) + 1
  }

  return {
    eventCount: events.length,
    rowCount: rows.size,
    candidatePages,
    pageEventCounts,
    pageRowCounts,
    sampleTexts: events.slice(0, 12).map((event) => event.text),
  }
}
