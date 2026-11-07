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
]

/** Server-side state of a mocked session, for tests to set up and inspect. */
export type MockAccount = { favorites: string[] }

/**
 * A logged-in session that ends at logout, as the server-side session does, with its favorites
 * (song ids, oldest first; adding is idempotent, like the backend's $addToSet / $pull).
 */
export function loggedInHandlers(account: MockAccount = { favorites: [] }): AnyHandler[] {
  let loggedIn = true
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
  ]
}
