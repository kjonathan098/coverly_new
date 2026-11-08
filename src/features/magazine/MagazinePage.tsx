import { useEffect, useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { Button, Container, Dissolve, Surface, buttonClasses } from '../../ui'
import { resolveCollections } from '../collections/collections'
import { DISCOVER_PATH } from '../discover/useFilters'
import { recurringArtists } from '../songs/discover'
import { plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { OneWordFiveSongs } from '../wordgame/OneWordFiveSongs'
import { Artists } from './Artists'
import { BangerHero } from './BangerHero'
import { BangerOfTheWeek } from './BangerOfTheWeek'
import { CollectionsCarousel } from './CollectionsCarousel'
import { NokiaLoveSong } from './NokiaLoveSong'
import { WhoCoveredItBetter } from './WhoCoveredItBetter'

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
 * /magazine: Coverly's expressive editorial page. The cover, then the issue: Banger of the Week,
 * Who Covered It Better?, One Word, Five Songs and the Nokia love song, followed by the featured
 * collections and the artists who keep coming back. Covers play in the shell's player.
 */
export function MagazinePage() {
  useDocumentTitle('Magazine · Coverly')
  const query = useCoverSongs()
  const songs = useMemo(() => query.data ?? [], [query.data])
  const collections = useMemo(() => resolveCollections(songs), [songs])
  const artists = useMemo(() => recurringArtists(songs), [songs])

  // Sections appear once the catalog arrives, so a cold link to a section's anchor scrolls when it exists.
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
        <WhoCoveredItBetter songs={songs} />
        <OneWordFiveSongs />
        <NokiaLoveSong songs={songs} />
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

        {artists.length > 0 && (
          <>
            <Dissolve to="paper" />
            <Artists artists={artists} />
            <Dissolve to="ink" />
          </>
        )}
      </div>
    </>
  )
}
