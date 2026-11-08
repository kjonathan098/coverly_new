import { useEffect, useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { ArrowIcon, Button, Container, Dissolve, Section, Surface, buttonClasses } from '../../ui'
import { resolveCollections } from '../collections/collections'
import { DISCOVER_PATH, discoverHref } from '../discover/useFilters'
import {
  NO_FILTERS,
  countArtists,
  facetCounts,
  recurringArtists,
  songsWith,
} from '../songs/discover'
import { plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { Artists } from './Artists'
import { BangerHero } from './BangerHero'
import { BangerOfTheWeek } from './BangerOfTheWeek'
import { CollectionsCarousel } from './CollectionsCarousel'
import { MoodIndex } from './MoodIndex'
import { Shelf } from './Shelf'

const SHELF_STYLE = 'piano-driven'

/** The ink band the carousel would occupy, for loading, failure and an empty catalog. */
function HeroState({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  return (
    <Surface as="section" tone="ink" grain aria-busy={busy} className="py-24 tablet:py-32">
      <Container size="full" className="grid justify-items-start gap-5">
        {children}
      </Container>
    </Surface>
  )
}

/**
 * /magazine: Coverly's expressive editorial page (the original homepage design, preserved as-is).
 * Collections, moods, a shelf and artists; covers play in the shell's player.
 */
export function MagazinePage() {
  useDocumentTitle('Magazine · Coverly')
  const query = useCoverSongs()
  const songs = useMemo(() => query.data ?? [], [query.data])
  const collections = useMemo(() => resolveCollections(songs), [songs])
  const moods = useMemo(() => facetCounts(songs, NO_FILTERS, 'mood').slice(0, 9), [songs])
  const artists = useMemo(() => recurringArtists(songs), [songs])
  const shelf = useMemo(() => songsWith(songs, 'style', SHELF_STYLE), [songs])

  // Sections appear once the catalog arrives, so a cold link to /#moods scrolls when they exist.
  const { hash } = useLocation()
  useEffect(() => {
    if (query.isSuccess && hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    // Only when the data arrives; later hash changes are handled by ScrollRestoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess])

  return (
    <>
      <h1 className="sr-only">Coverly Magazine</h1>

      <BangerHero />

      {/* The cover's "Open this issue" target: whatever comes first in the issue, in every state.
          scroll-mt clears the sticky site header (two rows on phones). */}
      <div id="magazine-content" className="scroll-mt-24 tablet:scroll-mt-14">
        <BangerOfTheWeek songs={songs} />
        {query.isError ? (
          <HeroState>
            <div role="alert" className="grid justify-items-start gap-4">
              <p className="type-headline m-0">The catalog didn’t load.</p>
              <p className="type-lead max-w-[40ch] text-fg-soft">
                Coverly couldn’t reach its music library. Check that the Coverly backend is running,
                then try again.
              </p>
              <Button onClick={() => query.refetch()}>Try again</Button>
            </div>
          </HeroState>
        ) : query.isPending ? (
          <HeroState busy>
            <p className="type-headline m-0 text-fg-soft">Gathering collections…</p>
          </HeroState>
        ) : collections.length > 0 ? (
          <CollectionsCarousel collections={collections} />
        ) : (
          <HeroState>
            <p className="type-display m-0">Every song has another side</p>
            {songs.length > 0 && (
              <Link to={DISCOVER_PATH} className={buttonClasses({ size: 'lg' })}>
                Browse all {plural(songs.length, 'cover')}
              </Link>
            )}
          </HeroState>
        )}

        {songs.length > 0 && (
          <>
            <Dissolve to="paper" />
            <MoodIndex moods={moods} />
            <Dissolve to="ink" />
            <Shelf
              id="piano"
              tone="ink"
              label="How it’s played"
              title="Piano-driven"
              intro="Covers built around the piano. Every one here carries the piano-driven label."
              songs={shelf}
              filters={{ ...NO_FILTERS, style: [SHELF_STYLE] }}
            />
            <Dissolve to="paper" />
            <Artists artists={artists} />
            <Dissolve to="ink" />
            <Section tone="ink" grain aria-labelledby="browse-title" className="pb-16">
              <div className="grid gap-6 desktop:grid-cols-12 desktop:items-end desktop:gap-x-gutter">
                <div className="desktop:col-span-8">
                  <p className="type-label text-accent">The whole catalog</p>
                  <h2 id="browse-title" className="type-section m-0 mt-3">
                    {plural(songs.length, 'cover')} by {plural(countArtists(songs), 'cover artist')}
                  </h2>
                  <p className="type-lead mt-4 max-w-[48ch] text-fg-soft">
                    Search every cover, or narrow them by mood, genre, subgenre and how they’re
                    played.
                  </p>
                </div>
                <div className="desktop:col-span-4 desktop:justify-self-end">
                  <Link to={discoverHref(NO_FILTERS)} className={buttonClasses({ size: 'lg' })}>
                    Open Discover
                    <ArrowIcon className="size-5" />
                  </Link>
                </div>
              </div>
            </Section>
          </>
        )}
      </div>
    </>
  )
}
