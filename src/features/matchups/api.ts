import { ApiError, ContractError, apiRequest, type ApiPath } from '../../lib/api'

/**
 * "Who Covered It Better?": two covers of the same song, one vote per logged-in user. The backend
 * decides everything (which songs, who voted what, the counts); this only reads its answers.
 * `results` is null until the session's user has voted (guests never get it). `demo` is sample
 * counts for previews (configured on the backend, never real votes), sent only alongside `results`:
 * show it labelled as samples, and never add it to the real counts.
 */
export type MatchupResults = { counts: Record<string, number>; total: number }
export type Matchup = {
  id: string
  songs: [string, string]
  open: boolean
  myVote: string | null
  results: MatchupResults | null
  demo: MatchupResults | null
}

const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0

const isResults = (r: unknown, songs: string[]): r is MatchupResults => {
  const results = r as MatchupResults | null
  return (
    typeof results === 'object' &&
    results !== null &&
    isCount(results.total) &&
    songs.every((id) => isCount(results.counts?.[id]))
  )
}

function parseMatchup(path: ApiPath, data: unknown): Matchup {
  const m = data as Partial<Matchup> | null
  const songs = m?.songs
  const results = m?.results
  const demo = m?.demo ?? null
  const valid =
    typeof m?.id === 'string' &&
    Array.isArray(songs) &&
    songs.length === 2 &&
    songs.every((id) => typeof id === 'string') &&
    typeof m.open === 'boolean' &&
    (m.myVote === null || (typeof m.myVote === 'string' && songs.includes(m.myVote))) &&
    (results === null || isResults(results, songs)) &&
    (demo === null || isResults(demo, songs))
  if (!valid) throw new ContractError(`${path}: expected a matchup`)
  return { ...(m as Matchup), demo }
}

const CURRENT: ApiPath = '/api/matchups/current'

/** The current matchup, or null when there is none (or it doesn't qualify: the backend says 404). */
export async function fetchCurrentMatchup(): Promise<Matchup | null> {
  try {
    return parseMatchup(CURRENT, await apiRequest(CURRENT))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Casts or changes the session user's vote; answers with the updated matchup (results included). */
export async function castVote(matchupId: string, songId: string): Promise<Matchup> {
  const path: ApiPath = `/api/matchups/${encodeURIComponent(matchupId)}/vote`
  const data = await apiRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId }),
  })
  return parseMatchup(path, data)
}

/**
 * Whole percentages that add up to 100 (the first rounds, the second takes the rest), of the real
 * results, or of other counts for the same two songs (the samples).
 */
export function percentages(
  matchup: Matchup,
  results: MatchupResults | null = matchup.results,
): [number, number] | null {
  const { songs } = matchup
  if (!results || results.total === 0) return null
  const first = Math.round((100 * (results.counts[songs[0]] ?? 0)) / results.total)
  return [first, 100 - first]
}
