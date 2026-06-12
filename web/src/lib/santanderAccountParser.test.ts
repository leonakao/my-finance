import { describe, expect, it } from 'vitest'
import {
  extractDateLikeMovementLines,
  extractMovementLines,
  parseMovementTransactions,
  type PdfLine,
} from '../../../supabase/functions/_shared/santander-account-parser'

const MOVEMENT_LINES_WITH_HEADERS: PdfLine[] = [
  { page: 1, y: 720, text: 'Extrato' },
  { page: 1, y: 700, text: 'Movimentações' },
  { page: 1, y: 680, text: 'Data Histórico Débito (R$) Crédito (R$) Saldo (R$)' },
  { page: 1, y: 660, text: '05/06 PIX ENVIADO JOAO 150,00- 1.000,00' },
  { page: 1, y: 640, text: 'COMPROVANTE 1234' },
  { page: 2, y: 720, text: 'Página 2' },
  { page: 2, y: 700, text: 'Data Histórico Débito (R$) Crédito (R$) Saldo (R$)' },
  { page: 2, y: 680, text: '06/06 PIX RECEBIDO MARIA 220,00 1.220,00' },
  { page: 2, y: 660, text: 'Saldos por Período' },
]

const FALLBACK_DATE_LINES: PdfLine[] = [
  { page: 1, y: 720, text: 'EXTRATO CONSOLIDADO' },
  { page: 1, y: 700, text: '05/06 PIX RECEBIDO MARIA 220,00 1.220,00' },
  { page: 1, y: 680, text: '06/06 PIX ENVIADO JOAO 150,00- 1.070,00' },
  { page: 1, y: 660, text: 'Saldos por Período' },
]

const MULTILINE_MOVEMENTS = [
  '05/06 PIX ENVIADO JOAO 150,00- 1.000,00',
  'COMPROVANTE 1234',
  '06/06 PIX RECEBIDO MARIA 220,00 1.220,00',
]

const OCR_BROKEN_MOVEMENTS = [
  '05/05 PIXREC EBIDOL 326,50 1.930,96',
  '06/05 P IXREC EBIDOLeonardoNakao- 7.400,00',
  '19/05 PIX RE CE BIDO - 160,00 6 66,57',
]

describe('santander account parser', () => {
  it('keeps movement lines across pages and ignores repeated headers', () => {
    expect(extractMovementLines(MOVEMENT_LINES_WITH_HEADERS)).toEqual([
      '05/06 PIX ENVIADO JOAO 150,00- 1.000,00',
      'COMPROVANTE 1234',
      '06/06 PIX RECEBIDO MARIA 220,00 1.220,00',
    ])
  })

  it('parses debit, credit and multiline descriptions', () => {
    const transactions = parseMovementTransactions(MULTILINE_MOVEMENTS, 2026)

    expect(transactions).toEqual([
      {
        date: '2026-06-05',
        description: 'PIX ENVIADO JOAO COMPROVANTE 1234',
        amount: -150,
        balance: 1000,
      },
      {
        date: '2026-06-06',
        description: 'PIX RECEBIDO MARIA',
        amount: 220,
        balance: 1220,
      },
    ])
  })

  it('parses OCR-broken money columns by normalizing spaced currency tokens', () => {
    const transactions = parseMovementTransactions(OCR_BROKEN_MOVEMENTS, 2026)

    expect(transactions).toEqual([
      {
        date: '2026-05-05',
        description: 'PIXREC EBIDOL',
        amount: 326.5,
        balance: 1930.96,
      },
      {
        date: '2026-05-06',
        description: 'P IXREC EBIDOLeonardoNakao-',
        amount: 7400,
        balance: null,
      },
      {
        date: '2026-05-19',
        description: 'PIX RE CE BIDO -',
        amount: 160,
        balance: 666.57,
      },
    ])
  })

  it('falls back to date-prefixed lines when no movement section is found', () => {
    expect(extractMovementLines(FALLBACK_DATE_LINES)).toEqual([])
    expect(extractDateLikeMovementLines(FALLBACK_DATE_LINES)).toEqual([
      '05/06 PIX RECEBIDO MARIA 220,00 1.220,00',
      '06/06 PIX ENVIADO JOAO 150,00- 1.070,00',
    ])
  })
})
