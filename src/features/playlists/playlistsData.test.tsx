import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { userFixture } from '../../mocks/fixtures/users'
import {
  loggedInHandlers,
  officialPlaylistHandlers,
  type MockAccount,
} from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { useLogout } from '../auth/session'
import { playlistKeys } from './keys'
import {
  useCreatePlaylist,
  useDeletePlaylist,
  useOfficialPlaylists,
  usePublishPlaylist,
  useUpdatePlaylist,
  usePlaylists,
  usePlaylistSong,
} from './usePlaylists'

const SONG = 'song00000000000000000001'
const MIX = 'mix000000000000000000001'

function setup() {
  const client = createQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

function logIn(playlists = [{ _id: MIX, name: 'Mix', songs: [] as string[] }]) {
  const account: MockAccount = { favorites: [], playlists }
  server.use(...loggedInHandlers(account))
  return account
}

describe('playlists data', () => {
  it('asks nothing for a guest', async () => {
    const requests = vi.fn()
    server.events.on('request:start', ({ request }) => requests(new URL(request.url).pathname))
    const { wrapper } = setup()
    const { result } = renderHook(() => usePlaylists(), { wrapper })
    await waitFor(() => expect(requests).toHaveBeenCalledWith('/api/user/getUser'))
    expect(result.current.user).toBeNull()
    expect(requests).not.toHaveBeenCalledWith('/api/playlists')
    server.events.removeAllListeners()
  })

  it('creates (with a first song), renames and deletes, keeping one shared list', async () => {
    const account = logIn()
    const { wrapper } = setup()
    const { result } = renderHook(
      () => ({ ...usePlaylists(), create: useCreatePlaylist(), rename: useUpdatePlaylist(MIX) }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))

    act(() => result.current.create.mutate({ name: 'Late night', songId: SONG }))
    await waitFor(() =>
      expect(result.current.playlists?.map((p) => [p.name, p.songIds])).toEqual([
        ['Late night', [SONG]],
        ['Mix', []],
      ]),
    )
    act(() => result.current.rename.mutate({ name: 'After hours' }))
    await waitFor(() =>
      expect(result.current.playlists?.map((p) => p.name)).toEqual(['Late night', 'After hours']),
    )

    const { result: remove } = renderHook(() => useDeletePlaylist(MIX), { wrapper })
    act(() => remove.current.mutate())
    await waitFor(() =>
      expect(result.current.playlists?.map((p) => p.name)).toEqual(['Late night']),
    )
    expect(account.playlists!.map((p) => p.name)).toEqual(['Late night'])
  })

  it('survives rapid add/remove clicks: server and cache end on the last click', async () => {
    const account = logIn()
    const mix = () => account.playlists![0]!
    server.use(
      http.put(apiUrl('/api/playlists/:id/songs/:songId'), async () => {
        await delay(40)
        if (!mix().songs.includes(SONG)) mix().songs.push(SONG)
        return HttpResponse.json({ success: true, message: { ...mix(), songs: [...mix().songs] } })
      }),
      http.delete(apiUrl('/api/playlists/:id/songs/:songId'), async () => {
        await delay(5)
        mix().songs = mix().songs.filter((id) => id !== SONG)
        return HttpResponse.json({ success: true, message: { ...mix(), songs: [...mix().songs] } })
      }),
    )
    const { client, wrapper } = setup()
    const { result } = renderHook(
      () => ({ ...usePlaylists(), toggle: usePlaylistSong(MIX, SONG) }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))
    const has = () => result.current.playlists![0]!.songIds.includes(SONG)

    for (let i = 0; i < 5; i++) {
      const next = !has()
      act(() => result.current.toggle.mutate(next))
      await waitFor(() => expect(has()).toBe(next))
    }
    await waitFor(() => expect(client.isMutating()).toBe(0))
    await waitFor(() => expect(client.isFetching()).toBe(0))
    expect(mix().songs).toEqual([SONG])
    expect(has()).toBe(true)
  })

  it('goes back to the server’s list when a change fails', async () => {
    logIn([{ _id: MIX, name: 'Mix', songs: [SONG] }])
    server.use(
      http.delete(apiUrl('/api/playlists/:id/songs/:songId'), async () => {
        await delay(300)
        return new HttpResponse(null, { status: 500 })
      }),
    )
    const { wrapper } = setup()
    const { result } = renderHook(
      () => ({ ...usePlaylists(), toggle: usePlaylistSong(MIX, SONG) }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.playlists?.[0]?.songIds).toEqual([SONG]))
    act(() => result.current.toggle.mutate(false))
    await waitFor(() => expect(result.current.playlists?.[0]?.songIds).toEqual([]))
    await waitFor(() => expect(result.current.toggle.isError).toBe(true))
    await waitFor(() => expect(result.current.playlists?.[0]?.songIds).toEqual([SONG]))
  })

  it('drops cached playlists at logout', async () => {
    logIn()
    const { client, wrapper } = setup()
    const { result } = renderHook(() => ({ ...usePlaylists(), logout: useLogout() }), { wrapper })
    await waitFor(() => expect(result.current.playlists).toHaveLength(1))
    act(() => result.current.logout.mutate())
    await waitFor(() => expect(result.current.user).toBeNull())
    expect(client.getQueryData(playlistKeys.of(userFixture._id))).toBeUndefined()
  })

  it('guests read Coverly playlists; an admin publishes one of theirs and unpublishes it, moving it between lists', async () => {
    const { wrapper: guestWrapper } = setup()
    server.use(
      ...officialPlaylistHandlers(
        [{ _id: 'beatles', name: 'Beatles covers', songs: [SONG] }],
        () => 'guest',
      ),
    )
    const { result: guest } = renderHook(() => useOfficialPlaylists(), { wrapper: guestWrapper })
    await waitFor(() =>
      expect(guest.current.playlists?.map((p) => [p.name, p.official])).toEqual([
        ['Beatles covers', true],
      ]),
    )

    const account: MockAccount = {
      favorites: [],
      isAdmin: true,
      playlists: [{ _id: MIX, name: 'The Beatles Covers', songs: [SONG] }],
      official: [],
    }
    server.use(...loggedInHandlers(account))
    const { wrapper } = setup()
    const { result } = renderHook(
      () => ({
        mine: usePlaylists(),
        official: useOfficialPlaylists(),
        publish: usePublishPlaylist(MIX, true),
        unpublish: usePublishPlaylist(MIX, false),
        toggle: usePlaylistSong(MIX, 'song00000000000000000002', 'official'),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.mine.playlists).toHaveLength(1))
    await waitFor(() => expect(result.current.official.playlists).toEqual([]))

    act(() => result.current.publish.mutate())
    await waitFor(() => expect(result.current.mine.playlists).toEqual([]))
    await waitFor(() =>
      expect(result.current.official.playlists?.map((p) => [p.id, p.songIds])).toEqual([
        [MIX, [SONG]],
      ]),
    )

    // An admin edits it as a Coverly playlist.
    act(() => result.current.toggle.mutate(true))
    await waitFor(() =>
      expect(account.official![0]!.songs).toEqual([SONG, 'song00000000000000000002']),
    )

    act(() => result.current.unpublish.mutate())
    await waitFor(() => expect(result.current.official.playlists).toEqual([]))
    await waitFor(() => expect(result.current.mine.playlists?.map((p) => p.id)).toEqual([MIX]))
  })
})
