import { Fragment } from 'react'
import { Link } from 'react-router'
import { cx } from '../../ui'
import { displayName } from '../songs/format'
import type { CoverArtist } from '../songs/types'
import { discoverOne } from './useFilters'

/**
 * Artist names as links, each opening a fresh Discover for that artist in the role it's listed
 * under: cover artist (artist=) or original artist (songBy=). Joined as "A, B and C".
 */
export function ArtistLinks({
  artists,
  role,
  className,
}: {
  artists: CoverArtist[]
  role: 'artist' | 'songBy'
  className?: string
}) {
  const what = role === 'artist' ? 'cover artist' : 'original artist'
  return artists.map((artist, i) => (
    <Fragment key={artist.id}>
      {i > 0 && (i === artists.length - 1 ? ' and ' : ', ')}
      <Link
        to={discoverOne(role, artist.name)}
        aria-label={`Show covers with ${what} ${displayName(artist.name)}`}
        className={cx(
          'no-underline decoration-2 underline-offset-[0.2em] hover:text-fg hover:underline focus-visible:underline',
          className,
        )}
      >
        {displayName(artist.name)}
      </Link>
    </Fragment>
  ))
}
