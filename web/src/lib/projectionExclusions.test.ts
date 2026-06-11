import { describe, expect, it } from 'vitest'
import type {
  ProjectionExclusion,
  ProjectionExclusionRecord,
  RecurringCandidate,
} from '../types'
import {
  appliesToProjectionMonth,
  isCandidateExcluded,
  normalizeProjectionDescription,
  normalizeProjectionExclusion,
  toProjectionMonthStart,
} from './projectionExclusions'

const exclusion: ProjectionExclusion = {
  id: 'exclusion-1',
  type: 'Despesa',
  description: 'Internet Casa',
  normalizedDescription: 'internet casa',
  scope: 'month',
  monthStart: '2026-06-01',
  createdAt: '2026-06-11T12:00:00Z',
}

const candidate: RecurringCandidate = {
  description: 'Internet Casa',
  normalizedDescription: 'internet casa',
  amount: 150,
  type: 'Despesa',
  category: 'Moradia',
  budgetGroupId: 'needs',
  occurrenceCount: 2,
  observedMonthCount: 2,
  lastObservedDate: '2026-05-20',
  expectedDayOfMonth: 20,
}

describe('projection exclusion helpers', () => {
  it('normalizes accents, casing and repeated whitespace', () => {
    expect(normalizeProjectionDescription('  ASSINATURA   MÊS  ')).toBe('assinatura mes')
  })

  it('converts a month key to its first day', () => {
    expect(toProjectionMonthStart('2026-06')).toBe('2026-06-01')
  })

  it('rejects malformed month keys', () => {
    expect(() => toProjectionMonthStart('2026-6')).toThrow('Mês de projeção inválido.')
  })

  it('normalizes a Supabase record to the application contract', () => {
    const record: ProjectionExclusionRecord = {
      id: exclusion.id,
      type: exclusion.type,
      description: exclusion.description,
      normalized_description: exclusion.normalizedDescription,
      scope: exclusion.scope,
      month_start: exclusion.monthStart,
      created_at: exclusion.createdAt,
    }

    expect(normalizeProjectionExclusion(record)).toEqual(exclusion)
  })

  it('applies a monthly exclusion only to the exact month', () => {
    expect(appliesToProjectionMonth(exclusion, '2026-06')).toBe(true)
    expect(appliesToProjectionMonth(exclusion, '2026-07')).toBe(false)
  })

  it('applies a future exclusion from its initial month onward', () => {
    const futureExclusion = { ...exclusion, scope: 'from_month' as const }

    expect(appliesToProjectionMonth(futureExclusion, '2026-05')).toBe(false)
    expect(appliesToProjectionMonth(futureExclusion, '2026-06')).toBe(true)
    expect(appliesToProjectionMonth(futureExclusion, '2027-01')).toBe(true)
  })

  it('matches a candidate by type, normalized description and month', () => {
    expect(isCandidateExcluded(candidate, '2026-06', [exclusion])).toBe(true)
  })

  it('does not collide revenue and expense identities', () => {
    expect(isCandidateExcluded({ ...candidate, type: 'Receita' }, '2026-06', [exclusion])).toBe(false)
  })

  it('does not match another normalized description or an empty list', () => {
    expect(isCandidateExcluded(
      { ...candidate, normalizedDescription: 'telefone' },
      '2026-06',
      [exclusion],
    )).toBe(false)
    expect(isCandidateExcluded(candidate, '2026-06', [])).toBe(false)
  })
})
