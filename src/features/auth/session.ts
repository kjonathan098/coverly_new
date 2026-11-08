import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { ApiError, ContractError, apiFetch, apiUrl } from '../../lib/api'
import { favoriteKeys } from '../favorites/keys'
import { playlistKeys } from '../playlists/keys'
import { safeReturnPath } from './returnPath'

/*
 * The login session, as the backend keeps it: Google OAuth through Passport, held server-side and
 * identified by an HttpOnly session cookie. The frontend never sees or stores a token; it only asks
 * the backend who is logged in. Guests can use everything except personal features.
 */

/**
 * The logged-in user: only what the backend returns (Google gives a display name). `isAdmin` only
 * shows or hides admin controls; the backend checks every admin action itself.
 */
export type SessionUser = { id: string; name: string; isAdmin: boolean }

export const sessionKeys = { current: ['session'] as const }

const GET_USER = '/api/user/getUser'

/** The current user, or null for a guest. The backend answers a guest with 200 `{success:false, message:null}`. */
export async function fetchSession(): Promise<SessionUser | null> {
  const response = await apiFetch(GET_USER)
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new ContractError(`${GET_USER}: expected a JSON response (HTTP ${response.status})`)
  }
  if (!response.ok) throw new ApiError(`${GET_USER}: request failed`, response.status, GET_USER)

  const { success, message } = (body ?? {}) as { success?: unknown; message?: unknown }
  if (success === false && message === null) return null
  if (success === true && typeof message === 'object' && message !== null) {
    const { _id, name, isAdmin } = message as { _id?: unknown; name?: unknown; isAdmin?: unknown }
    if (typeof _id === 'string' && typeof name === 'string') {
      return { id: _id, name, isAdmin: isAdmin === true }
    }
  }
  throw new ContractError(`${GET_USER}: unexpected response`)
}

/**
 * Who is logged in. `data` is undefined until the first answer, then a user or null (guest). Kept
 * across refetches, so a failed re-check never logs anyone out on screen.
 */
export function useSession() {
  // Re-checked whenever the window regains focus (after a popup login, or a logout in another tab).
  return useQuery({
    queryKey: sessionKeys.current,
    queryFn: fetchSession,
    staleTime: 60_000,
    refetchOnWindowFocus: 'always',
  })
}

/**
 * The backend's Google OAuth start, with the route (path and search) to return to. Without
 * `popup`, it is the full-page login, which comes back to that route. With `popup`, the backend
 * ends on /auth-complete.html, which tells this window over AUTH_CHANNEL and closes.
 */
export function loginUrl(returnTo: string, { popup = false } = {}): string {
  const query = new URLSearchParams({ from: safeReturnPath(returnTo) })
  if (popup) query.set('mode', 'popup')
  return `${apiUrl('/api/auth/google')}?${query}`
}

/**
 * Google login in a popup, so Coverly (and the music) stays put. Must run inside the click.
 * Returns false when the browser blocked the popup: the caller then does the full-page login.
 */
export function openLoginPopup(returnTo: string): boolean {
  const width = 500
  const height = 640
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2)
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2)
  const popup = window.open(
    loginUrl(returnTo, { popup: true }),
    'coverly-login',
    `popup,width=${width},height=${height},left=${left},top=${top}`,
  )
  if (!popup) return false
  popup.focus()
  return true
}

/** Starts Google login from a click: the popup, or the full-page login if the browser blocks it. */
export function startLogin(returnTo: string) {
  if (!openLoginPopup(returnTo)) window.location.assign(loginUrl(returnTo))
}

/**
 * Same-origin channel the popup's completion page (public/auth-complete.html) reports on. Its
 * messages say only that login finished, never who logged in: the session is always re-read from
 * the backend, so a forged message can't log anyone in.
 */
export const AUTH_CHANNEL = 'coverly-auth'
export type AuthMessage = { type: 'coverly:auth'; status: 'success' | 'failed' }

function isAuthMessage(data: unknown): data is AuthMessage {
  const message = data as AuthMessage | null
  return (
    message?.type === 'coverly:auth' &&
    (message.status === 'success' || message.status === 'failed')
  )
}

/**
 * Listens for the popup's result and re-reads the session, in place: no reload, and the player
 * is untouched. Calls `onFailed` when login was canceled or failed, and `onSucceeded` (optional)
 * when the popup reports success. Pass stable callbacks (useCallback or module functions).
 */
export function useLoginResult(onFailed: () => void, onSucceeded?: () => void) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(AUTH_CHANNEL)
    channel.onmessage = ({ data }: MessageEvent) => {
      if (!isAuthMessage(data)) return
      if (data.status === 'failed') onFailed()
      else onSucceeded?.()
      // Either way, show what the backend says, never an assumed result.
      void queryClient.invalidateQueries({ queryKey: sessionKeys.current })
    }
    return () => channel.close()
  }, [queryClient, onFailed, onSucceeded])
}

async function logout() {
  const response = await apiFetch('/api/auth/logout')
  if (!response.ok)
    throw new ApiError('/api/auth/logout: request failed', response.status, '/api/auth/logout')
}

/** Ends the server session. Only the session query changes: the page and the player are untouched. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(sessionKeys.current, null)
      // Personal data goes with the session.
      queryClient.removeQueries({ queryKey: favoriteKeys.all })
      queryClient.removeQueries({ queryKey: playlistKeys.all })
    },
    // If logout failed, show whatever the backend now says rather than guessing.
    onError: () => queryClient.invalidateQueries({ queryKey: sessionKeys.current }),
  })
}
