import { QueryClientProvider, type UseQueryResult } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ApiError, ContractError, apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { PLACEHOLDER_IDS } from '../../mocks/fixtures/recordings'
import { server } from '../../mocks/server'
import { useExploration, useRecording } from './hooks'

function renderWithClient<T>(hook: () => T) {
  const client = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(hook, { wrapper })
}

async function loadExploration(id: string) {
  const { result } = renderWithClient(() => useExploration(id))
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  const data = result.current.data!
  return {
    recording: data.recording.id,
    original: data.original?.id ?? null,
    covers: data.covers.items.map((cover) => cover.id),
    nextCursor: data.covers.nextCursor,
  }
}

describe('useExploration through the MSW recordings handlers', () => {
  it('original with covers: the original anchors its linked covers', async () => {
    expect(await loadExploration(PLACEHOLDER_IDS.originalWithCovers)).toEqual({
      recording: PLACEHOLDER_IDS.originalWithCovers,
      original: PLACEHOLDER_IDS.originalWithCovers,
      covers: [PLACEHOLDER_IDS.linkedCover, PLACEHOLDER_IDS.secondLinkedCover],
      nextCursor: null,
    })
  })

  it('original without covers: the original stands alone', async () => {
    expect(await loadExploration(PLACEHOLDER_IDS.originalWithoutCovers)).toEqual({
      recording: PLACEHOLDER_IDS.originalWithoutCovers,
      original: PLACEHOLDER_IDS.originalWithoutCovers,
      covers: [],
      nextCursor: null,
    })
  })

  it('linked cover: resolves to its original and includes itself among the covers', async () => {
    expect(await loadExploration(PLACEHOLDER_IDS.linkedCover)).toEqual({
      recording: PLACEHOLDER_IDS.linkedCover,
      original: PLACEHOLDER_IDS.originalWithCovers,
      covers: [PLACEHOLDER_IDS.linkedCover, PLACEHOLDER_IDS.secondLinkedCover],
      nextCursor: null,
    })
  })

  it('unlinked cover: has no original, even though it shares a title and artist with one', async () => {
    const { result } = renderWithClient(() => useExploration(PLACEHOLDER_IDS.unlinkedCover))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const { recording, original, covers } = result.current.data!

    expect(original).toBeNull()
    expect(covers).toEqual({ items: [], nextCursor: null })
    expect(recording.originalRecordingId).toBeNull()
    expect(recording.title).toBe('Placeholder Song A')
  })
})

describe('useRecording through the MSW recordings handlers', () => {
  it('returns the requested recording', async () => {
    const { result } = renderWithClient(() => useRecording(PLACEHOLDER_IDS.linkedCover))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      id: PLACEHOLDER_IDS.linkedCover,
      kind: 'cover',
      originalRecordingId: PLACEHOLDER_IDS.originalWithCovers,
    })
  })
})

describe('missing recordings', () => {
  it.each<[string, () => UseQueryResult<unknown>]>([
    ['useRecording', () => useRecording('does-not-exist')],
    ['useExploration', () => useExploration('does-not-exist')],
  ])('%s fails with a 404 ApiError and does not retry', async (_, hook) => {
    const { result } = renderWithClient(hook)
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error).toMatchObject({ status: 404 })
    expect(result.current.error?.message).toMatch(/Recording "does-not-exist" not found/)
    expect(result.current.failureCount).toBe(1)
  })
})

describe('inconsistent API responses', () => {
  it('surface as a ContractError instead of data, without retrying', async () => {
    server.use(
      http.get(apiUrl('/api/recordings/:id/exploration'), () =>
        HttpResponse.json({
          success: true,
          message: {
            recording: { id: 'wrong-id' },
            original: null,
            covers: { items: [], nextCursor: null },
          },
        }),
      ),
    )
    const { result } = renderWithClient(() => useExploration(PLACEHOLDER_IDS.originalWithCovers))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ContractError)
    expect(result.current.data).toBeUndefined()
    expect(result.current.failureCount).toBe(1)
  })
})
