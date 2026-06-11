import type {
  ProjectionExclusion,
  ProjectionExclusionRecord,
  RecurringCandidate,
} from '../types'
import { compareMonthKeys } from './monthKeys'

export function normalizeProjectionDescription(description: string | null | undefined): string {
  return String(description ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function toProjectionMonthStart(monthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error('Mês de projeção inválido.')
  }

  return `${monthKey}-01`
}

export function normalizeProjectionExclusion(record: ProjectionExclusionRecord): ProjectionExclusion {
  if (
    record.type === null
    || record.description === null
    || record.normalized_description === null
    || record.scope === null
    || record.month_start === null
    || record.created_at === null
  ) {
    throw new Error('Exclusão de projeção inválida.')
  }

  return {
    id: record.id,
    type: record.type,
    description: record.description,
    normalizedDescription: record.normalized_description,
    scope: record.scope,
    monthStart: record.month_start,
    createdAt: record.created_at,
  }
}

export function appliesToProjectionMonth(exclusion: ProjectionExclusion, monthKey: string): boolean {
  const exclusionMonth = exclusion.monthStart.slice(0, 7)
  return exclusion.scope === 'month'
    ? monthKey === exclusionMonth
    : compareMonthKeys(monthKey, exclusionMonth) >= 0
}

export function isCandidateExcluded(
  candidate: RecurringCandidate,
  monthKey: string,
  exclusions: ProjectionExclusion[],
): boolean {
  return exclusions.some((exclusion) => (
    exclusion.type === candidate.type
    && exclusion.normalizedDescription === candidate.normalizedDescription
    && appliesToProjectionMonth(exclusion, monthKey)
  ))
}
