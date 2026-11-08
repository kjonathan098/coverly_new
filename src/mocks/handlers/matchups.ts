import { http, HttpResponse, type AnyHandler } from 'msw'
import { apiUrl } from '../../lib/api'

/**
 * Server-side state of a mocked "Who Covered It Better?" matchup, for tests to set up and inspect.
 * `votes`: voter id → song id, one per voter (like the backend's unique index).
 */
export type MockMatchup = {
  id: string
  songs: [string, string]
  open?: boolean
  votes: Record<string, string>
  /** Sample counts per song (the backend's configured `demo`), sent once the user has voted. */
  demo?: Record<string, number>
}

/**
 * The matchup routes, mirroring the backend: anyone can read; `voter()` is the session's user id
 * (null for a guest, who gets 401 on voting). Results only once that user has voted.
 */
export function matchupHandlers(matchup: MockMatchup, voter: () => string | null): AnyHandler[] {
  const view = () => {
    const me = voter()
    const myVote = me ? (matchup.votes[me] ?? null) : null
    const all = Object.values(matchup.votes)
    const counts = Object.fromEntries(
      matchup.songs.map((id) => [id, all.filter((v) => v === id).length]),
    )
    return {
      id: matchup.id,
      songs: [...matchup.songs],
      open: matchup.open !== false,
      myVote,
      results: myVote ? { counts, total: all.length } : null,
      demo:
        myVote && matchup.demo
          ? {
              counts: { ...matchup.demo },
              total: Object.values(matchup.demo).reduce((sum, n) => sum + n, 0),
            }
          : null,
    }
  }
  const fail = (status: number, message: string) =>
    HttpResponse.json({ success: false, message }, { status })
  const found = (id: unknown) => id === 'current' || id === matchup.id
  return [
    http.get(apiUrl('/api/matchups/:id'), ({ params }) =>
      found(params.id)
        ? HttpResponse.json({ success: true, message: view() })
        : fail(404, 'Matchup not found'),
    ),
    http.put(apiUrl('/api/matchups/:id/vote'), async ({ params, request }) => {
      if (!found(params.id)) return fail(404, 'Matchup not found')
      const me = voter()
      if (!me) return fail(401, 'You must be logged in')
      if (matchup.open === false) return fail(409, 'Voting has closed for this matchup')
      const { songId } = (await request.json()) as { songId?: unknown }
      if (typeof songId !== 'string' || !matchup.songs.includes(songId))
        return fail(400, 'Vote for one of this matchup’s two songs')
      matchup.votes[me] = songId
      return HttpResponse.json({ success: true, message: view() })
    }),
  ]
}
