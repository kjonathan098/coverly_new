import { http, HttpResponse, type AnyHandler } from 'msw'
import { apiUrl } from '../../lib/api'

/** A mocked challenge with its server-side answer bank, for tests. */
export type MockWordChallenge = {
  id: string
  word: string
  points: { base: number; hinted: number }
  answers: { id: string; position: number; title: string; artist: string; phrases: string[] }[]
}

const normalize = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’‘`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/**
 * The word challenge routes, mirroring the backend (exact phrase matching after normalization).
 * `fail()` returning true makes guesses and hints answer 500, to test failures.
 */
export function wordChallengeHandlers(
  challenge: MockWordChallenge,
  fail: () => boolean = () => false,
): AnyHandler[] {
  const found = (id: unknown) => id === 'current' || id === challenge.id
  const notFound = () =>
    HttpResponse.json({ success: false, message: 'Challenge not found' }, { status: 404 })
  const broken = () => HttpResponse.json({ success: false, message: 'oops' }, { status: 500 })
  return [
    http.get(apiUrl('/api/word-challenges/:id'), ({ params }) =>
      found(params.id)
        ? HttpResponse.json({
            success: true,
            message: {
              id: challenge.id,
              word: challenge.word,
              points: challenge.points,
              answers: challenge.answers.map(({ id, position }) => ({ id, position })),
            },
          })
        : notFound(),
    ),
    http.post(apiUrl('/api/word-challenges/:id/guesses'), async ({ params, request }) => {
      if (!found(params.id)) return notFound()
      if (fail()) return broken()
      const { guess } = (await request.json()) as { guess?: unknown }
      const text = typeof guess === 'string' ? normalize(guess) : ''
      if (!text)
        return HttpResponse.json(
          { success: false, message: 'Type a lyric phrase' },
          { status: 400 },
        )
      const matches = challenge.answers.filter((a) => a.phrases.some((p) => normalize(p) === text))
      if (text === normalize(challenge.word) || matches.length === 0)
        return HttpResponse.json({
          success: true,
          message: { matched: false, reason: 'not-recognized' },
        })
      if (matches.length > 1)
        return HttpResponse.json({
          success: true,
          message: { matched: false, reason: 'ambiguous' },
        })
      const { id, position, title, artist } = matches[0]!
      return HttpResponse.json({
        success: true,
        message: { matched: true, answer: { id, position, title, artist } },
      })
    }),
    http.get(apiUrl('/api/word-challenges/:id/answers/:answerId/hint'), ({ params }) => {
      if (!found(params.id)) return notFound()
      if (fail()) return broken()
      const answer = challenge.answers.find((a) => a.id === params.answerId)
      return answer
        ? HttpResponse.json({
            success: true,
            message: { id: answer.id, position: answer.position, artist: answer.artist },
          })
        : HttpResponse.json({ success: false, message: 'Answer not found' }, { status: 404 })
    }),
  ]
}
