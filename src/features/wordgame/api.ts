import { ApiError, ContractError, apiRequest, type ApiPath } from '../../lib/api'

/**
 * "One Word, Five Songs": the backend keeps the answer bank. The board has only ids and positions;
 * a recognized guess reveals that one song, a hint that one artist.
 */
export type ChallengeBoard = {
  id: string
  word: string
  points: { base: number; hinted: number }
  answers: { id: string; position: number }[]
}
export type RevealedAnswer = { id: string; position: number; title: string; artist: string }
export type GuessResult =
  | { matched: true; answer: RevealedAnswer }
  | { matched: false; reason: 'not-recognized' | 'ambiguous' }

const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isPosition = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v > 0

function parseBoard(path: ApiPath, data: unknown): ChallengeBoard {
  const b = data as Partial<ChallengeBoard> | null
  const valid =
    isText(b?.id) &&
    isText(b.word) &&
    isPosition(b.points?.base) &&
    isPosition(b.points?.hinted) &&
    Array.isArray(b.answers) &&
    b.answers.length > 0 &&
    b.answers.every((a) => isText(a?.id) && isPosition(a.position))
  if (!valid) throw new ContractError(`${path}: expected a challenge board`)
  return b as ChallengeBoard
}

function parseGuess(path: ApiPath, data: unknown): GuessResult {
  const r = data as { matched?: unknown; reason?: unknown; answer?: Partial<RevealedAnswer> }
  if (r?.matched === true) {
    const a = r.answer
    if (isText(a?.id) && isPosition(a.position) && isText(a.title) && isText(a.artist)) {
      return { matched: true, answer: a as RevealedAnswer }
    }
  } else if (r?.matched === false && (r.reason === 'not-recognized' || r.reason === 'ambiguous')) {
    return { matched: false, reason: r.reason }
  }
  throw new ContractError(`${path}: expected a guess result`)
}

const CURRENT: ApiPath = '/api/word-challenges/current'

/** The current challenge's board, or null when there is none. */
export async function fetchCurrentChallenge(): Promise<ChallengeBoard | null> {
  try {
    return parseBoard(CURRENT, await apiRequest(CURRENT))
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function submitGuess(challengeId: string, guess: string): Promise<GuessResult> {
  const path: ApiPath = `/api/word-challenges/${encodeURIComponent(challengeId)}/guesses`
  const data = await apiRequest(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guess }),
  })
  return parseGuess(path, data)
}

/** One answer's artist (the hint). */
export async function fetchHint(challengeId: string, answerId: string): Promise<string> {
  const path: ApiPath = `/api/word-challenges/${encodeURIComponent(challengeId)}/answers/${encodeURIComponent(answerId)}/hint`
  const data = (await apiRequest(path)) as { id?: unknown; artist?: unknown } | null
  if (data?.id !== answerId || !isText(data.artist)) {
    throw new ContractError(`${path}: expected a hint`)
  }
  return data.artist
}
