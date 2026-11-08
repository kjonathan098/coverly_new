import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { loginUrl, openLoginPopup, useLoginResult, useSession } from '../auth/session'
import { castVote, fetchCurrentMatchup, type Matchup } from './api'
import { forgetPageLoginVote, rememberPageLoginVote, takePageLoginVote } from './pending'

/** Per user, so one account never sees another's vote or results. */
export const matchupKeys = {
  all: ['matchup'] as const,
  current: (userId: string) => ['matchup', 'current', userId] as const,
}

/** The current matchup, as the session's user sees it. Waits for the session, so it's read once. */
export function useMatchup() {
  const session = useSession()
  const user = session.data ?? null
  const query = useQuery({
    queryKey: matchupKeys.current(user?.id ?? 'guest'),
    queryFn: fetchCurrentMatchup,
    enabled: !session.isPending,
    staleTime: 60_000,
  })
  return { user, sessionPending: session.isPending, matchup: query.data ?? null, query }
}

/**
 * Casting or changing a vote. Votes reach the server one at a time, in click order, and the cache
 * takes each answer as it comes: counts are never guessed. Never touches the player.
 */
export function useVote() {
  const queryClient = useQueryClient()
  const { data: user } = useSession()
  return useMutation({
    scope: { id: 'matchup-vote' },
    mutationFn: ({ matchupId, songId }: { matchupId: string; songId: string }) =>
      castVote(matchupId, songId),
    onSuccess: (matchup) => {
      if (user) queryClient.setQueryData<Matchup | null>(matchupKeys.current(user.id), matchup)
    },
    // Session ended, voting closed, matchup changed: show what the server holds now.
    onError: () => queryClient.invalidateQueries({ queryKey: matchupKeys.all }),
  })
}

/** How long after the window gets focus back, with no login result, a guest's vote is dropped. */
const POPUP_GRACE_MS = 1500

/**
 * A guest's vote, completed only after a successful login:
 * - Popup login (the usual case): the choice is kept in memory and cast when the popup reports
 *   success and the session shows the user. A failed login drops it; so does the popup closing
 *   without a result (this window gets focus back and no success arrives).
 * - Full-page login (popup blocked): the choice is kept in this tab's sessionStorage and cast if
 *   the page comes back logged in; coming back as a guest drops it.
 * Either way it is cast at most once, and never for a different matchup.
 */
export function usePendingVote(
  matchupId: string | undefined,
  returnTo: string,
  cast: (songId: string) => void,
) {
  const { data: user, isPending: sessionPending } = useSession()
  const castRef = useRef(cast)
  useEffect(() => {
    castRef.current = cast
  })
  const [pending, setPending] = useState<string | null>(null)
  const succeeded = useRef(false)

  const clear = useCallback(() => {
    succeeded.current = false
    setPending(null)
  }, [])
  const onSucceeded = useCallback(() => {
    succeeded.current = true
  }, [])
  useLoginResult(clear, onSucceeded)

  // The popup closed (or this window was brought back) without a login result: drop the vote.
  useEffect(() => {
    if (!pending) return
    let timer: number | undefined
    const onFocus = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!succeeded.current) clear()
      }, POPUP_GRACE_MS)
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearTimeout(timer)
    }
  }, [pending, clear])

  // Logged in after a successful popup login: cast the kept vote.
  useEffect(() => {
    if (!pending || !user || !succeeded.current || !matchupId) return
    castRef.current(pending)
    clear()
  }, [pending, user, matchupId, clear])

  // Back from a full-page login.
  useEffect(() => {
    if (sessionPending || !matchupId) return
    const kept = takePageLoginVote(matchupId)
    if (kept && user) castRef.current(kept)
    // Once, when the session and the matchup are first known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPending, matchupId])

  /** Starts login for a guest's vote. Must run inside the click (popup blockers). */
  const loginToVote = (songId: string) => {
    if (!matchupId) return
    succeeded.current = false
    setPending(songId)
    if (!openLoginPopup(returnTo)) {
      setPending(null)
      rememberPageLoginVote(matchupId, songId)
      window.location.assign(loginUrl(returnTo))
    }
  }

  return { pending, loginToVote, cancel: () => (clear(), forgetPageLoginVote()) }
}
