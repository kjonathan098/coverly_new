import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import {
  ArrowIcon,
  Button,
  Container,
  PlayIcon,
  PauseIcon,
  Surface,
  buttonClasses,
  cx,
} from '../../ui'
import { play, playVerb, usePlaybackOf } from '../player/playback'
import type { Collection } from '../collections/collections'
import type { CoverSong } from '../songs/types'
import { discoverHref } from '../discover/useFilters'
import { CoverArt } from '../songs/CoverArt'
import { artistList, displayTitle, plural } from '../songs/format'

// One ink per slide, in turn, so each collection prints in its own color.
const TINTS = [
  'var(--color-pink)',
  'var(--color-turquoise)',
  'var(--color-blue)',
  'var(--color-cover-3)',
]

// The back sleeves of the fan: where they sit at rest, and how far they open on hover.
// The track is a scroller, so it clips: these offsets are sized to stay inside the art's padding.
const FAN = [
  'z-[2] -rotate-[6deg] -translate-x-[7%] translate-y-[4%] group-hover/art:-rotate-[8deg] group-hover/art:-translate-x-[10%]',
  'z-[1] rotate-[5deg] translate-x-[7%] -translate-y-[4%] group-hover/art:rotate-[7deg] group-hover/art:translate-x-[10%]',
]

type CarouselProps = {
  collections: Collection[]
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true
const pad = (n: number) => String(n).padStart(2, '0')
// The Rolodex turn (theme.css, --animate-rolodex-turn), plus a frame to finish.
const TURN_MS = 660
// The pile, front to back: the card on top, then the fan behind it. A real 3D stack (each card
// DEPTH px further back), so a card moving behind the pile is hidden by it gradually, never popped.
const SLOTS = [
  'z-[3] shadow-[0_0_0_6px_var(--color-paper)]',
  `z-[2] shadow-[0_0_0_4px_var(--color-ink)] ${FAN[0]}`,
  `z-[1] shadow-[0_0_0_4px_var(--color-ink)] ${FAN[1]}`,
]
const DEPTH = 14

/**
 * The homepage's featured collections, one at a time. Movement is always the reader's: buttons,
 * arrow keys, or a swipe (native scroll snapping, no gesture code). Nothing advances on its own.
 * Follows the WAI-ARIA carousel pattern; slides out of view are inert, so focus can't wander there.
 * Each slide is a Rolodex of the collection's songs: "Next song" lifts the front card over the pile
 * and puts it at the back, showing the next one beneath (no playback change). Play uses the app shell's player, so
 * turning cards, changing slides (or pages) never stops it.
 */
export function CollectionsCarousel({ collections }: CarouselProps) {
  const [index, setIndex] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  const track = useRef<HTMLDivElement>(null)
  // While a button-driven smooth scroll runs, the slides it passes are not "visited".
  const target = useRef<number | null>(null)
  const settle = useRef<number | undefined>(undefined)
  const count = collections.length

  useEffect(() => () => window.clearTimeout(settle.current), [])

  const show = (next: number) => {
    if (next === index) return
    setIndex(next)
    setAnnouncement(`Collection ${next + 1} of ${count}: ${collections[next]?.title ?? ''}`)
  }

  const go = (requested: number) => {
    const next = (requested + count) % count
    show(next)
    const slide = track.current?.children[next] as HTMLElement | undefined
    if (!track.current || !slide) return
    target.current = next
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => (target.current = null), 900)
    track.current.scrollTo?.({
      left: slide.offsetLeft,
      behavior: reducedMotion() ? 'auto' : 'smooth',
    })
  }

  const onScroll = () => {
    const el = track.current
    if (!el) return
    const slides = [...el.children] as HTMLElement[]
    const nearest = slides.reduce(
      (best, slide, i) =>
        Math.abs(slide.offsetLeft - el.scrollLeft) <
        Math.abs((slides[best]?.offsetLeft ?? 0) - el.scrollLeft)
          ? i
          : best,
      0,
    )
    if (target.current !== null) {
      if (nearest === target.current) target.current = null
      return
    }
    show(nearest)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowLeft: index - 1, ArrowRight: index + 1 }
    const next = keys[event.key]
    if (next === undefined) return
    event.preventDefault()
    go(next)
  }

  if (count === 0) return null

  return (
    <Surface
      as="section"
      tone="ink"
      grain
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onKeyDown={onKeyDown}
      className="overflow-hidden pt-8 pb-10 tablet:pt-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[6%] bg-[repeating-conic-gradient(from_8deg_at_70%_42%,rgb(49_89_255/0.2)_0deg_2.5deg,transparent_2.5deg_10deg)] mask-[radial-gradient(circle_at_70%_42%,transparent_0_8%,#000_22%,transparent_70%)]"
      />
      <Container size="full" className="relative">
        <div
          ref={track}
          onScroll={onScroll}
          className="relative flex snap-x snap-mandatory gap-gutter overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {collections.map((collection, i) => (
            <Slide
              key={collection.id}
              collection={collection}
              position={i}
              count={count}
              current={i === index}
              tint={TINTS[i % TINTS.length]!}
            />
          ))}
        </div>

        {count > 1 && (
          <div className="mt-8 flex items-center gap-3 border-t-[1.5px] border-line pt-4 tablet:gap-5">
            <ArrowButton label="Previous collection" flip onClick={() => go(index - 1)} />
            <p className="type-label m-0 flex-1 text-center tabular-nums tablet:hidden">
              {pad(index + 1)} / {pad(count)}
            </p>
            <ol className="m-0 hidden flex-1 list-none gap-2 p-0 tablet:flex desktop:gap-4">
              {collections.map((collection, i) => (
                <li key={collection.id} className="flex-1">
                  <button
                    type="button"
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => go(i)}
                    className={cx(
                      'group/tab flex min-h-11 w-full cursor-pointer items-baseline gap-2 border-t-[3px] pt-2 text-left transition-colors duration-(--duration-fast)',
                      i === index
                        ? 'border-pink text-fg'
                        : 'border-transparent text-fg-soft hover:border-line hover:text-fg',
                    )}
                  >
                    <span className={cx('type-label tabular-nums', i === index && 'text-pink')}>
                      {pad(i + 1)}
                    </span>
                    <span className="type-label max-desktop:sr-only">{collection.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <ArrowButton label="Next collection" onClick={() => go(index + 1)} />
          </div>
        )}
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </p>
      </Container>
    </Surface>
  )
}

function ArrowButton({
  label,
  flip = false,
  onClick,
}: {
  label: string
  flip?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-pill text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] transition-colors duration-(--duration-fast) hover:bg-pink hover:text-ink hover:shadow-none"
    >
      <ArrowIcon className={cx('size-5', flip && '-scale-x-100')} />
    </button>
  )
}

