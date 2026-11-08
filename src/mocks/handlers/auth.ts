import { http, HttpResponse, type AnyHandler } from 'msw'
import { apiUrl } from '../../lib/api'
import { userFixture } from '../fixtures/users'

const notLoggedIn = () =>
  HttpResponse.json({ success: false, message: 'You must be logged in' }, { status: 401 })

// Mirrors the real backend. The default is a guest; use `loggedInHandlers` for a logged-in user.
// The Google OAuth redirect itself is a full-page navigation, which MSW never sees.
export const authHandlers: AnyHandler[] = [
  http.get(apiUrl('/api/user/getUser'), () => HttpResponse.json({ success: false, message: null })),
  http.get(apiUrl('/api/auth/logout'), () => HttpResponse.json({ success: true, message: '' })),
  http.get(apiUrl('/api/user/favorites'), notLoggedIn),
  http.put(apiUrl('/api/user/favorites/:songId'), notLoggedIn),
  http.delete(apiUrl('/api/user/favorites/:songId'), notLoggedIn),
  http.all(apiUrl('/api/playlists'), notLoggedIn),
  http.all(apiUrl('/api/playlists/*'), notLoggedIn),
  // Coverly's playlists are public to read; with none set up, there are none.
  ...officialPlaylistHandlers([], () => 'guest'),
  // No current "Who Covered It Better?" matchup by default (see matchups.ts to set one up).
  http.get(apiUrl('/api/matchups/:id'), () =>
    HttpResponse.json({ success: false, message: 'Matchup not found' }, { status: 404 }),
  ),
  http.put(apiUrl('/api/matchups/:id/vote'), notLoggedIn),
  // No current "One Word, Five Songs" challenge by default (see wordChallenges.ts to set one up).
  http.get(apiUrl('/api/word-challenges/:id'), () =>
    HttpResponse.json({ success: false, message: 'Challenge not found' }, { status: 404 }),
  ),
]

/** A playlist as the backend stores it (song ids in the order added). */
export type MockPlaylist = { _id: string; name: string; songs: string[]; description?: string }

/**
 * Server-side state of a mocked session, for tests to set up and inspect. `official`: Coverly's
 * playlists (public); `isAdmin`: whether this user may change them.
 */
export type MockAccount = {
  favorites: string[]
  playlists?: MockPlaylist[]
  official?: MockPlaylist[]
  isAdmin?: boolean
}

const officialView = (playlist: MockPlaylist) => ({
  description: '',
  ...playlist,
  songs: [...playlist.songs],
  type: 'official',
})

/**
 * Coverly's playlists, as /api/official-playlists serves them: anyone can read; `who()` decides
 * writes (a guest gets 401, a user 403, an admin may change them). `onUnpublish` takes one back.
 */
export function officialPlaylistHandlers(
  official: MockPlaylist[],
  who: () => 'guest' | 'user' | 'admin',
  onUnpublish?: (playlist: MockPlaylist) => void,
): AnyHandler[] {
  const base = '/api/official-playlists'
  const denied = () =>
    who() === 'guest'
      ? notLoggedIn()
      : HttpResponse.json({ success: false, message: 'Admin access required' }, { status: 403 })
  const answer = (playlist: MockPlaylist | undefined) =>
    playlist
      ? HttpResponse.json({ success: true, message: officialView(playlist) })
      : HttpResponse.json({ success: false, message: 'Playlist not found' }, { status: 404 })
  const found = (id: unknown) => official.find((p) => p._id === id)
  let nextId = 1
  return [
    http.get(apiUrl(base), () =>
      HttpResponse.json({ success: true, message: official.map(officialView) }),
    ),
    http.get(apiUrl(`${base}/:id`), ({ params }) => answer(found(params.id))),
    http.post(apiUrl(base), async ({ request }) => {
      if (who() !== 'admin') return denied()
      const { name, songId, description = '' } = (await request.json()) as Record<string, string>
      const playlist = {
        _id: `official${String(nextId++).padStart(16, '0')}`,
        name: name!.trim(),
        description,
        songs: songId ? [songId] : [],
      }
      official.unshift(playlist)
      return HttpResponse.json({ success: true, message: officialView(playlist) }, { status: 201 })
    }),
    http.patch(apiUrl(`${base}/:id`), async ({ params, request }) => {
      if (who() !== 'admin') return denied()
      const playlist = found(params.id)
      if (playlist) Object.assign(playlist, (await request.json()) as Partial<MockPlaylist>)
      return answer(playlist)
    }),
    http.delete(apiUrl(`${base}/:id`), ({ params }) => {
      if (who() !== 'admin') return denied()
      const playlist = found(params.id)
      if (playlist) official.splice(official.indexOf(playlist), 1)
      return playlist
        ? HttpResponse.json({ success: true, message: { _id: playlist._id } })
        : answer(playlist)
    }),
    http.put(apiUrl(`${base}/:id/songs/:songId`), ({ params }) => {
      if (who() !== 'admin') return denied()
      const playlist = found(params.id)
      const songId = String(params.songId)
      if (playlist && !playlist.songs.includes(songId)) playlist.songs.push(songId)
      return answer(playlist)
    }),
    http.delete(apiUrl(`${base}/:id/songs/:songId`), ({ params }) => {
      if (who() !== 'admin') return denied()
      const playlist = found(params.id)
      if (playlist) playlist.songs = playlist.songs.filter((id) => id !== params.songId)
      return answer(playlist)
    }),
    http.post(apiUrl(`${base}/:id/unpublish`), ({ params }) => {
      if (who() !== 'admin') return denied()
      const playlist = found(params.id)
      if (!playlist) return answer(playlist)
      official.splice(official.indexOf(playlist), 1)
      onUnpublish?.(playlist)
      return HttpResponse.json({ success: true, message: { ...playlist, type: 'user' } })
    }),
  ]
}

