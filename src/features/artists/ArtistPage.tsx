import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ArrowIcon, Button, Container, ORIGINAL_COLOR, Surface, buttonClasses, cx } from '../../ui'
import { DISCOVER_PATH, discoverOne } from '../discover/useFilters'
import { displayName, plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { SongCard } from '../songs/SongCard'
import type { CoverSong } from '../songs/types'
import { artistProfile, type ArtistProfile } from './profile'

/**
 * /artists/:id: a public artist page, built from the cached catalog (no extra request). Everything
 * on it is real catalog data: the name, the roles, and the covers. No photo or biography, because
 * Coverly has none. An artist with both roles gets both sections.
 */
export function ArtistPage() {
  const { id = '' } = useParams()
  const catalog = useCoverSongs()
  const profile = useMemo(
    () => (catalog.data ? artistProfile(catalog.data, id) : null),
    [catalog.data, id],
  )
  useDocumentTitle(`${profile ? displayName(profile.name) : 'Artist'} · Coverly`)

  if (catalog.isError) {
    return (
      <Frame>
        <div role="alert" className="grid justify-items-start gap-4 pt-8">
          <p className="type-card m-0">The catalog didn’t load.</p>
          <Button onClick={() => void catalog.refetch()}>Try again</Button>
        </div>
      </Frame>
    )
  }
  if (!catalog.data) {
    return (
      <Frame>
        <p aria-busy="true" className="type-label m-0 pt-8 text-fg-soft">
          Loading the artist…
        </p>
      </Frame>
    )
  }
  if (!profile) {
    return (
      <Frame>
        <div className="grid justify-items-start gap-4 pt-8">
          <h1 className="type-section m-0">Artist not found</h1>
          <p className="m-0 max-w-[48ch] text-fg-soft">
            No cover in the catalog credits this artist.
          </p>
          <Link to={DISCOVER_PATH} className={buttonClasses({})}>
            Discover covers
          </Link>
        </div>
      </Frame>
    )
  }
  return <Profile profile={profile} />
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <Surface as="section" tone="ink" grain className="min-h-[60vh] pb-16">
      <Container>{children}</Container>
    </Surface>
  )
}

function Profile({ profile }: { profile: ArtistProfile }) {
  const name = displayName(profile.name)
  const { covers, coversOfTheirSongs } = profile
  return (
    <Surface
      as="article"
      tone="ink"
      grain
      aria-labelledby="artist-title"
      className="min-h-[60vh] pb-16"
    >
      <header className="relative overflow-hidden">
        {/* Print texture, fading in from the right: the header's one decoration. */}
        <span
          aria-hidden="true"
          className="halftone pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-25 [--halftone-color:var(--color-pink)] [--halftone-size:10px] mask-[linear-gradient(to_left,#000_10%,transparent)]"
        />
        <Container className="relative grid gap-5 pt-8 pb-8 tablet:pt-12 tablet:pb-10">
          <p className="type-label m-0 text-accent">Artist</p>
          <h1
            id="artist-title"
            className="type-display m-0 max-w-[14ch] [overflow-wrap:anywhere] text-fg"
          >
            {name}
          </h1>
          <ul aria-label="On Coverly" className="m-0 flex list-none flex-wrap gap-2 p-0">
            {covers.length > 0 && (
              <Role color="var(--color-turquoise)" role="Cover artist">
                {plural(covers.length, 'cover')} performed
              </Role>
            )}
            {coversOfTheirSongs.length > 0 && (
              <Role color={ORIGINAL_COLOR} role="Original artist">
                {plural(coversOfTheirSongs.length, 'cover')} of their songs
              </Role>
            )}
          </ul>
        </Container>
      </header>

      <Container className="grid grid-cols-[minmax(0,1fr)] gap-12">
        {covers.length > 0 && (
          <Section
            id="artist-covers"
            title={`Covers by ${name}`}
            songs={covers}
            showOriginal
            discover={{
              to: discoverOne('artist', profile.name),
              label: 'Their covers in Discover',
            }}
          />
        )}
        {coversOfTheirSongs.length > 0 && (
          <Section
            id="artist-songs"
            title={`Covers of songs by ${name}`}
            songs={coversOfTheirSongs}
            discover={{
              to: discoverOne('songBy', profile.name),
              label: 'Covers of their songs in Discover',
            }}
          />
        )}
      </Container>
    </Surface>
  )
}

/** A role, as a colored label with its count beside it. */
function Role({ color, role, children }: { color: string; role: string; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-pill bg-raised py-1 pr-3 pl-1">
      <span
        className="type-chip rounded-pill px-2.5 py-0.5 text-ink"
        style={{ backgroundColor: color }}
      >
        {role}
      </span>
      <span className="text-label text-fg-soft">{children}</span>
    </li>
  )
}

function Section({
  id,
  title,
  songs,
  showOriginal = false,
  discover,
}: {
  id: string
  title: string
  songs: CoverSong[]
  /** Show each cover's original artist (on their own covers; on covers of their songs it's them). */
  showOriginal?: boolean
  discover: { to: string; label: string }
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h2 id={id} className="type-card m-0 [overflow-wrap:anywhere]">
          {title}
        </h2>
        <Link
          to={discover.to}
          className="inline-flex min-h-11 items-center gap-1.5 text-label font-bold no-underline hover:text-pink"
        >
          {discover.label}
          <ArrowIcon className="size-4" />
        </Link>
      </div>
      {/* As on Home: a swipeable row on phones, a grid from tablets. One cover stays card-sized. */}
      <ul
        className={cx(
          'relative m-0 -mx-margin flex list-none snap-x snap-mandatory scroll-px-margin gap-gutter overflow-x-auto px-margin pb-2',
          'tablet:mx-0 tablet:grid tablet:grid-cols-2 tablet:overflow-visible tablet:px-0 desktop:grid-cols-4',
        )}
      >
        {songs.map((song) => (
          <li key={song.id} className="w-[78%] shrink-0 snap-start tablet:w-auto">
            <SongCard song={song} showOriginal={showOriginal} />
          </li>
        ))}
      </ul>
    </section>
  )
}