function Slide({
  collection,
  position,
  count,
  current,
  tint,
}: {
  collection: Collection
  position: number
  count: number
  current: boolean
  tint: string
}) {
  // A Rolodex of the collection's own recordings: its playable matches, in Discover's order.
  const deck = collection.playable.length ? collection.playable : collection.songs
  const [at, setAt] = useState(0)
  // The card tipping back over the top while the next one shows beneath it (null when at rest).
  const [turning, setTurning] = useState<CoverSong | null>(null)
  const [notice, setNotice] = useState('')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Coming back to a collection opens it on its first song again.
  const [shown, setShown] = useState(current)
  if (current !== shown) {
    setShown(current)
    if (current) {
      setAt(0)
      setTurning(null)
      setNotice('')
    }
  }

  // The current song, then the next two, fanned out behind it.
  const pile = SLOTS.slice(0, deck.length).map((_, k) => deck[(at + k) % deck.length]!)
  const front = pile[0]
  const lead = front?.video ? front : undefined
  // The current song's state in the shared player ('' never matches, when there's nothing to play).
  const status = usePlaybackOf(lead?.id ?? '')
  const verb = playVerb(status)

  // Only turns the card: playback changes only when the reader presses Play.
  const nextSong = () => {
    if (turning || !front || deck.length < 2) return
    const to = (at + 1) % deck.length
    const song = deck[to]!
    if (!reducedMotion()) {
      setTurning(front)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setTurning(null), TURN_MS)
    }
    setAt(to)
    setNotice(
      `Song ${to + 1} of ${deck.length}: ${displayTitle(song.title)}, covered by ${artistList(song.artists)}`,
    )
  }

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${position + 1} of ${count}`}
      inert={!current}
      className="grid w-full shrink-0 snap-start [scroll-snap-stop:always] content-center gap-10 py-4 desktop:grid-cols-12 desktop:items-center desktop:gap-x-gutter"
    >
      <div className="group/art mx-auto w-[76%] max-w-[44rem] py-[10%] desktop:order-2 desktop:col-span-7 desktop:col-start-6 desktop:w-[80%]">
        <div className="relative aspect-video perspective-[1400px] transform-3d">
          {/* Keyed by song: when the top card goes, each card below slides up a place. */}
          {pile.map((song, k) => (
            <CoverArt
              key={song.id}
              song={song}
              tint={tint}
              size="hero"
              status={k === 0 && lead ? status : null}
              style={{ transform: `translateZ(${-k * DEPTH}px)` }}
              className={cx(
                'absolute! inset-0 rounded-card transition-[translate,rotate,transform,box-shadow] duration-[640ms] ease-snap',
                SLOTS[k],
                // In a short deck the turning card is also in the pile: it shows once it lands.
                song.id === turning?.id && 'invisible transition-none',
              )}
            />
          ))}
          {/* The card being moved: lifted off the top, over and behind the pile, to the back. */}
          {turning && (
            <CoverArt
              key={`turning-${turning.id}`}
              song={turning}
              tint={tint}
              size="hero"
              className="pointer-events-none absolute! inset-0 z-[4] animate-rolodex-turn rounded-card shadow-[0_0_0_6px_var(--color-paper)]"
            />
          )}
        </div>
      </div>

      <div className="desktop:order-1 desktop:col-span-5">
        <p className="type-label m-0 text-accent">{collection.kind}</p>
        <h2 className="type-display m-0 mt-3">{collection.title}</h2>
        <p className="type-lead mt-4 max-w-[36ch] text-fg-soft">{collection.description}</p>
        <p className="type-label mt-4">
          {plural(collection.songs.length, 'cover')} ·{' '}
          {plural(collection.artistCount, 'cover artist')}
        </p>
        {/* Fixed labels in equal columns, so titles never move the buttons. They stack only when
            this column is too narrow for both (a container query, not the title's length). */}
        <div className="@container mt-7">
          <div className="grid gap-4 @min-[23.25rem]:grid-cols-[repeat(2,11rem)] @min-[23.25rem]:gap-5">
            {deck.length > 1 && (
              <button
                type="button"
                onClick={nextSong}
                className={buttonClasses({ size: 'lg', className: 'w-full' })}
              >
                Next song
                <ArrowIcon className="size-5" />
              </button>
            )}
            {lead && (
              <Button
                variant="secondary"
                size="lg"
                icon={verb === 'Pause' ? <PauseIcon /> : <PlayIcon />}
                aria-label={`${verb} song: ${displayTitle(lead.title)} by ${artistList(lead.artists)}`}
                onClick={() => play(lead)}
                className="w-full"
              >
                {verb} song
              </Button>
            )}
          </div>
        </div>
        {front && (
          // Always the same height (the column is centered beside the art, so a line more or less
          // would move everything): three lines on phones, two from tablets.
          <p className="type-meta mt-3 line-clamp-3 min-h-[3lh] text-fg-soft tablet:line-clamp-2 tablet:min-h-[2lh]">
            {deck.length > 1 && (
              <span className="type-label mr-2 leading-none text-fg tabular-nums">
                {pad(at + 1)} / {pad(deck.length)}
              </span>
            )}
            {displayTitle(front.title)}, covered by {artistList(front.artists)}
          </p>
        )}
        <Link
          to={discoverHref(collection.filters)}
          className="type-label mt-4 inline-flex min-h-11 items-center gap-2 text-fg underline decoration-1 underline-offset-4 hover:text-pink"
        >
          View all covers
          <ArrowIcon className="size-4" />
        </Link>
        <p aria-live="polite" aria-atomic="true" className="sr-only">
          {notice}
        </p>
      </div>
    </div>
  )
}
