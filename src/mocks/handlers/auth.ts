import { http, HttpResponse, type AnyHandler } from 'msw'
import { apiUrl } from '../../lib/api'
import { userFixture } from '../fixtures/users'

// Mirrors the real backend. The default is a guest; use `loggedInHandlers` for a logged-in user.
// The Google OAuth redirect itself is a full-page navigation, which MSW never sees.
export const authHandlers: AnyHandler[] = [
  http.get(apiUrl('/api/user/getUser'), () => HttpResponse.json({ success: false, message: null })),
  http.get(apiUrl('/api/auth/logout'), () => HttpResponse.json({ success: true, message: '' })),
]

/** A logged-in session that ends at logout, as the server-side session does. */
export function loggedInHandlers(): AnyHandler[] {
  let loggedIn = true
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
  ]
}
