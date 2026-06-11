/* eslint-disable max-lines-per-function */
import { act, renderHook, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectionExclusion, ProjectionExclusionPayload } from '../types'

const { authGetUser, fromSpy } = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  fromSpy: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  getSupabaseOrThrow: vi.fn(() => ({
    auth: { getUser: authGetUser },
    from: fromSpy,
  })),
}))

import { useProjectionExclusionManagement } from './useProjectionExclusionManagement'

const PAYLOAD: ProjectionExclusionPayload = {
  type: 'Despesa',
  description: 'Internet',
  normalizedDescription: 'internet',
  scope: 'month',
  monthKey: '2026-06',
}

const CREATED_RECORD = {
  id: 'exclusion-1',
  type: 'Despesa',
  description: 'Internet',
  normalized_description: 'internet',
  scope: 'month',
  month_start: '2026-06-01',
  created_at: '2026-06-11T12:00:00Z',
}

function useHarness(initial: ProjectionExclusion[] = []) {
  const [exclusions, setExclusions] = useState(initial)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const management = useProjectionExclusionManagement(
    exclusions,
    setExclusions,
    setError,
    setFeedback,
  )
  return { exclusions, error, feedback, ...management }
}

function insertResponse(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  fromSpy.mockReturnValue({ insert })
  return { insert }
}

function deleteResponse(error: { message: string } | null) {
  const eq = vi.fn().mockResolvedValue({ error })
  const deleteMethod = vi.fn(() => ({ eq }))
  fromSpy.mockReturnValue({ delete: deleteMethod })
  return { deleteMethod, eq }
}

describe('useProjectionExclusionManagement', () => {
  beforeEach(() => {
    authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    fromSpy.mockReset()
  })

  it('inserts optimistically and reconciles the persisted record', async () => {
    const { insert } = insertResponse({ data: CREATED_RECORD, error: null })
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      expect(await result.current.createProjectionExclusion(PAYLOAD)).toBe(true)
    })

    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      type: 'Despesa',
      description: 'Internet',
      normalized_description: 'internet',
      scope: 'month',
      month_start: '2026-06-01',
    })
    expect(result.current.exclusions).toHaveLength(1)
    expect(result.current.exclusions[0]?.id).toBe('exclusion-1')
    expect(result.current.lastCreatedProjectionExclusion?.id).toBe('exclusion-1')
  })

  it('rolls back an optimistic insert when persistence fails', async () => {
    insertResponse({ data: null, error: { message: 'Falha ao salvar.', code: '500' } })
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      expect(await result.current.createProjectionExclusion(PAYLOAD)).toBe(false)
    })

    expect(result.current.exclusions).toEqual([])
    expect(result.current.error).toBe('Falha ao salvar.')
  })

  it('reconciles a unique conflict without duplicating state', async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'duplicate', code: '23505' },
    })
    const existingQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: CREATED_RECORD, error: null }),
    }
    existingQuery.eq.mockReturnValue(existingQuery)
    fromSpy
      .mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single: insertSingle })),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => existingQuery),
      })
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      expect(await result.current.createProjectionExclusion(PAYLOAD)).toBe(true)
    })

    expect(result.current.exclusions.map((item) => item.id)).toEqual(['exclusion-1'])
    expect(result.current.feedback).toBe('Esta estimativa já estava removida da projeção.')
    expect(result.current.lastCreatedProjectionExclusion).toBeNull()
  })

  it('restores an exclusion optimistically after a successful delete', async () => {
    const exclusion = {
      id: 'exclusion-1',
      type: 'Despesa' as const,
      description: 'Internet',
      normalizedDescription: 'internet',
      scope: 'month' as const,
      monthStart: '2026-06-01',
      createdAt: '2026-06-11T12:00:00Z',
    }
    const { eq } = deleteResponse(null)
    const { result } = renderHook(() => useHarness([exclusion]))

    await act(async () => {
      expect(await result.current.restoreProjectionExclusion(exclusion.id)).toBe(true)
    })

    expect(eq).toHaveBeenCalledWith('id', exclusion.id)
    expect(result.current.exclusions).toEqual([])
    expect(result.current.feedback).toBe('Estimativa restaurada na projeção.')
  })

  it('rolls back restoration when delete fails', async () => {
    const exclusion = {
      id: 'exclusion-1',
      type: 'Despesa' as const,
      description: 'Internet',
      normalizedDescription: 'internet',
      scope: 'month' as const,
      monthStart: '2026-06-01',
      createdAt: '2026-06-11T12:00:00Z',
    }
    deleteResponse({ message: 'Falha ao restaurar.' })
    const { result } = renderHook(() => useHarness([exclusion]))

    await act(async () => {
      expect(await result.current.restoreProjectionExclusion(exclusion.id)).toBe(false)
    })

    expect(result.current.exclusions).toEqual([exclusion])
    expect(result.current.error).toBe('Falha ao restaurar.')
  })

  it('undoes the last created exclusion', async () => {
    insertResponse({ data: CREATED_RECORD, error: null })
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      await result.current.createProjectionExclusion(PAYLOAD)
    })
    deleteResponse(null)
    await act(async () => {
      expect(await result.current.undoLastProjectionExclusion()).toBe(true)
    })

    expect(result.current.exclusions).toEqual([])
    expect(result.current.lastCreatedProjectionExclusion).toBeNull()
  })

  it('rejects restoration while another mutation is saving', async () => {
    let resolveInsert: ((value: unknown) => void) | undefined
    const pending = new Promise((resolve) => {
      resolveInsert = resolve
    })
    fromSpy.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => pending),
        })),
      })),
    })
    const exclusion: ProjectionExclusion = {
      id: 'existing',
      type: 'Despesa',
      description: 'Academia',
      normalizedDescription: 'academia',
      scope: 'month',
      monthStart: '2026-06-01',
      createdAt: '2026-06-10T12:00:00Z',
    }
    const { result } = renderHook(() => useHarness([exclusion]))

    let createPromise: Promise<boolean> | undefined
    act(() => {
      createPromise = result.current.createProjectionExclusion(PAYLOAD)
    })
    await waitFor(() => {
      expect(result.current.savingProjectionExclusionId).not.toBe('')
    })
    await act(async () => {
      expect(await result.current.restoreProjectionExclusion(exclusion.id)).toBe(false)
      resolveInsert?.({ data: CREATED_RECORD, error: null })
      await createPromise
    })
  })

  it('reports an authentication failure before inserting', async () => {
    authGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Sessão expirada.' },
    })
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      expect(await result.current.createProjectionExclusion(PAYLOAD)).toBe(false)
    })

    expect(fromSpy).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Sessão expirada.')
  })
})
