export type PdfLine = {
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
const movementStartRe = /\bmovimenta(?:c|ç)(?:a|ã)o(?:es|ões)?\b/i
const movementEndRe = /^(?:extrato|saldos por per[ií]odo|resumo|lan[çc]amentos futuros)\b/i
const movementHeaderRe = /^(?:data|lan[çc]amento|hist[oó]rico|descri(?:c|ç)[aã]o|saldo|cr[eé]dito|d[eé]bito)\b/i
const ignoredMovementLineRe =
  /^(?:data|lan[çc]amento|hist[oó]rico|descri(?:c|ç)[aã]o|docto\.?|documento|valor|saldo|cr[eé]dito|d[eé]bito|ag[eê]ncia|conta|cliente|p[aá]gina\b)/i
const moneyTokenRe = /-?\d[\d.\s]*,\d{2}-?/g

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function decimalFromBrl(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function extractMoneyTokens(line: string) {
  return [...line.matchAll(moneyTokenRe)]
    .map((match) => {
      const raw = match[0]
      const normalized = raw.replace(/\s+/g, '')
      const value = normalized.replace(/^-/, '').replace(/-$/, '')
      return {
        raw,
        value,
        start: match.index ?? 0,
        end: (match.index ?? 0) + raw.length,
        negative: normalized.startsWith('-') || normalized.endsWith('-'),
      }
    })
    .filter((item) => /\d+,\d{2}$/.test(item.value))
}

function extractAmountParts(line: string) {
  const moneyTokens = extractMoneyTokens(line)
  if (!moneyTokens.length) {
    return {
      description: normalizeWhitespace(line),
      amountText: '',
      balanceText: '',
      signal: '',
    }
  }

  const candidateTokens = moneyTokens.slice(-2)
  const amountToken = candidateTokens[0]!
  const balanceToken = candidateTokens.length > 1 ? candidateTokens[1]! : null
  const description = normalizeWhitespace(line.slice(0, amountToken.start))
  const middleText = balanceToken ? line.slice(amountToken.end, balanceToken.start) : `${line.slice(0, amountToken.start)} ${line.slice(amountToken.end)}`
  const separatorText = balanceToken ? middleText : line.slice(amountToken.end)
  const signal = amountToken.negative || /^\s*-\s*$/.test(separatorText) ? '-' : ''

  return {
    description,
    amountText: amountToken.value,
    balanceText: balanceToken?.value ?? '',
    signal,
  }
}

function isoFromStatementDate(date: string, year: number): string {
  const [day, month] = date.split('/')
  return `${year}-${month}-${day}`
}

function isMovementHeaderLike(text: string): boolean {
  return movementHeaderRe.test(text) || text.toLowerCase().includes('saldo (r$)') || text.toLowerCase().includes('descrição')
}

function isIgnoredMovementLine(text: string): boolean {
  return ignoredMovementLineRe.test(text) || /^-+$/.test(text)
}

export function extractMovementLines(lines: PdfLine[]): string[] {
  const movementLines: string[] = []
  let inSection = false

  for (const line of lines) {
    const text = normalizeWhitespace(line.text)
    if (!text) continue

    if (movementStartRe.test(text)) {
      inSection = true
      continue
    }

    if (!inSection && isMovementHeaderLike(text)) {
      inSection = true
      continue
    }

    if (!inSection) continue
    if (movementEndRe.test(text)) break
    if (line.y < 45) continue
    if (movementStartRe.test(text) || isMovementHeaderLike(text) || isIgnoredMovementLine(text)) continue

    movementLines.push(text)
  }

  return movementLines
}

export function extractDateLikeMovementLines(lines: PdfLine[]): string[] {
  return lines
    .map((line) => normalizeWhitespace(line.text))
    .filter((text) => datePrefixRe.test(text))
    .filter((text) => !movementEndRe.test(text))
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

export function parseMovementTransactions(lines: string[], year: number) {
  const transactions: Array<{ date: string; description: string; amount: number; balance: number | null }> = []
  let currentDate = ''
  let pending: PendingTransaction | null = null

  for (const rawLine of lines) {
    let line = normalizeWhitespace(rawLine)
    if (!line) continue

    let lineDate = ''
    const dateMatch = line.match(datePrefixRe)
    if (dateMatch?.groups) {
      lineDate = dateMatch.groups.date ?? ''
      line = normalizeWhitespace(dateMatch.groups.rest ?? '')
      currentDate = lineDate
    }

    const { description, amountText, balanceText, signal } = extractAmountParts(line)
    const signedAmount = amountText
      ? decimalFromBrl(amountText) * (signal === '-' ? -1 : 1)
      : null
    const balance = balanceText ? decimalFromBrl(balanceText) : null

    if (lineDate && !amountText && pending && pending.amount !== null && !pending.startedWithDate) {
      const activePending = pending
      activePending.date = lineDate
      if (description) activePending.descriptionParts.push(description)
      activePending.startedWithDate = true
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
