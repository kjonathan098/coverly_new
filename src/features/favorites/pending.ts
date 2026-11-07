/*
 * A guest's favorite click, kept while they log in so it can be completed afterwards. Only the song id
 * and a time: no user data, and not a copy of anyone's favorites. sessionStorage (this tab only) so it
 * also survives the full-page login used when a popup is blocked. Expires after a few minutes.
 */
const KEY = 'coverly:pending-favorite'
const MAX_AGE_MS = 5 * 60_000

export function rememberPendingFavorite(songId: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ songId, at: Date.now() }))
  } catch {
    // Storage unavailable: login still works; the click just isn't completed afterwards.
  }
}

export function forgetPendingFavorite() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to forget.
  }
}

/** The pending song id, if any and still fresh. Taking it removes it, so it's completed only once. */
export function takePendingFavorite(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    if (!raw) return null
    const { songId, at } = JSON.parse(raw) as { songId?: unknown; at?: unknown }
    if (typeof songId !== 'string' || typeof at !== 'number' || Date.now() - at > MAX_AGE_MS)
      return null
    return songId
  } catch {
    return null
  }
}
