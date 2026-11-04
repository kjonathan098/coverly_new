import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Section, SectionHeading, cx } from '../../ui'
import { discoverHref } from '../discover/useFilters'
import { CoverArt } from '../songs/CoverArt'
import { NO_FILTERS, type ArtistSummary } from '../songs/discover'
import { displayName, displayTitle, plural } from '../songs/format'

/** Cover artists with several covers in the catalog. Each one opens their covers in Discover. */
export function Artists({ artists }: { artists: ArtistSummary[] }) {
  if (artists.length === 0) return null
  return (
    <Section
      tone="paper"
      grain
      id="artists"
      aria-labelledby="artists-title"
      className="scroll-mt-14"
    >
      <SectionHeading
        id="artists-title"
        label="Cover artists"
        title="Artists who keep coming back"
        intro="They’ve covered more than one song in the catalog. Start with one and hear how they make other people’s songs their own."
      />
      <ul className="m-0 grid list-none gap-x-gutter gap-y-10 p-0 tablet:grid-cols-2 desktop:grid-cols-4">
        {artists.map((artist) => {
          const name = displayName(artist.name)
          return (
            <li key={artist.name} className="group relative">
              <div aria-hidden="true" className="relative mb-5 pb-6">
                {artist.songs.slice(0, 3).map((song, index) => (
                  <div
                    key={song.id}
                    // The first frame sits in flow and sets the height; the others stack behind it.
                    className={cx(
                      index === 0 ? 'relative' : 'absolute',
                      'w-[72%] transition-transform duration-(--duration-slow) ease-snap group-hover:[transform:translate(calc(var(--i)*10px),calc(var(--i)*-6px))]',
                    )}
                    style={
                      {
                        left: `${index * 14}%`,
                        top: `${index * 12}px`,
                        zIndex: 3 - index,
                        '--i': index,
                      } as CSSProperties
                    }
                  >
                    <CoverArt
                      song={song}
                      className="rounded-card shadow-[0_0_0_3px_var(--color-paper)]"
                    />
                  </div>
                ))}
              </div>
              <h3 className="type-card m-0 text-[clamp(1.5rem,2vw,1.9rem)]">
                <Link
                  to={discoverHref({ ...NO_FILTERS, artist: [artist.name] })}
                  className="no-underline decoration-pink decoration-[3px] underline-offset-[0.12em] after:absolute after:inset-0 group-hover:underline focus-visible:underline"
                >
                  {name}
                </Link>
              </h3>
              <p className="type-meta mt-1 font-semibold text-accent">
                {plural(artist.count, 'cover')}
              </p>
              <p className="mt-1 text-[0.9375rem] text-fg-soft">
                {artist.songs
                  .slice(0, 3)
                  .map((song) => displayTitle(song.title))
                  .join(', ')}
                {artist.count > 3 && ', and more'}
              </p>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
