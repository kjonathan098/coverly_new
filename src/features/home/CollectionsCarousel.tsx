import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import {
  ArrowIcon,
  Button,
  Container,
  PlayIcon,
  StopIcon,
  Surface,
  buttonClasses,
  cx,
} from '../../ui'
import type { Collection } from '../collections/collections'
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

const collectionPlayKey = (collection: Collection) => `collection:${collection.id}`

type CarouselProps = {
  collections: Collection[]
  playingKey: string | null
  onToggle: (key: string) => void
  /** Called when the visible slide changes, so a video on the old slide stops. */
  onSlideChange: () => void
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The homepage's featured collections, one at a time. Movement is always the reader's: buttons,
 * arrow keys, or a swipe (native scroll snapping, no gesture code). Nothing advances on its own.
 * Follows the WAI-ARIA carousel pattern; slides out of view are inert, so focus can't wander there.
 */
export function CollectionsCarousel({
  collections,
  playingKey,
  onToggle,
  onSlideChange,
}: CarouselProps) {
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
    onSlideChange()
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
              playing={playingKey === collectionPlayKey(collection)}
              onToggle={() => onToggle(collectionPlayKey(collection))}
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
  playing,
  onToggle,
}: {
  collection: Collection
  position: number
  count: number
  current: boolean
  tint: string
  playing: boolean
  onToggle: () => void
}) {
  // Artwork is the collection's own recordings: the first playable matches, in Discover's order.
  const art = (collection.playable.length ? collection.playable : collection.songs).slice(0, 3)
  const [front, ...back] = art
  const lead = collection.playable[0]

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${position + 1} of ${count}`}
      inert={!current}
      className="grid w-full shrink-0 snap-start [scroll-snap-stop:always] content-center gap-10 py-4 desktop:grid-cols-12 desktop:items-center desktop:gap-x-gutter"
    >
      <div className="group/art mx-auto w-[76%] max-w-[44rem] py-[10%] desktop:order-2 desktop:col-span-7 desktop:col-start-6 desktop:w-[80%]">
        <div className="relative">
          {back.map((song, i) => (
            <CoverArt
              key={song.id}
              song={song}
              tint={tint}
              className={cx(
                'absolute! inset-0 rounded-card shadow-[0_0_0_4px_var(--color-ink)] transition-[translate,rotate,opacity] duration-(--duration-slow) ease-snap',
                FAN[i],
                playing && 'opacity-0',
              )}
            />
          ))}
          {front && (
            <CoverArt
              song={front}
              tint={tint}
              size="hero"
              playing={playing && front.id === lead?.id}
              className="z-[3] rounded-card shadow-[0_0_0_6px_var(--color-paper)]"
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
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4">
          <Link
            to={discoverHref(collection.filters)}
            className={buttonClasses({ size: 'lg', className: 'max-tablet:w-full' })}
          >
            Explore the collection
            <ArrowIcon className="size-5" />
          </Link>
          {lead && (
            <Button
              variant="secondary"
              size="lg"
              icon={playing ? <StopIcon /> : <PlayIcon />}
              aria-pressed={playing}
              aria-label={`${playing ? 'Stop' : 'Play'} ${displayTitle(lead.title)} by ${artistList(lead.artists)}`}
              onClick={onToggle}
              className="max-tablet:w-full"
            >
              <span className="min-w-0 truncate">
                {playing ? 'Stop' : 'Play'} {displayTitle(lead.title)}
              </span>
            </Button>
          )}
        </div>
        {lead && (
          <p className="type-meta mt-3 text-fg-soft">
            {displayTitle(lead.title)}, covered by {artistList(lead.artists)}
          </p>
        )}
      </div>
    </div>
  )
}
