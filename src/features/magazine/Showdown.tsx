import { useEffect, useState, type CSSProperties } from 'react'
import { cx } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { percentages } from '../matchups/api'
import { PlayableCoverArt } from '../songs/PlayableCoverArt'
import { displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { names, type ShowdownProps } from './showdownTypes'

/*
 * "Who Covered It Better?" (the approved design, 2026-11-08): the whole section is one split
 * poster, pink on the left and electric blue on the right, divided by a torn edge from top to
 * bottom. The heading, both competitors, the votes and the results all sit on it. Pink side: ink
 * type, heavy and condensed, a halftone corner. Blue side: paper type, light and lowercase,
 * turquoise sound rings. A yellow VS sticker sits on the tear.
 *
 * From desktop the split is one background layer behind everything (the two columns meet at the
 * middle). Below desktop the content stacks, so the colors follow it: heading and the first
 * competitor on pink (ending in a torn edge), the second and the results on blue (the section).
 */

// Text, links and the focus ring take their colors from these (base.css), so the shared pieces
// stay legible on each side.
const ON_PINK = {
  '--surface-fg': 'var(--color-ink)',
  '--surface-soft': 'rgb(21 18 29 / 0.8)',
  '--surface-focus': 'var(--color-ink)',
} as CSSProperties
const ON_BLUE = {
  '--surface-fg': 'var(--color-paper)',
  '--surface-soft': 'rgb(246 241 235 / 0.85)',
  '--surface-focus': 'var(--color-yellow)',
} as CSSProperties

// The tear, top to bottom, on the pink layer's right edge (it reaches 2.5rem past the middle).
const TEAR =
  'polygon(0 0, 100% 0, calc(100% - 3rem) 7%, calc(100% - 0.5rem) 15%, calc(100% - 4rem) 24%, calc(100% - 1.25rem) 33%, calc(100% - 4.5rem) 43%, calc(100% - 1rem) 52%, calc(100% - 3.75rem) 62%, calc(100% - 0.75rem) 71%, calc(100% - 4.25rem) 80%, calc(100% - 1.5rem) 90%, calc(100% - 3.5rem) 100%, 0 100%)'

export function Showdown(props: ShowdownProps) {
  const { pair, matchup, guest, pendingSong, onCancelPending } = props
  const [a] = pair
  return (
    <>
      {/* The split, from desktop: blue is the section itself; pink is this torn layer. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 hidden desktop:block">
        <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_92%_8%,rgb(30_214_193/0.7),transparent_45%)]" />
        <span className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_96%_92%,transparent_0_22px,rgb(30_214_193/0.5)_22px_24px)] [mask-image:radial-gradient(ellipse_at_96%_92%,black,transparent_40%)]" />
        <span
          style={{ clipPath: TEAR }}
          className="absolute inset-y-0 left-0 w-[calc(50%+2.5rem)] bg-pink bg-[radial-gradient(ellipse_at_10%_6%,rgb(255_255_255/0.3),transparent_50%)]"
        >
          <span className="absolute inset-0 bg-[radial-gradient(var(--color-ink)_1.3px,transparent_1.8px)] bg-size-[11px_11px] opacity-30 [mask-image:radial-gradient(ellipse_at_0%_0%,black,transparent_45%)]" />
        </span>
      </div>

      {/* The heading, across the tear. Paper letters with an ink outline and a printed shadow
          read on pink and on blue; the small lines are ink stickers. */}
      <header
        style={ON_PINK}
        className="grid justify-items-center gap-2 bg-pink px-margin pt-14 pb-6 text-center desktop:bg-transparent desktop:pt-10 desktop:pb-0"
      >
        <h2 id="showdown-title" className="m-0 grid justify-items-center gap-2">
          <span
            data-surface="ink"
            className="-rotate-2 bg-ink px-3 py-1 type-label tracking-[0.3em] text-fg uppercase"
          >
            Who covered it better?
          </span>{' '}
          <span className="font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.9] text-paper [overflow-wrap:anywhere] [paint-order:stroke_fill] [-webkit-text-stroke:0.16em_var(--color-ink)] [text-shadow:0.06em_0.06em_0_var(--color-ink)]">
            {displayTitle(a.title)}
          </span>
        </h2>
        {a.originalArtists.length > 0 && (
          <p
            data-surface="ink"
            className="m-0 rotate-1 bg-ink px-3 py-1 type-meta tracking-[0.04em] text-fg"
          >
            Originally by <ArtistLinks artists={a.originalArtists} role="songBy" />
          </p>
        )}
      </header>

      <div className="relative grid desktop:mx-auto desktop:mt-7 desktop:max-w-[64rem] desktop:grid-cols-2 desktop:gap-x-28 desktop:px-margin">
        <Poster {...props} song={pair[0]} side={0} />
        <VsSticker />
        <Poster {...props} song={pair[1]} side={1} />
      </div>

      <div className="px-margin pt-8 pb-12 desktop:mx-auto desktop:max-w-[64rem] desktop:pb-10">
        {matchup.results ? (
          <ResultsB {...props} />
        ) : (
          <div className="grid justify-items-center">
            <div
              data-surface="ink"
              className="-rotate-1 rounded-sm bg-ink px-6 py-4 text-fg shadow-[5px_5px_0_rgb(21_18_29/0.35)]"
            >
              <VotePrompt
                matchup={matchup}
                guest={guest}
                pendingSong={pendingSong}
                onCancelPending={onCancelPending}
              />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function voteLabel(matchup: ShowdownProps['matchup'], song: CoverSong) {
  const who = names(song)
  return matchup.myVote === song.id
    ? 'Your vote'
    : matchup.myVote
      ? `Switch to ${who}`
      : `Vote for ${who}`
}

/** Before the reader has voted: the invitation, and a guest's pending login. */
function VotePrompt({
  matchup,
  guest,
  pendingSong,
  onCancelPending,
}: Pick<ShowdownProps, 'matchup' | 'guest' | 'pendingSong' | 'onCancelPending'>) {
  return (
    <div className="grid justify-items-center gap-3 text-center">
      <p className="m-0 font-heading text-[1.375rem] font-[800] tracking-[0.04em] text-fg uppercase">
        {matchup.open ? 'Vote to reveal the results.' : 'Voting has closed.'}
      </p>
      {pendingSong ? (
        <p className="m-0 type-meta text-fg-soft">
          Log in to count your vote for {names(pendingSong)}.{' '}
          <button
            type="button"
            onClick={onCancelPending}
            className="cursor-pointer text-fg underline underline-offset-2 hover:text-pink"
          >
            Cancel
          </button>
        </p>
      ) : (
        guest &&
        matchup.open && (
          <p className="m-0 type-meta text-fg-soft">Listen to both. Log in with Google to vote.</p>
        )
      )}
    </div>
  )
}

/** One competitor: the performance (plays in the shell's player), the cover artist, the vote. */
function Poster({
  song,
  side,
  matchup,
  guest,
  busy,
  onVote,
}: ShowdownProps & { song: CoverSong; side: 0 | 1 }) {
  const pink = side === 0
  const mine = matchup.myVote === song.id
  const who = names(song)
  return (
    <article
      aria-label={who}
      data-poster={pink ? 'pink' : 'blue'}
      style={pink ? ON_PINK : ON_BLUE}
      className={cx(
        'relative grid gap-4 px-margin text-fg desktop:px-0',
        pink
          ? // Below desktop, Little Simz closes the pink half with the torn edge.
            'z-10 -mb-8 bg-pink pt-6 pb-24 [clip-path:polygon(0_0,100%_0,100%_93%,85%_97.5%,69%_94%,52%_99%,35%_94.5%,18%_98%,0_94%)] desktop:mb-0 desktop:bg-transparent desktop:py-0 desktop:[clip-path:none]'
          : 'pt-16 desktop:justify-items-end desktop:pt-0 desktop:text-right',
      )}
    >
      <div className="relative w-full justify-self-stretch">
        <PlayableCoverArt
          song={song}
          artSize="hero"
          className={cx(
            'block border-[5px]',
            pink
              ? '-rotate-3 border-ink bg-ink shadow-[10px_10px_0_rgb(21_18_29/0.85)]'
              : 'rotate-3 border-paper bg-paper shadow-[-10px_10px_0_rgb(21_18_29/0.45)]',
          )}
        />
        {mine && (
          <span
            aria-hidden="true"
            className={cx(
              'pointer-events-none absolute -top-4 z-10 rounded-sm border-2 border-ink bg-yellow px-3 py-1 font-heading text-[0.9375rem] font-[800] tracking-[0.12em] text-ink uppercase shadow-[3px_3px_0_var(--color-ink)]',
              pink ? '-left-3 -rotate-12' : '-right-3 rotate-12',
            )}
          >
            Your vote
          </span>
        )}
      </div>

      <h3
        className={cx(
          'm-0 mt-2 font-heading text-[clamp(2.5rem,4.8vw,4.75rem)] leading-[0.85] [overflow-wrap:anywhere]',
          pink
            ? 'font-[800] tracking-[-0.02em] uppercase [font-stretch:75%]'
            : 'font-[300] tracking-[-0.045em] lowercase [font-stretch:100%]',
        )}
      >
        <ArtistLinks artists={song.artists} role="artist" />
      </h3>

      {matchup.open && (
        <button
          type="button"
          onClick={() => onVote(song)}
          aria-pressed={guest ? undefined : mine}
          aria-disabled={busy || undefined}
          aria-label={guest ? `Log in to vote for ${who}` : undefined}
          className={cx(
            'inline-flex min-h-13 cursor-pointer items-center justify-center gap-2 justify-self-start rounded-control px-7 font-heading text-[1.125rem] font-[800] tracking-[0.06em] uppercase transition-[translate,box-shadow] duration-(--duration-fast) ease-snap max-tablet:justify-self-stretch aria-disabled:cursor-wait aria-disabled:opacity-70',
            !pink && 'desktop:justify-self-end',
            mine
              ? 'border-[3px] border-current bg-transparent text-fg'
              : cx(
                  'hover:-translate-y-0.5',
                  pink
                    ? 'bg-ink text-pink shadow-[5px_5px_0_rgb(255_255_255/0.45)]'
                    : 'bg-paper text-blue shadow-[-5px_5px_0_rgb(21_18_29/0.35)]',
                ),
          )}
        >
          {mine && <span aria-hidden="true">✓</span>}
          {voteLabel(matchup, song)}
        </button>
      )}
    </article>
  )
}

/**
 * A die-cut yellow sticker on the tear, level with the thumbnails (between the stacked
 * competitors below desktop).
 */
function VsSticker() {
  return (
    <div
      aria-hidden="true"
      className="relative z-20 -my-10 justify-self-center desktop:absolute desktop:top-[7.5rem] desktop:left-1/2 desktop:my-0 desktop:-translate-x-1/2 desktop:-translate-y-1/2"
    >
      <span className="grid size-28 -rotate-[8deg] place-items-center rounded-[47%_53%_44%_56%/56%_44%_56%_44%] border-4 border-ink bg-yellow font-display text-[3rem] leading-none text-ink shadow-[6px_6px_0_var(--color-ink)] desktop:size-32 desktop:text-[3.75rem]">
        VS
      </span>
    </div>
  )
}

/**
 * After voting, on the split itself: Little Simz's real percentage on pink, Daniela Andrade's on
 * blue, the total on an ink sticker on the tear (large: with few votes the count matters as much as
 * the split), and one framed bar across both sides, divided where the vote falls. It slides from
 * the middle (instantly with reduced motion). Below desktop everything here is on blue.
 */
function ResultsB({ pair, matchup }: ShowdownProps) {
  // Sample counts (preview data from the backend config), when sent, replace the real ones on
  // screen, clearly labelled, with the real count beside them. They are never added together.
  const sample = matchup.demo
  const displayed = sample ?? matchup.results
  const split = percentages(matchup, displayed) ?? [50, 50]
  const [shown, setShown] = useState<readonly [number, number]>([50, 50])
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(split))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split[0]])
  const total = displayed?.total ?? 0
  const real = matchup.results?.total ?? 0

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 items-end gap-x-3 tablet:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] tablet:gap-x-6">
        {pair.map((song, i) => (
          <p
            key={song.id}
            className={cx(
              'row-start-1 m-0 grid gap-1',
              i === 0
                ? 'col-start-1 text-paper desktop:text-ink'
                : 'col-start-2 justify-items-end text-right text-paper tablet:col-start-3',
            )}
          >
            <span className="flex flex-wrap items-center gap-2 type-chip font-bold tracking-[0.15em] uppercase">
              {matchup.myVote === song.id && (
                <span className="-rotate-3 rounded-sm bg-yellow px-2 py-0.5 text-ink">
                  Your vote
                </span>
              )}
              {names(song)}
            </span>
            <span className="font-display text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[0.85]">
              {split[i]}%
            </span>
          </p>
        ))}
        <p
          data-surface="ink"
          className="col-span-2 row-start-2 m-0 mt-6 grid -rotate-2 justify-items-center justify-self-center self-center rounded-sm bg-ink px-3 py-2 text-fg shadow-[4px_4px_0_rgb(21_18_29/0.35)] tablet:col-span-1 tablet:col-start-2 tablet:row-start-1 tablet:mt-0 tablet:px-5"
        >
          <span className="font-display text-[clamp(1.75rem,3.5vw,3rem)] leading-none">
            {total.toLocaleString('en')}
          </span>
          <span className="type-chip tracking-[0.15em] text-fg-soft uppercase">
            {sample
              ? total === 1
                ? 'sample vote'
                : 'sample votes'
              : total === 1
                ? 'vote so far'
                : 'votes so far'}
            {!matchup.open && ' · closed'}
          </span>
          {sample && (
            <span className="mt-1 border-t border-line pt-1 type-chip text-yellow">
              Preview data · {real} real {real === 1 ? 'vote' : 'votes'}
            </span>
          )}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="flex h-6 gap-[3px] overflow-hidden rounded-sm border-[3px] border-ink bg-ink shadow-[4px_4px_0_rgb(21_18_29/0.4)]"
      >
        {pair.map((song, i) => (
          <span
            key={song.id}
            style={{ flexBasis: `${shown[i]}%` }}
            className={cx(
              'block min-w-1 grow-0 transition-[flex-basis] duration-(--duration-slow) ease-snap motion-reduce:transition-none',
              i === 0 ? 'bg-pink' : 'bg-blue',
            )}
          />
        ))}
      </div>
    </div>
  )
}
