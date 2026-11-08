import { useMutation, useQuery } from '@tanstack/react-query'
import { useReducer, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button, Surface, cx } from '../../ui'
import { fetchCurrentChallenge, fetchHint, submitGuess, type ChallengeBoard } from './api'
import {
  foundCount,
  gameReducer,
  isComplete,
  maxScore,
  newGame,
  score,
  type Feedback,
  type GameState,
} from './game'

/*
 * "One Word, Five Songs": a two-page magazine spread. Left, the game on ink: the headline, the
 * challenge word on a strip of yellow paper, one lyric input, feedback and the score. Right, the
 * answer board on paper: five notebook entries that fill in as songs are found (hints reveal the
 * artist). The section is a size container: the pages sit side by side from 56rem of its own width
 * (which shrinks when the player takes its column), and stack below that, game first. Type and
 * spacing follow the panels' widths (cqw), not the window's.
 *
 * Presentation only: the rules are the pure reducer in game.ts, the answer bank stays on the backend
 * (api.ts). Every request goes out one at a time; feedback is announced in one live region.
 */

const challengeKey = ['word-challenge', 'current'] as const

export function OneWordFiveSongs() {
  const challenge = useQuery({
    queryKey: challengeKey,
    queryFn: fetchCurrentChallenge,
    staleTime: Infinity,
  })

  if (challenge.isPending) {
    return (
      <Notice>
        <p className="m-0 text-fg-soft">Loading the challenge…</p>
      </Notice>
    )
  }
  if (challenge.isError) {
    return (
      <Notice>
        <p role="alert" className="m-0">
          The challenge didn’t load.{' '}
          <Button variant="quiet" onClick={() => challenge.refetch()}>
            Try again
          </Button>
        </p>
      </Notice>
    )
  }
  if (!challenge.data) return null
  return <Game board={challenge.data} />
}

/** Loading and failure, before there is a board to draw. */
function Notice({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby="word-game-title" className="bg-ink px-margin py-12">
      <div className="mx-auto grid max-w-[72rem] gap-4">
        <Headline />
        {children}
      </div>
    </section>
  )
}

function Headline() {
  return (
    <h2
      id="word-game-title"
      className="m-0 font-heading text-[clamp(2.25rem,14cqw,4.5rem)] leading-[0.84] font-[800] tracking-[-0.02em] text-fg uppercase [font-stretch:75%]"
    >
      <span className="block">
        One word<span className="text-pink">.</span>
      </span>{' '}
      <span className="block ps-[0.6em]">
        Five songs<span className="text-pink">.</span>
      </span>
    </h2>
  )
}

