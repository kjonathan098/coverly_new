import type { ChallengeBoard, RevealedAnswer } from './api'

/*
 * "One Word, Five Songs" progress, as a pure reducer (no React, no network), so the rules are tested
 * on their own and any presentation can use them:
 * - a recognized song is found once; finding it again is a duplicate worth nothing;
 * - its points are fixed when it is found: `hinted` if its artist hint was used, else `base`;
 * - a hint is per song, applies once, and only to a song not yet found;
 * - wrong or ambiguous guesses and failed requests change nothing but the feedback;
 * - restart starts a new round; results of requests from an earlier round are ignored.
 */

export type Found = RevealedAnswer & { points: number }

export type Feedback =
  | { kind: 'found'; answerId: string }
  | { kind: 'duplicate'; answerId: string }
  | { kind: 'hint'; answerId: string }
  | { kind: 'not-recognized' }
  | { kind: 'ambiguous' }
  | { kind: 'error' }
  | { kind: 'hint-error' }

export type GameState = {
  round: number
  found: Record<string, Found>
  /** Answer id → artist, for hints used. */
  hints: Record<string, string>
  feedback: Feedback | null
}

export type GameAction =
  | { type: 'match'; round: number; answer: RevealedAnswer; points: ChallengeBoard['points'] }
  | { type: 'miss'; round: number; reason: 'not-recognized' | 'ambiguous' }
  | { type: 'error'; round: number }
  | { type: 'hint'; round: number; answerId: string; artist: string }
  | { type: 'hint-error'; round: number }
  | { type: 'restart' }

export const newGame = (round = 0): GameState => ({ round, found: {}, hints: {}, feedback: null })

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'restart') return newGame(state.round + 1)
  if (action.round !== state.round) return state
  switch (action.type) {
    case 'match': {
      const { answer } = action
      if (state.found[answer.id]) {
        return { ...state, feedback: { kind: 'duplicate', answerId: answer.id } }
      }
      const points = state.hints[answer.id] ? action.points.hinted : action.points.base
      return {
        ...state,
        found: { ...state.found, [answer.id]: { ...answer, points } },
        feedback: { kind: 'found', answerId: answer.id },
      }
    }
    case 'miss':
      return { ...state, feedback: { kind: action.reason } }
    case 'error':
      return { ...state, feedback: { kind: 'error' } }
    case 'hint':
      if (state.hints[action.answerId] || state.found[action.answerId]) return state
      return {
        ...state,
        hints: { ...state.hints, [action.answerId]: action.artist },
        feedback: { kind: 'hint', answerId: action.answerId },
      }
    case 'hint-error':
      return { ...state, feedback: { kind: 'hint-error' } }
  }
}

export const score = (state: GameState) =>
  Object.values(state.found).reduce((sum, found) => sum + found.points, 0)
export const foundCount = (state: GameState) => Object.keys(state.found).length
export const maxScore = (board: ChallengeBoard) => board.points.base * board.answers.length
export const isComplete = (state: GameState, board: ChallengeBoard) =>
  board.answers.every((answer) => state.found[answer.id])
