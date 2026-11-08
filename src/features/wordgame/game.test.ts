import { describe, expect, it } from 'vitest'
import type { ChallengeBoard, RevealedAnswer } from './api'
import {
  foundCount,
  gameReducer,
  isComplete,
  maxScore,
  newGame,
  score,
  type GameAction,
} from './game'

const board: ChallengeBoard = {
  id: 'somebody-001',
  word: 'somebody',
  points: { base: 100, hinted: 60 },
  answers: [1, 2, 3, 4, 5].map((position) => ({ id: `answer-${position}`, position })),
}
const song = (position: number): RevealedAnswer => ({
  id: `answer-${position}`,
  position,
  title: `Song ${position}`,
  artist: `Artist ${position}`,
})
const match = (position: number, round = 0): GameAction => ({
  type: 'match',
  round,
  answer: song(position),
  points: board.points,
})
const hint = (position: number, round = 0): GameAction => ({
  type: 'hint',
  round,
  answerId: `answer-${position}`,
  artist: `Artist ${position}`,
})
const play = (...actions: GameAction[]) => actions.reduce(gameReducer, newGame())

describe('One Word, Five Songs rules', () => {
  it('finds a song in any position, leaving the others hidden', () => {
    const state = play(match(4))
    expect(Object.keys(state.found)).toEqual(['answer-4'])
    expect(state.found['answer-4']).toMatchObject({ title: 'Song 4', points: 100 })
    expect(state.feedback).toEqual({ kind: 'found', answerId: 'answer-4' })
    expect(foundCount(state)).toBe(1)
  })

  it('scores a song once: a duplicate adds nothing', () => {
    const state = play(match(4), match(4))
    expect(score(state)).toBe(100)
    expect(foundCount(state)).toBe(1)
    expect(state.feedback).toEqual({ kind: 'duplicate', answerId: 'answer-4' })
  })

  it('gives 60 after that song’s hint, 100 otherwise', () => {
    const state = play(hint(4), match(4), match(1))
    expect(state.found['answer-4']!.points).toBe(60)
    expect(state.found['answer-1']!.points).toBe(100)
    expect(score(state)).toBe(160)
  })

  it('keeps hints per song, and a repeated hint costs nothing more', () => {
    const state = play(hint(2), hint(2), hint(2), match(2), match(3))
    expect(state.hints).toEqual({ 'answer-2': 'Artist 2' })
    expect(score(state)).toBe(160)
    expect(play(hint(2)).feedback).toEqual({ kind: 'hint', answerId: 'answer-2' })
  })

  it('ignores a hint for a song already found', () => {
    const state = play(match(5), hint(5))
    expect(state.hints).toEqual({})
    expect(score(state)).toBe(100)
  })

  it('scores 500 for five songs without hints, the maximum', () => {
    const state = play(match(5), match(3), match(1), match(4), match(2))
    expect(score(state)).toBe(500)
    expect(maxScore(board)).toBe(500)
    expect(isComplete(state, board)).toBe(true)
  })

  it('adds up mixed hints: 100 + 60 + 100 + 60 + 100 = 420', () => {
    const state = play(hint(2), hint(4), match(1), match(2), match(3), match(4), match(5))
    expect(score(state)).toBe(420)
  })

  it('completes only once all five are found', () => {
    let state = newGame()
    for (const position of [1, 2, 3, 4]) {
      state = gameReducer(state, match(position))
      expect(isComplete(state, board)).toBe(false)
    }
    state = gameReducer(state, match(4))
    expect(isComplete(state, board)).toBe(false)
    expect(isComplete(gameReducer(state, match(5)), board)).toBe(true)
  })

  it('changes only the feedback on wrong guesses and failed requests', () => {
    const before = play(hint(1), match(4))
    for (const action of [
      { type: 'miss', round: 0, reason: 'not-recognized' },
      { type: 'miss', round: 0, reason: 'ambiguous' },
      { type: 'error', round: 0 },
      { type: 'hint-error', round: 0 },
    ] as GameAction[]) {
      const after = gameReducer(before, action)
      expect(after.found).toBe(before.found)
      expect(after.hints).toBe(before.hints)
      expect(score(after)).toBe(100)
    }
  })

  it('restarts with nothing found, no hints, no score and no feedback', () => {
    const state = gameReducer(play(hint(2), match(4), match(2)), { type: 'restart' })
    expect(state).toEqual({ round: 1, found: {}, hints: {}, feedback: null })
    expect(score(state)).toBe(0)
  })

  it('ignores answers to requests sent before a restart', () => {
    const restarted = gameReducer(play(), { type: 'restart' })
    const late = [match(4, 0), hint(2, 0), { type: 'error', round: 0 } as GameAction].reduce(
      gameReducer,
      restarted,
    )
    expect(late).toEqual(restarted)
    expect(gameReducer(restarted, match(4, 1)).found['answer-4']).toBeDefined()
  })
})
