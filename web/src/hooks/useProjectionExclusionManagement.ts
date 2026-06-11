/* eslint-disable max-lines-per-function */
import { useState, type Dispatch, type SetStateAction } from 'react'
import {
  normalizeProjectionExclusion,
  toProjectionMonthStart,
} from '../lib/projectionExclusions'
import { getSupabaseOrThrow } from '../lib/supabase'
import type {
  ProjectionExclusion,
  ProjectionExclusionPayload,
} from '../types'

const EXCLUSION_SELECT = 'id, type, description, normalized_description, scope, month_start, created_at'

type ProjectionExclusionDatabasePayload = {
  user_id: string
  type: ProjectionExclusion['type']
  description: string
  normalized_description: string
  scope: ProjectionExclusion['scope']
  month_start: string
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await getSupabaseOrThrow().auth.getUser()

  if (error || !user) {
    throw new Error(error?.message ?? 'Usuário não autenticado.')
  }

  return user.id
}

function buildDatabasePayload(
  payload: ProjectionExclusionPayload,
  userId: string,
): ProjectionExclusionDatabasePayload {
  return {
    user_id: userId,
    type: payload.type,
    description: payload.description.trim(),
    normalized_description: payload.normalizedDescription,
    scope: payload.scope,
    month_start: toProjectionMonthStart(payload.monthKey),
  }
}

async function findExistingExclusion(payload: ProjectionExclusionDatabasePayload) {
  return getSupabaseOrThrow()
    .from('projection_exclusions')
    .select(EXCLUSION_SELECT)
    .eq('type', payload.type)
    .eq('normalized_description', payload.normalized_description)
    .eq('scope', payload.scope)
    .eq('month_start', payload.month_start)
    .maybeSingle()
}

function sortProjectionExclusions(items: ProjectionExclusion[]): ProjectionExclusion[] {
  return [...items].sort((left, right) => (
    right.createdAt.localeCompare(left.createdAt)
    || left.description.localeCompare(right.description, 'pt-BR')
  ))
}

export function useProjectionExclusionManagement(
  projectionExclusions: ProjectionExclusion[],
  setProjectionExclusions: Dispatch<SetStateAction<ProjectionExclusion[]>>,
  setError: Dispatch<SetStateAction<string>>,
  setFeedback: Dispatch<SetStateAction<string>>,
) {
  const [savingProjectionExclusionId, setSavingProjectionExclusionId] = useState('')
  const [lastCreatedProjectionExclusion, setLastCreatedProjectionExclusion] =
    useState<ProjectionExclusion | null>(null)

  async function createProjectionExclusion(payload: ProjectionExclusionPayload): Promise<boolean> {
    let userId
    try {
      userId = await getAuthenticatedUserId()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao autenticar usuário.')
      return false
    }

    const databasePayload = buildDatabasePayload(payload, userId)
    const optimisticId = `optimistic:${globalThis.crypto.randomUUID()}`
    const optimisticExclusion: ProjectionExclusion = {
      id: optimisticId,
      type: payload.type,
      description: databasePayload.description,
      normalizedDescription: payload.normalizedDescription,
      scope: payload.scope,
      monthStart: databasePayload.month_start,
      createdAt: new Date().toISOString(),
    }

    setSavingProjectionExclusionId(optimisticId)
    setError('')
    setFeedback('')
    setProjectionExclusions((current) => sortProjectionExclusions([...current, optimisticExclusion]))

    const { data, error } = await getSupabaseOrThrow()
      .from('projection_exclusions')
      .insert(databasePayload)
      .select(EXCLUSION_SELECT)
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: existingData, error: existingError } = await findExistingExclusion(databasePayload)
        if (!existingError && existingData) {
          const existing = normalizeProjectionExclusion(existingData)
          setProjectionExclusions((current) => sortProjectionExclusions([
            ...current.filter((item) => item.id !== optimisticId && item.id !== existing.id),
            existing,
          ]))
          setFeedback('Esta estimativa já estava removida da projeção.')
          setSavingProjectionExclusionId('')
          return true
        }
      }

      setProjectionExclusions((current) => current.filter((item) => item.id !== optimisticId))
      setError(error.message)
      setSavingProjectionExclusionId('')
      return false
    }

    const created = normalizeProjectionExclusion(data)
    setProjectionExclusions((current) => sortProjectionExclusions([
      ...current.filter((item) => item.id !== optimisticId),
      created,
    ]))
    setLastCreatedProjectionExclusion(created)
    setFeedback('Estimativa removida da projeção.')
    setSavingProjectionExclusionId('')
    return true
  }

  async function restoreProjectionExclusion(id: string): Promise<boolean> {
    const exclusion = projectionExclusions.find((item) => item.id === id)
    if (!exclusion || savingProjectionExclusionId !== '') {
      return false
    }

    setSavingProjectionExclusionId(id)
    setError('')
    setFeedback('')
    setProjectionExclusions((current) => current.filter((item) => item.id !== id))

    const { error } = await getSupabaseOrThrow()
      .from('projection_exclusions')
      .delete()
      .eq('id', id)

    if (error) {
      setProjectionExclusions((current) => sortProjectionExclusions([...current, exclusion]))
      setError(error.message)
      setSavingProjectionExclusionId('')
      return false
    }

    if (lastCreatedProjectionExclusion?.id === id) {
      setLastCreatedProjectionExclusion(null)
    }
    setFeedback('Estimativa restaurada na projeção.')
    setSavingProjectionExclusionId('')
    return true
  }

  async function undoLastProjectionExclusion(): Promise<boolean> {
    if (!lastCreatedProjectionExclusion) {
      return false
    }

    return restoreProjectionExclusion(lastCreatedProjectionExclusion.id)
  }

  function clearProjectionExclusionUndo() {
    setLastCreatedProjectionExclusion(null)
  }

  return {
    savingProjectionExclusionId,
    lastCreatedProjectionExclusion,
    createProjectionExclusion,
    restoreProjectionExclusion,
    undoLastProjectionExclusion,
    clearProjectionExclusionUndo,
  }
}