/**
 * A logged-in session that ends at logout, as the server-side session does, with its favorites
 * (song ids, oldest first; adding is idempotent, like the backend's $addToSet / $pull).
 */
export function loggedInHandlers(account: MockAccount = { favorites: [] }): AnyHandler[] {
  let loggedIn = true
  const playlists = () => (account.playlists ??= [])
  let nextId = 1
  const found = (id: unknown) => playlists().find((p) => p._id === id)
  const one = (playlist: MockPlaylist | undefined, status = 200) =>
    !loggedIn
      ? notLoggedIn()
      : playlist
        ? HttpResponse.json(
            { success: true, message: { ...playlist, songs: [...playlist.songs] } },
            { status },
          )
        : HttpResponse.json({ success: false, message: 'Playlist not found' }, { status: 404 })
  const favorites = () =>
    loggedIn ? HttpResponse.json({ success: true, message: [...account.favorites] }) : notLoggedIn()
  return [
    http.get(apiUrl('/api/user/getUser'), () =>
      HttpResponse.json(
        loggedIn
          ? { success: true, message: { ...userFixture, isAdmin: account.isAdmin === true } }
          : { success: false, message: null },
      ),
    ),
    http.get(apiUrl('/api/auth/logout'), () => {
      loggedIn = false
      return HttpResponse.json({ success: true, message: '' })
    }),
    http.get(apiUrl('/api/user/favorites'), favorites),
    http.put(apiUrl('/api/user/favorites/:songId'), ({ params }) => {
      const songId = String(params.songId)
      if (loggedIn && !account.favorites.includes(songId)) account.favorites.push(songId)
      return favorites()
    }),
    http.delete(apiUrl('/api/user/favorites/:songId'), ({ params }) => {
      if (loggedIn) account.favorites = account.favorites.filter((id) => id !== params.songId)
      return favorites()
    }),
    http.get(apiUrl('/api/playlists'), () =>
      loggedIn
        ? HttpResponse.json({
            success: true,
            message: playlists().map((p) => ({ ...p, songs: [...p.songs] })),
          })
        : notLoggedIn(),
    ),
    http.post(apiUrl('/api/playlists'), async ({ request }) => {
      const { name, songId } = (await request.json()) as { name: string; songId?: string }
      const playlist = {
        _id: `playlist${String(nextId++).padStart(16, '0')}`,
        name: name.trim(),
        songs: songId ? [songId] : [],
      }
      if (loggedIn) playlists().unshift(playlist)
      return one(playlist, 201)
    }),
    http.patch(apiUrl('/api/playlists/:id'), async ({ params, request }) => {
      const playlist = found(params.id)
      if (loggedIn && playlist)
        playlist.name = ((await request.json()) as { name: string }).name.trim()
      return one(playlist)
    }),
    http.delete(apiUrl('/api/playlists/:id'), ({ params }) => {
      const playlist = found(params.id)
      if (!loggedIn || !playlist) return one(playlist)
      account.playlists = playlists().filter((p) => p !== playlist)
      return HttpResponse.json({ success: true, message: { _id: playlist._id } })
    }),
    http.put(apiUrl('/api/playlists/:id/songs/:songId'), ({ params }) => {
      const playlist = found(params.id)
      const songId = String(params.songId)
      if (loggedIn && playlist && !playlist.songs.includes(songId)) playlist.songs.push(songId)
      return one(playlist)
    }),
    http.delete(apiUrl('/api/playlists/:id/songs/:songId'), ({ params }) => {
      const playlist = found(params.id)
      if (loggedIn && playlist) playlist.songs = playlist.songs.filter((id) => id !== params.songId)
      return one(playlist)
    }),
    // Admin, owner: one of my playlists becomes a Coverly playlist (same id and songs).
    http.post(apiUrl('/api/playlists/:id/publish'), ({ params }) => {
      if (!loggedIn) return notLoggedIn()
      if (!account.isAdmin) {
        return HttpResponse.json(
          { success: false, message: 'Admin access required' },
          { status: 403 },
        )
      }
      const playlist = found(params.id)
      if (!playlist) return one(playlist)
      account.playlists = playlists().filter((p) => p !== playlist)
      ;(account.official ??= []).unshift(playlist)
      return HttpResponse.json({ success: true, message: officialView(playlist) })
    }),
    ...officialPlaylistHandlers(
      (account.official ??= []),
      () => (!loggedIn ? 'guest' : account.isAdmin ? 'admin' : 'user'),
      (playlist) => playlists().unshift(playlist),
    ),
  ]
}
