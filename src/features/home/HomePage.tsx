import { useMemo, type ReactNode } from 'react'
import magazineCover from '../../assets/magazine-cover.jpg'
import { Link } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ArrowIcon, Button, Container, Surface, TagLink, buttonClasses } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { DISCOVER_PATH, discoverOne } from '../discover/useFilters'
import { CoverArt } from '../songs/CoverArt'
import { NO_FILTERS, countArtists, facetCounts } from '../songs/discover'
import { displayTitle, plural, tagLabel } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { SongCard } from '../songs/SongCard'
import { tintFor } from '../songs/tint'
import type { CoverSong } from '../songs/types'
import { CoverMachine } from './CoverMachine'
import { dailySelection, sameSongPairs, type SameSong } from './selection'
import { CoverlyPlaylists } from './CoverlyPlaylists'
import { PlayableCoverArt } from '../songs/PlayableCoverArt'

const PICKS = 8
const MOODS = 8
const PAIRS = 4

/** A section title with an optional link to everything behind it. */
function Row({
  id,
  title,
  intro,
  more,
  children,
}: {
  id: string
  title: string
  intro?: string
  more?: { to: string; label: string }
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id={id} className="type-card m-0">
            {title}
          </h2>
          {intro && <p className="m-0 mt-1 max-w-[56ch] text-fg-soft">{intro}</p>}
        </div>
        {more && (
          <Link
            to={more.to}
            className="inline-flex min-h-11 items-center gap-1.5 text-label font-bold no-underline hover:text-pink"
          >
            {more.label}
            <ArrowIcon className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/** A mood as a small tinted tile over one of its covers' thumbnails. Opens Discover on it. */
function MoodTile({ name, count, song }: { name: string; count: number; song?: CoverSong }) {
  const label = tagLabel(name)
  return (
    <Link
      to={discoverOne('mood', name)}
      aria-label={`Mood: ${label}, ${plural(count, 'cover')}`}
      className="group relative isolate block aspect-[16/10] overflow-hidden rounded-card no-underline shadow-[inset_0_0_0_1px_var(--surface-line)] transition-transform duration-(--duration-base) ease-snap hover:-translate-y-0.5"
    >
      {song && (
        <CoverArt
          song={song}
          tint={tintFor(name)}
          className="absolute! inset-0 -z-10 aspect-auto! size-full"
        />
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgb(21_18_29/0.92),rgb(21_18_29/0.15))]"
      />
      <span className="absolute inset-x-3 bottom-2.5 grid">
        <span className="type-row text-[1.1875rem] text-fg">{label}</span>
        <span className="type-meta text-fg-soft">{plural(count, 'cover')}</span>
      </span>
    </Link>
  )
}

/** One recording in a same-song pair: its artwork (the play button), its cover artist and labels. */
function Take({ song }: { song: CoverSong }) {
  const genre = song.genres[0]
  const style = song.styles[0]
  return (
    <div className="group grid min-w-0 content-start gap-2.5">
      <PlayableCoverArt song={song} artClassName="rounded-control" />
      <p className="m-0 min-w-0 text-label font-bold">
        <ArtistLinks artists={song.artists} role="artist" />
      </p>
      <ul aria-label="Labels" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {genre && (
          <li className="flex">
            <TagLink type="genre" label="Cover genre" to={discoverOne('genre', genre.name)}>
              {tagLabel(genre.name)}
            </TagLink>
          </li>
        )}
        {style && (
          <li className="flex">
            <TagLink
              type="performanceStyle"
              label="Performance style"
              to={discoverOne('style', style.name)}
            >
              {tagLabel(style.name)}
            </TagLink>
          </li>
        )}
      </ul>
    </div>
  )
}

/** Two voices on one song, side by side. */
function PairCard({ pair }: { pair: SameSong }) {
  const titleId = `same-${pair.covers[0].id}`
  return (
    <article
      aria-labelledby={titleId}
      className="rounded-panel bg-raised p-4 shadow-[inset_0_0_0_1px_var(--surface-line)] tablet:p-5"
    >
      <header className="mb-4">
        <h3 id={titleId} className="type-row m-0 text-[1.25rem]">
          {displayTitle(pair.title)}
        </h3>
        <p className="type-meta m-0 mt-0.5 text-fg-soft">
          <span className="font-semibold">Original</span>{' '}
          <ArtistLinks artists={pair.originalArtists} role="songBy" />
        </p>
      </header>
      <div className="relative grid grid-cols-[repeat(2,minmax(0,1fr))] gap-4">
        {/* A thin pink rule between the two takes: the page's one flourish here. */}
        <span
          aria-hidden="true"
          className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-[linear-gradient(transparent,var(--color-pink),transparent)]"
        />
        <Take song={pair.covers[0]} />
        <Take song={pair.covers[1]} />
      </div>
    </article>
  )
}

/**
 * Home: functional, music-first discovery with a little personality. Explore a daily selection
 * of covers, browse by mood, hear the same song in different voices, and a way into the Magazine.
 * Everything comes from the one cached catalog request (GET /api/songs/all-songs, which isn't
 * paginated) and plays in the app shell's player. Deeper search and filtering live in Discover.
 */
export function HomePage() {
  useDocumentTitle('Coverly · Every song has another side')
  const query = useCoverSongs()
  const songs = useMemo(() => query.data ?? [], [query.data])
  const today = useMemo(() => new Date(), [])

  const picks = useMemo(() => dailySelection(songs, PICKS, today), [songs, today])
  // The machine starts on the next cover in today's order, so it doesn't repeat a card below.
  const machineSong = useMemo(
    () => dailySelection(songs, PICKS + 1, today)[PICKS] ?? picks[0],
    [songs, today, picks],
  )
  const pairs = useMemo(() => sameSongPairs(songs).slice(0, PAIRS), [songs])
  const moods = useMemo(() => {
    const top = facetCounts(songs, NO_FILTERS, 'mood').slice(0, MOODS)
    // Each tile shows a different cover that carries the mood, so no thumbnail repeats.
    const used = new Set<string>()
    return top.map(({ name, count }) => {
      const song = songs.find(
        (s) => s.video && !used.has(s.id) && s.moods.some((m) => m.name === name),
      )
      if (song) used.add(song.id)
      return { name, count, song }
    })
  }, [songs])

  return (
    <Surface tone="ink" grain className="pb-16">
      {/* Welcome: short, with a faint halftone field as its only ornament. */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-25 [--halftone-color:var(--color-pink)] [--halftone-size:9px] mask-[radial-gradient(ellipse_at_top_right,#000_10%,transparent_65%)]"
        />
        <Container className="relative grid items-center gap-10 pt-8 pb-8 desktop:grid-cols-[minmax(0,1fr)_minmax(0,40rem)] desktop:gap-14 desktop:py-10">
          <div className="grid justify-items-start gap-3">
            <h1 className="type-label m-0 text-accent">Coverly</h1>
            <p className="type-headline m-0 max-w-[18ch]">Every song has another side.</p>
            <p className="type-lead m-0 max-w-[52ch] text-fg-soft">
              {query.isSuccess && songs.length > 0
                ? `Listen to ${plural(songs.length, 'cover')} by ${plural(countArtists(songs), 'cover artist')}, find them by mood, and hear the same song in different voices.`
                : 'Listen to cover songs, find them by mood, and hear the same song in different voices.'}
            </p>
            <Link to={DISCOVER_PATH} className={buttonClasses({ className: 'mt-2' })}>
              Discover covers
              <ArrowIcon className="size-4" />
            </Link>
          </div>
          {!query.isError && !(query.isSuccess && songs.length === 0) && (
            <CoverMachine songs={songs} initial={machineSong} />
          )}
        </Container>
      </div>

      <Container className="grid grid-cols-[minmax(0,1fr)] gap-14">
        {query.isError ? (
          <div role="alert" className="grid justify-items-start gap-3">
            <p className="type-card m-0">The catalog didn’t load.</p>
            <p className="m-0 text-fg-soft">
              Coverly couldn’t reach its music library. Check that the backend is running, then try
              again.
            </p>
            <Button onClick={() => query.refetch()}>Try again</Button>
          </div>
        ) : query.isPending ? (
          <p aria-busy="true" className="type-label m-0 text-fg-soft">
            Loading covers…
          </p>
        ) : songs.length === 0 ? (
          <p className="m-0 text-fg-soft">No covers in the catalog yet.</p>
        ) : (
          <>
            <Row
              id="explore-title"
              title="Explore covers"
              intro="A different selection from the catalog every day."
              more={{ to: DISCOVER_PATH, label: `See all ${songs.length}` }}
            >
              {/* relative: keeps the cards' visually hidden text inside the scroller on phones. */}
              <ul className="relative m-0 -mx-margin flex list-none snap-x snap-mandatory scroll-px-margin gap-gutter overflow-x-auto px-margin pb-2 tablet:mx-0 tablet:grid tablet:grid-cols-2 tablet:overflow-visible tablet:px-0 desktop:grid-cols-4">
                {picks.map((song) => (
                  <li key={song.id} className="w-[78%] shrink-0 snap-start tablet:w-auto">
                    <SongCard song={song} showOriginal />
                  </li>
                ))}
              </ul>
            </Row>

            <CoverlyPlaylists songs={songs} />

            {moods.length > 0 && (
              <Row
                id="moods-title"
                title="Discover by mood"
                more={{ to: DISCOVER_PATH, label: 'All moods' }}
              >
                <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 tablet:grid-cols-4 tablet:gap-4">
                  {moods.map((mood) => (
                    <li key={mood.name}>
                      <MoodTile {...mood} />
                    </li>
                  ))}
                </ul>
              </Row>
            )}

            {pairs.length > 0 && (
              <Row
                id="same-song-title"
                title="Same song, different voices"
                intro="Songs covered more than once in the catalog, two takes side by side."
              >
                <ul className="m-0 grid list-none gap-4 p-0 desktop:grid-cols-2">
                  {pairs.map((pair) => (
                    <li key={pair.key}>
                      <PairCard pair={pair} />
                    </li>
                  ))}
                </ul>
              </Row>
            )}
          </>
        )}

        <section
          aria-labelledby="magazine-title"
          className="group relative overflow-hidden rounded-panel bg-raised p-6 shadow-[inset_0_0_0_1px_var(--surface-line)] tablet:p-8 tablet:pr-80 desktop:pr-[28rem]"
        >
          {/* The Magazine's cover, tilted and rising from the card's bottom edge (clipped by it).
              Decorative: the card's text says what it is. Hidden on phones, where there's no room. */}
          <img
            src={magazineCover}
            alt=""
            width={560}
            height={699}
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute right-5 -bottom-20 hidden w-60 rotate-[-12deg] rounded-sm shadow-[0_30px_60px_-12px_rgb(0_0_0/0.8),-8px_8px_0_0_var(--color-pink)] transition-transform duration-(--duration-slow) ease-snap group-hover:-translate-y-3 group-hover:rotate-[-9deg] tablet:block desktop:right-12 desktop:-bottom-45 desktop:w-[22rem]"
          />
          {/* Three offset stripes in the version colours: a quiet nod to the Magazine's look. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 -right-6 grid gap-2 opacity-70"
          >
            <span className="block h-2 w-44 rotate-[-8deg] rounded-pill bg-pink" />
            <span className="ml-4 block h-2 w-44 rotate-[-8deg] rounded-pill bg-turquoise" />
            <span className="ml-8 block h-2 w-44 rotate-[-8deg] rounded-pill bg-blue" />
          </span>
          <p className="type-label m-0 text-accent">Magazine</p>
          <h2 id="magazine-title" className="type-card m-0 mt-2 max-w-[24ch]">
            Beyond the covers.
          </h2>
          <p className="m-0 mt-2 max-w-[52ch] text-fg-soft">
            Discover music stories, vote for your favorites, test your music memory, and find
            unexpected performances.
          </p>
          <Link
            to="/magazine"
            className={buttonClasses({ variant: 'secondary', className: 'mt-5' })}
          >
            Open the Magazine
            <ArrowIcon className="size-4" />
          </Link>
        </section>
      </Container>
    </Surface>
  )
}
