import { Fragment } from 'react'
import { Link } from 'react-router'
import { cx } from '../../ui'
import { displayName } from '../songs/format'
import type { CoverArtist } from '../songs/types'

/**
 * Artist names as links to their profiles (/artists/:id, by id, so every name reaches the right
 * artist), joined as "A, B and C". The accessible name says the role they're listed under here.
 * Links, never buttons: they navigate and never start playback. Discover's artist filters are one
 * click further, from the profile.
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
        to={`/artists/${encodeURIComponent(artist.id)}`}
        aria-label={`${displayName(artist.name)}, ${what}`}
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
