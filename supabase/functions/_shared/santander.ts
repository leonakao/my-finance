import { inflate } from 'npm:pako@2.1.0'
import type { ImportedTransaction } from './nubank.ts'

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

function latin1Decode(bytes: Uint8Array): string {
  return new TextDecoder('latin1').decode(bytes)
}

function latin1Encode(value: string): Uint8Array {
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
  return latin1Decode(new Uint8Array(out))
}

function textFromTjArray(raw: string): string {
  const parts = raw.match(/\((?:\\.|[^\\)])*\)/gs) ?? []
  return parts.map((part) => decodePdfString(part.slice(1, -1))).join('')
}

function inflateStreams(pdfBytes: Uint8Array): string[] {
  const pdf = latin1Decode(pdfBytes)
  const streams: string[] = []
  const regex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(pdf))) {
    try {
      const inflated = inflate(latin1Encode(match[1]))
      streams.push(latin1Decode(inflated))
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

function inferCardByPosition(page: number, x: number, activeCards: Record<number, string>): string {
  if (page === 2 && x < 285) return activeCards[5480] ?? '5480'
  if (page === 2 && x >= 285) return activeCards[128] ?? '0128'
  if (page === 3) return activeCards[128] ?? '0128'
  return ''
}

function categoryFor(description: string): string {
  const text = description.toUpperCase()
  const rules: Array<[string, string[]]> = [
    ['Assinaturas', ['AMAZONPRIME', 'AMAZON PRIME', 'AMAZON MUSIC', 'YOUTUBE', 'VERO', 'SCP ESSENCIAL']],
    ['Transporte', ['UBER', 'POSTO', 'SEM PARAR', 'SEM*PARAR', 'AZUL', 'AEREAS']],
    ['Saúde', ['DROGASIL', 'NUTRIVICA']],
    ['Lazer', ['INGRESSO', 'MULTIPLEX', 'AIRBNB']],
    [
      'Alimentação',
      [
        'BOUCHERIE',
        'SUSHI',
        'CARNES',
        'PASTEL',
        'ROOFTOP',
        'LANCHES',
        'LIBANESA',
        'PIZZARIA',
        'SALGADOS',
        'MONTANA',
        'DOM ATACADISTA',
        'LA CARNE',
        'SUPERMERCADO',
        'FRANS CAFE',
        'GASTRO',
        'LOS BRUTOS',
        'A LIBANESA',
        'DUAS MENINAS',
      ],
    ],
    ['Compras', ['AMAZON', 'MERCADOLIVRE', 'KABUM', 'CASASBAHIA', 'MARKETPLACE', 'MKTPLC']],
  ]

  for (const [category, needles] of rules) {
    if (needles.some((needle) => text.includes(needle))) return category
  }
  return 'Outros'
}

function budgetGroupFor(category: string, description: string): string {
  const text = description.toUpperCase()
  if (['VERO', 'OPENAI', 'CHATGPT'].some((needle) => text.includes(needle))) return '50 Necessidades'
  if (text.includes('ANUIDADE')) return '50 Necessidades'
  if (['Saúde', 'Moradia'].includes(category)) return '50 Necessidades'
  if (category === 'Transporte') return text.includes('AZUL') || text.includes('AEREAS') ? '30 Desejos' : '50 Necessidades'
  if (category === 'Alimentação') {
    if (['SUSHI', 'PASTEL', 'ROOFTOP', 'LANCHES', 'LIBANESA', 'CAFE', 'PUB', 'PIZZARIA', 'LOS BRUTOS', 'MONTANA', 'SALGADOS', 'BOUCHERIE'].some((needle) => text.includes(needle))) {
      return '30 Desejos'
    }
    return '50 Necessidades'
  }
  if (category === 'Investimentos') return '20 Futuro'
  return '30 Desejos'
}

export function parseSantanderPdf(params: {
  userId: string
  pdfBytes: Uint8Array
  filename?: string
}): ImportedTransaction[] {
  const events = extractTextEvents(params.pdfBytes)
  const closingMonth = inferClosingMonth(events)
  const statementYear = inferYear(events)
  const rows = new Map<string, TextEvent[]>()
  const activeCards: Record<number, string> = { 128: '0128', 5480: '5480' }

  for (const event of events) {
    if (event.text.includes('XXXX XXXX 8713')) activeCards[5480] = '8713'
    if (![2, 3].includes(event.page)) continue
    if (event.font === '/F10') continue
    const key = `${event.page}:${event.y}`
    rows.set(key, [...(rows.get(key) ?? []), event])
  }

  const transactions: ImportedTransaction[] = []
  let index = 0
  for (const [, rowEvents] of [...rows.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
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
    const card = inferCardByPosition(ordered[0].page, ordered[0].x, activeCards)
    const category = categoryFor(description)
    const amount = decimalFromBrl(amountText)

    transactions.push({
      user_id: params.userId,
      date: `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      description,
      amount,
      type: 'Despesa',
      category,
      budget_group: budgetGroupFor(category, description),
      account: 'Cartão de crédito',
      institution: 'Santander',
      status: 'Confirmado',
      notes: 'Importado de PDF de fatura Santander via Edge Function.',
      invoice: params.filename ?? '',
      installment,
      external_id: `santander-card:${year}-${month}-${day}:${index}:${card}:${description}:${amount.toFixed(2)}`,
      source: 'Santander',
    })
    index += 1
  }

  return transactions
}
