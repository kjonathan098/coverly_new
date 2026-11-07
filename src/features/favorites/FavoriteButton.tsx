import { useLocation } from 'react-router'
import { HeartIcon, actionButtonClasses, cx } from '../../ui'
import { startLogin, useSession } from '../auth/session'
import { artistList, displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { rememberPendingFavorite } from './pending'
import { useFavorites, useFavoriteToggle } from './useFavorites'

/**
 * The heart on a cover: filled when it's a favorite. Its own button, so it never plays or pauses
 * anything. A guest's click opens Google login and the favorite is saved once they're in.
 */
export function FavoriteButton({ song, className }: { song: CoverSong; className?: string }) {
  const { pathname, search } = useLocation()
  const session = useSession()
  const { user, ids } = useFavorites()
  const toggle = useFavoriteToggle(song.id)
  const favorite = Boolean(user && ids?.includes(song.id))
  const name = `${displayTitle(song.title)} by ${artistList(song.artists)}`

  const onClick = () => {
    if (!user) {
      rememberPendingFavorite(song.id)
      startLogin(pathname + search)
      return
    }
    toggle.mutate(!favorite)
  }

  return (
    <span className={cx('grid place-items-center', className)}>
      <button
        type="button"
        onClick={onClick}
        // Until the session is known, a click could do the wrong thing.
        disabled={session.isPending}
        aria-label={user ? `Favorite ${name}` : `Log in to favorite ${name}`}
        aria-pressed={user ? favorite : undefined}
        title={toggle.isError ? 'Couldn’t save. Try again.' : undefined}
        className={actionButtonClasses({ active: favorite })}
      >
        <HeartIcon filled={favorite} />
      </button>
      {/* A failed change puts the heart back; this says why. */}
      <span role="status" className="sr-only">
        {toggle.isError ? `Couldn’t update favorites for ${name}. Try again.` : ''}
      </span>
    </span>
  )
}