function Game({ board }: { board: ChallengeBoard }) {
  const [game, dispatch] = useReducer(gameReducer, 0, newGame)
  const [text, setText] = useState('')
  const [hinting, setHinting] = useState<string | null>(null)
  const guess = useMutation({ mutationFn: (phrase: string) => submitGuess(board.id, phrase) })
  const hint = useMutation({ mutationFn: (answerId: string) => fetchHint(board.id, answerId) })
  // Set at once (state would only update on the next render): one request at a time, even when
  // Enter or a hint is pressed again before React re-renders.
  const busy = useRef({ guess: false, hint: false })
  const complete = isComplete(game, board)
  const max = maxScore(board)
  const total = board.answers.length
  const left = total - foundCount(game)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const phrase = text.trim()
    if (!phrase || busy.current.guess || complete) return
    const round = game.round
    busy.current.guess = true
    guess.mutate(phrase, {
      onSuccess: (result) => {
        if (result.matched) {
          dispatch({ type: 'match', round, answer: result.answer, points: board.points })
          setText('')
        } else {
          dispatch({ type: 'miss', round, reason: result.reason })
        }
      },
      // The phrase stays in the box, and progress is untouched.
      onError: () => dispatch({ type: 'error', round }),
      onSettled: () => {
        busy.current.guess = false
      },
    })
  }

  const onHint = (answerId: string) => {
    if (busy.current.hint) return
    const round = game.round
    busy.current.hint = true
    setHinting(answerId)
    hint.mutate(answerId, {
      onSuccess: (artist) => dispatch({ type: 'hint', round, answerId, artist }),
      onError: () => dispatch({ type: 'hint-error', round }),
      onSettled: () => {
        busy.current.hint = false
        setHinting(null)
      },
    })
  }

  const restart = () => {
    dispatch({ type: 'restart' })
    setText('')
  }

  return (
    <section aria-labelledby="word-game-title" className="@container">
      <div className="grid @min-[56rem]:grid-cols-[45fr_55fr]">
        {/* ── Left page: the game ── */}
        <Surface
          tone="ink"
          className="@container px-margin py-9 @min-[56rem]:py-8 @min-[56rem]:ps-[max(var(--spacing-margin),calc(50cqw-36rem))] @min-[56rem]:pe-10"
        >
          <div className="grid gap-4">
            <Headline />

            {/* The challenge word, on a strip of yellow paper taped to the page. */}
            <div className="relative -rotate-2 justify-self-start">
              <span
                aria-hidden="true"
                className="absolute -top-2.5 left-6 h-5 w-16 rotate-[-8deg] bg-paper/35"
              />
              <p className="m-0 bg-yellow px-[0.25em] pt-[0.12em] pb-[0.04em] font-display text-[min(15cqw,6rem)] leading-none text-ink uppercase shadow-[6px_6px_0_var(--color-pink)] [clip-path:polygon(0_3%,6%_0,22%_4%,41%_1%,63%_4%,81%_0,100%_3%,99%_96%,84%_100%,62%_97%,40%_100%,19%_96%,2%_100%)]">
                <span className="sr-only">The word: </span>
                {board.word}
              </p>
            </div>

            <div className="grid gap-1">
              <p className="m-0 type-lead font-bold">
                Five songs share one word. Can you remember the lyrics?
              </p>
              <p className="m-0 type-meta text-fg-soft">
                Guess in any order. Reveal artist hints for fewer points.
              </p>
            </div>

            {complete ? (
              <Completed found={total} score={score(game)} max={max} onRestart={restart} />
            ) : (
              <form onSubmit={onSubmit} className="flex flex-wrap gap-2.5">
                <label className="min-w-0 flex-[1_1_16rem]">
                  <span className="sr-only">Lyric phrase</span>
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type a lyric phrase…"
                    autoComplete="off"
                    maxLength={200}
                    className="block min-h-13 w-full rounded-sm border-[3px] border-yellow bg-paper px-4 font-text text-[1.125rem] text-ink placeholder:text-paper-soft focus-visible:border-pink focus-visible:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  aria-disabled={guess.isPending || undefined}
                  className="min-h-13 cursor-pointer rounded-sm bg-yellow px-7 font-heading text-[1.25rem] font-[800] tracking-[0.12em] text-ink uppercase shadow-[4px_4px_0_var(--color-pink)] transition-[translate,box-shadow] duration-(--duration-fast) ease-snap hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-pink)] aria-disabled:cursor-wait aria-disabled:opacity-70 max-tablet:flex-1"
                >
                  {guess.isPending ? 'Checking…' : 'Guess'}
                </button>
              </form>
            )}

            <FeedbackNote game={game} board={board} />

            {/* The score, set like a scorecard's footer. */}
            <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-t border-line pt-4">
              <Tally label="Songs found" value={foundCount(game)} of={total} />
              <Tally label="Score" value={score(game)} of={max} accent />
              {!complete && (
                <Button
                  variant="quiet"
                  onClick={restart}
                  className="ms-auto type-meta text-fg-soft"
                >
                  Restart
                </Button>
              )}
            </div>
          </div>
        </Surface>

        {/* ── Right page: the answer board ── */}
        <Surface
          tone="paper"
          grain
          className="@container flex flex-col px-margin py-9 @min-[56rem]:py-8 @min-[56rem]:pe-[max(var(--spacing-margin),calc(50cqw-36rem))] @min-[56rem]:ps-10"
        >
          <header className="border-b-[3px] border-double border-ink pb-2">
            <h3 className="m-0 font-heading text-[clamp(1.4rem,5cqw,2rem)] leading-none font-[800] tracking-[0.14em] uppercase">
              The answer board
            </h3>
            <p className="m-0 mt-1.5 type-meta text-fg-soft">
              {left === 0
                ? `All ${total} songs discovered`
                : `${left} ${left === 1 ? 'song' : 'songs'} waiting to be discovered`}
            </p>
          </header>

          {/* Side by side, the five entries share the page's height, level with the game page
            (stacked, the board is only as tall as its entries). */}
          <ol aria-label="Answers" className="m-0 grid flex-1 auto-rows-fr list-none p-0">
            {board.answers.map(({ id, position }) => (
              <Entry
                key={id}
                number={position}
                found={game.found[id]}
                artist={game.hints[id]}
                points={board.points}
                loading={hinting === id}
                disabled={hinting !== null}
                onHint={() => onHint(id)}
              />
            ))}
          </ol>
          <p className="m-0 mt-3 type-chip tracking-[0.08em] text-fg-soft uppercase">
            {board.points.base} points a song · {board.points.hinted} with its artist revealed ·{' '}
            {max} for all {total}
          </p>
        </Surface>
      </div>
    </section>
  )
}

