/*
 * A guest's vote, kept across a full-page login (used only when the browser blocks the popup).
 * Only the matchup id, song id and a time: no user data. sessionStorage (this tab only); expires
 * after a few minutes. Popup logins keep the choice in memory instead (useMatchup.ts).
 */
const KEY = 'coverly:pending-vote'
const MAX_AGE_MS = 5 * 60_000

export function rememberPageLoginVote(matchupId: string, songId: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ matchupId, songId, at: Date.now() }))
  } catch {
    // Storage unavailable: login still works; the vote just isn't completed afterwards.
  }
}

export function forgetPageLoginVote() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to forget.
  }
}

/** The kept song id for this matchup, if fresh. Taking it removes it, so it's cast only once. */
export function takePageLoginVote(matchupId: string): string | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    if (!raw) return null
    const kept = JSON.parse(raw) as { matchupId?: unknown; songId?: unknown; at?: unknown }
    if (
      kept.matchupId !== matchupId ||
      typeof kept.songId !== 'string' ||
      typeof kept.at !== 'number' ||
      Date.now() - kept.at > MAX_AGE_MS
    )
      return null
    return kept.songId
  } catch {
    return null
  }
}
