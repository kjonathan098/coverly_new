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
]

/** A playlist as the backend stores it (song ids in the order added). */
export type MockPlaylist = { _id: string; name: string; songs: string[] }

/** Server-side state of a mocked session, for tests to set up and inspect. */
export type MockAccount = { favorites: string[]; playlists?: MockPlaylist[] }

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
        loggedIn ? { success: true, message: userFixture } : { success: false, message: null },
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
  ]
}