/** One notebook entry: a mystery, a clue (the artist), or a found song with its stamp. */
function Entry({
  number,
  found,
  artist,
  points,
  loading,
  disabled,
  onHint,
}: {
  number: number
  found: GameState['found'][string] | undefined
  artist: string | undefined
  points: ChallengeBoard['points']
  loading: boolean
  disabled: boolean
  onHint: () => void
}) {
  return (
    // On a narrow board (under 30rem of its own width) the hint or stamp moves under the title.
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] content-center items-center gap-x-3 gap-y-1.5 border-b border-line py-2.5 @min-[30rem]:grid-cols-[3.5rem_minmax(0,1fr)_auto] @min-[30rem]:gap-x-4">
      <span
        className={cx(
          'row-span-2 self-start font-heading text-[2rem] leading-none font-[800] tracking-[-0.03em] [font-stretch:75%] @min-[30rem]:row-span-1 @min-[30rem]:self-center @min-[30rem]:text-[2.5rem]',
          found ? 'text-pink-ink' : 'text-fg',
        )}
      >
        {String(number).padStart(2, '0')}
      </span>

      {found ? (
        <div key="found" className="grid motion-safe:animate-flip-in">
          <span className="font-heading text-[1.15rem] leading-tight font-[800]">
            “{found.title}”
          </span>
          <span className="type-meta text-fg-soft">{found.artist}</span>
        </div>
      ) : (
        <div className="grid gap-1">
          <span className="sr-only">Hidden song</span>
          {/* The concealed title: an inked-out line. */}
          <span
            aria-hidden="true"
            className="block h-3 w-[min(14rem,80%)] rounded-[2px] bg-ink/85"
          />
          {artist ? (
            <span key="clue" className="type-meta motion-safe:animate-flip-in">
              Artist:{' '}
              <strong className="bg-[linear-gradient(transparent_55%,var(--color-yellow)_55%)] px-0.5 text-fg">
                {artist}
              </strong>
            </span>
          ) : (
            <span className="type-chip tracking-[0.12em] text-fg-soft uppercase">Mystery song</span>
          )}
        </div>
      )}

      {found ? (
        <span
          key="stamp"
          className="col-start-2 -rotate-6 justify-self-start rounded-sm border-2 border-pink-ink px-2 py-0.5 font-heading @min-[30rem]:col-start-3 @min-[30rem]:justify-self-end text-[1.05rem] leading-none font-[800] tracking-[0.04em] text-pink-ink motion-safe:animate-flip-in"
        >
          ✓ +{found.points}
        </span>
      ) : artist ? (
        <span className="col-start-2 type-chip tracking-[0.08em] uppercase @min-[30rem]:col-start-3 @min-[30rem]:text-right">
          Worth <s className="text-fg-soft">{points.base}</s> <b>{points.hinted}</b>
        </span>
      ) : (
        <button
          type="button"
          onClick={onHint}
          disabled={disabled}
          aria-label={`Show the artist of song ${number} (worth ${points.hinted} points instead of ${points.base})`}
          className="col-start-2 min-h-10 cursor-pointer justify-self-start rounded-sm border-2 border-ink px-3 @min-[30rem]:col-start-3 @min-[30rem]:justify-self-end type-chip font-bold tracking-[0.12em] uppercase transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? 'Revealing…' : 'Reveal artist'}
        </button>
      )}
    </li>
  )
}

