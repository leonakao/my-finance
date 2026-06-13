import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectionExclusion, TransactionFilters } from '../types'
import * as financialAnalysis from '../lib/financialAnalysis'
import { useDashboardState } from './useDashboardState'

const EMPTY_FILTERS: TransactionFilters = {
  search: '',
  type: 'all',
  category: 'all',
  group: 'all',
  showIgnored: false,
}

const EXCLUSIONS: ProjectionExclusion[] = [{
  id: 'exclusion-1',
  type: 'Despesa',
  description: 'Internet',
  normalizedDescription: 'internet',
  scope: 'month',
  monthStart: '2026-07-01',
  createdAt: '2026-06-11T10:00:00.000Z',
}]

describe('useDashboardState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 11, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('builds the combined financial analysis once per execution', () => {
    const analysisSpy = vi.spyOn(financialAnalysis, 'buildFinancialAnalysis')

    useDashboardState([], EXCLUSIONS, [], '2026-06', EMPTY_FILTERS)

    expect(analysisSpy).toHaveBeenCalledTimes(1)
    expect(analysisSpy).toHaveBeenCalledWith([], [], '2026-06', expect.any(Date), EXCLUSIONS)
  })

  it('keeps the overview contract and returns the active monthly insight', () => {
    const state = useDashboardState([], [], [], '2026-07', EMPTY_FILTERS)

    expect(state.financialOverview.currentMonthKey).toBe('2026-06')
    expect(state.financialOverview.projectedMonths).toHaveLength(3)
    expect(state.monthlyProjectionInsight).toMatchObject({
      monthKey: '2026-07',
      isCurrentMonth: false,
    })
  })

  it('returns a null monthly insight for a past active month', () => {
    const state = useDashboardState([], [], [], '2026-05', EMPTY_FILTERS)

    expect(state.activeMonth).toBe('2026-05')
    expect(state.monthlyProjectionInsight).toBeNull()
  })
})
