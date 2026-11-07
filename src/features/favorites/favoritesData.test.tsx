import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { userFixture } from '../../mocks/fixtures/users'
import { loggedInHandlers, type MockAccount } from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { useLogout } from '../auth/session'
import { favoriteKeys } from './keys'
import { rememberPendingFavorite, takePendingFavorite } from './pending'
import { useCompletePendingFavorite, useFavorites, useFavoriteToggle } from './useFavorites'

const SONG = 'song00000000000000000001'

function setup() {
  const client = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

function logIn(favorites: string[] = []) {
  const account: MockAccount = { favorites }
  server.use(...loggedInHandlers(account))
  return account
}

afterEach(() => {
  sessionStorage.clear()
  vi.useRealTimers()
})

describe('favorites data', () => {
  it('asks nothing for a guest', async () => {
    const requests = vi.fn()
    server.events.on('request:start', ({ request }) => requests(new URL(request.url).pathname))
    const { wrapper } = setup()
    const { result } = renderHook(() => useFavorites(), { wrapper })
    await waitFor(() => expect(requests).toHaveBeenCalledWith('/api/user/getUser'))
    expect(result.current.user).toBeNull()
    expect(result.current.ids).toBeUndefined()
    expect(requests).not.toHaveBeenCalledWith('/api/user/favorites')
    server.events.removeAllListeners()
  })

  it('toggles optimistically and ends on what the server holds', async () => {
    const account = logIn(['other'])
    const { wrapper } = setup()
    const { result } = renderHook(() => ({ ...useFavorites(), toggle: useFavoriteToggle(SONG) }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.ids).toEqual(['other']))

    server.use(
      http.put(apiUrl('/api/user/favorites/:songId'), async () => {
        await delay(300)
        account.favorites.push(SONG)
        return HttpResponse.json({ success: true, message: [...account.favorites] })
      }),
    )
    act(() => result.current.toggle.mutate(true))
    // Shown before the server has it.
    await waitFor(() => expect(result.current.ids).toEqual(['other', SONG]))
    expect(account.favorites).toEqual(['other'])
    await waitFor(() => expect(account.favorites).toEqual(['other', SONG]))
    await waitFor(() =>
      expect(result.current.toggle.isIdle || result.current.toggle.isSuccess).toBe(true),
    )
    expect(result.current.ids).toEqual(['other', SONG])
  })

  it('survives rapid clicks: the server and the cache end on the last click', async () => {
    const account = logIn()
    // Slow answers, so every click overlaps the previous one.
    server.use(
      http.put(apiUrl('/api/user/favorites/:songId'), async () => {
        await delay(40)
        if (!account.favorites.includes(SONG)) account.favorites.push(SONG)
        return HttpResponse.json({ success: true, message: [...account.favorites] })
      }),
      http.delete(apiUrl('/api/user/favorites/:songId'), async () => {
        await delay(5)
        account.favorites = account.favorites.filter((id) => id !== SONG)
        return HttpResponse.json({ success: true, message: [...account.favorites] })
      }),
    )
    const { client, wrapper } = setup()
    const { result } = renderHook(() => ({ ...useFavorites(), toggle: useFavoriteToggle(SONG) }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.ids).toEqual([]))

    // add, remove, add, remove, add: each click reads the (optimistic) state left by the last one.
    for (let i = 0; i < 5; i++) {
      const next = !result.current.ids!.includes(SONG)
      act(() => result.current.toggle.mutate(next))
      await waitFor(() => expect(result.current.ids!.includes(SONG)).toBe(next))
    }
    await waitFor(() => expect(client.isMutating()).toBe(0))
    await waitFor(() => expect(client.isFetching()).toBe(0))
    expect(account.favorites).toEqual([SONG])
    expect(result.current.ids).toEqual([SONG])
  })

  it('goes back to the server’s list when a change fails', async () => {
    logIn([SONG])
    server.use(
      http.delete(apiUrl('/api/user/favorites/:songId'), async () => {
        await delay(300)
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const { wrapper } = setup()
    const { result } = renderHook(() => ({ ...useFavorites(), toggle: useFavoriteToggle(SONG) }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.ids).toEqual([SONG]))
    act(() => result.current.toggle.mutate(false))
    await waitFor(() => expect(result.current.ids).toEqual([]))
    await waitFor(() => expect(result.current.toggle.isError).toBe(true), { timeout: 10_000 })
    await waitFor(() => expect(result.current.ids).toEqual([SONG]))
  }, 15_000)

  it('drops cached favorites at logout', async () => {
    logIn([SONG])
    const { client, wrapper } = setup()
    const { result } = renderHook(() => ({ ...useFavorites(), logout: useLogout() }), { wrapper })
    await waitFor(() => expect(result.current.ids).toEqual([SONG]))
    act(() => result.current.logout.mutate())
    await waitFor(() => expect(result.current.user).toBeNull())
    expect(client.getQueryData(favoriteKeys.of(userFixture._id))).toBeUndefined()
    // Only the guest's disabled, empty entry may remain.
    expect(
      client.getQueriesData({ queryKey: favoriteKeys.all }).every(([, data]) => data === undefined),
    ).toBe(true)
  })
})

describe('a guest’s pending favorite', () => {
  it('is taken once, and only while fresh', () => {
    vi.useFakeTimers()
    rememberPendingFavorite(SONG)
    expect(takePendingFavorite()).toBe(SONG)
    expect(takePendingFavorite()).toBeNull()
    rememberPendingFavorite(SONG)
    vi.advanceTimersByTime(5 * 60_000 + 1)
    expect(takePendingFavorite()).toBeNull()
  })

  it('is completed once after login', async () => {
    const account = logIn()
    const puts = vi.fn()
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PUT') puts()
    })
    rememberPendingFavorite(SONG)
    const { wrapper } = setup()
    const { result, rerender } = renderHook(
      () => {
        useCompletePendingFavorite()
        return useFavorites()
      },
      { wrapper },
    )
    await waitFor(() => expect(result.current.ids).toEqual([SONG]))
    rerender()
    expect(account.favorites).toEqual([SONG])
    expect(puts).toHaveBeenCalledTimes(1)
    expect(sessionStorage.length).toBe(0)
    server.events.removeAllListeners()
  })
})