function Tally({
  label,
  value,
  of,
  accent = false,
}: {
  label: string
  value: number
  of: number
  accent?: boolean
}) {
  return (
    <p className="m-0 grid">
      <span className="type-chip tracking-[0.15em] text-fg-soft uppercase">{label}</span>
      <span className="font-display text-[2rem] leading-none">
        <span className={accent ? 'text-yellow' : 'text-fg'}>{value}</span>
        <span className="text-[1rem] text-fg-soft"> / {of}</span>
      </span>
    </p>
  )
}

/** In place of the input once all songs are found: the result, and a way to play again. */
function Completed({
  found,
  score: points,
  max,
  onRestart,
}: {
  found: number
  score: number
  max: number
  onRestart: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-sm border-[3px] border-dashed border-yellow px-4 py-3 motion-safe:animate-flip-in">
      <p className="m-0 grid">
        <span className="font-display text-[1.75rem] leading-none text-yellow">
          All {found} found!
        </span>
        <span className="type-label">
          Final score {points} / {max}
        </span>
      </p>
      <Button onClick={onRestart} className="ms-auto">
        Restart
      </Button>
    </div>
  )
}

const TONES: Record<Feedback['kind'], string> = {
  found: 'border-yellow bg-yellow/12',
  hint: 'border-yellow',
  duplicate: 'border-turquoise',
  'not-recognized': 'border-dashed border-ink-soft',
  ambiguous: 'border-dashed border-ink-soft',
  error: 'border-pink bg-pink/12',
  'hint-error': 'border-pink bg-pink/12',
}

/** What the last guess or hint did. The one live region: screen readers hear every change. */
function FeedbackNote({ game, board }: { game: GameState; board: ChallengeBoard }) {
  const message = feedbackText(game, board)
  const complete = isComplete(game, board)
  return (
    <p
      role="status"
      className={cx(
        'm-0 min-h-[2.75rem] border-l-4 px-4 py-1.5 type-body',
        game.feedback ? TONES[game.feedback.kind] : 'border-transparent',
      )}
    >
      <span
        key={`${game.round}-${JSON.stringify(game.feedback)}`}
        className="motion-safe:animate-flip-in"
      >
        {message}
        {complete &&
          ` You found all ${board.answers.length} songs! Final score: ${score(game)} / ${maxScore(board)}.`}
      </span>
    </p>
  )
}

/** What the last guess or hint did, in words. */
function feedbackText({ feedback, found, hints }: GameState, board: ChallengeBoard) {
  switch (feedback?.kind) {
    case 'found': {
      const song = found[feedback.answerId]!
      return `Found #${song.position}: “${song.title}” by ${song.artist}. +${song.points} points.`
    }
    case 'duplicate': {
      const song = found[feedback.answerId]!
      return `You already found #${song.position}, “${song.title}”. No extra points.`
    }
    case 'hint': {
      const position = board.answers.find((a) => a.id === feedback.answerId)?.position
      return `Hint for #${position}: the artist is ${hints[feedback.answerId]}. It’s now worth ${board.points.hinted} points.`
    }
    case 'not-recognized':
      return 'We didn’t recognize that phrase. It may be a real lyric we haven’t added yet. Try another phrase.'
    case 'ambiguous':
      return 'That phrase fits more than one song. Try a different phrase.'
    case 'error':
      return 'Couldn’t check your phrase. Check your connection and try again.'
    case 'hint-error':
      return 'Couldn’t load the hint. Try again.'
    default:
      return ''
  }
}
