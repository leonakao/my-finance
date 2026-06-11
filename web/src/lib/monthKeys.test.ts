import { describe, expect, it } from 'vitest'
import {
  addMonthsToMonthKey,
  buildExpectedDateKey,
  compareMonthKeys,
  getCurrentMonthKey,
  getLastDayOfMonth,
  getLocalDateKey,
  getRemainingMonthTime,
  monthParts,
} from './monthKeys'

describe('monthKeys', () => {
  it('builds date and month keys from local date parts', () => {
    const localDate = new Date(2026, 0, 2, 23, 30)

    expect(getLocalDateKey(localDate)).toBe('2026-01-02')
    expect(getCurrentMonthKey(localDate)).toBe('2026-01')
  })

  it('parses only valid calendar month keys', () => {
    expect(monthParts('2026-06')).toEqual({ year: 2026, month: 6 })
    expect(monthParts('2026-13')).toBeNull()
    expect(monthParts('invalid')).toBeNull()
  })

  it('rolls forward across December and January', () => {
    expect(addMonthsToMonthKey('2026-12', 1)).toBe('2027-01')
    expect(addMonthsToMonthKey('2026-11', 14)).toBe('2028-01')
  })

  it('rolls backward with negative deltas', () => {
    expect(addMonthsToMonthKey('2026-01', -1)).toBe('2025-12')
    expect(addMonthsToMonthKey('2026-02', -14)).toBe('2024-12')
  })

  it('compares valid month keys chronologically', () => {
    expect(compareMonthKeys('2026-05', '2026-06')).toBeLessThan(0)
    expect(compareMonthKeys('2026-06', '2026-06')).toBe(0)
    expect(compareMonthKeys('2027-01', '2026-12')).toBeGreaterThan(0)
  })

  it('returns the last calendar day for regular and leap months', () => {
    expect(getLastDayOfMonth('2026-02')).toBe(28)
    expect(getLastDayOfMonth('2028-02')).toBe(29)
    expect(getLastDayOfMonth('2026-04')).toBe(30)
  })

  it('caps expected days at the last valid day of the target month', () => {
    expect(buildExpectedDateKey('2027-02', 31)).toBe('2027-02-28')
    expect(buildExpectedDateKey('2028-02', 30)).toBe('2028-02-29')
    expect(buildExpectedDateKey('2026-06', 5)).toBe('2026-06-05')
    expect(buildExpectedDateKey('2026-06', 0)).toBeNull()
  })

  it('counts remaining days and weeks inclusively', () => {
    expect(getRemainingMonthTime(new Date(2026, 5, 11, 12))).toEqual({
      daysRemaining: 20,
      weeksRemaining: 3,
    })
    expect(getRemainingMonthTime(new Date(2026, 5, 30, 12))).toEqual({
      daysRemaining: 1,
      weeksRemaining: 1,
    })
  })
})
