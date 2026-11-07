import { useLocation } from 'react-router'
import { PlusIcon, actionButtonClasses, cx } from '../../ui'
import { startLogin, useSession } from '../auth/session'
import { artistList, displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { openPlaylistPicker } from './pickerStore'

/**
 * "+": opens the shared add-to-playlist modal for this song. A guest gets the Google login first and
 * then chooses (no automatic action). Its own button: it never plays or pauses anything.
 */
export function AddToPlaylistButton({ song, className }: { song: CoverSong; className?: string }) {
  const { pathname, search } = useLocation()
  const session = useSession()
  const user = session.data
  const name = `${displayTitle(song.title)} by ${artistList(song.artists)}`
  return (
    <button
      type="button"
      // Until the session is known, a click could do the wrong thing.
      disabled={session.isPending}
      aria-label={user ? `Add ${name} to a playlist` : `Log in to add ${name} to a playlist`}
      aria-haspopup={user ? 'dialog' : undefined}
      onClick={(event) =>
        user ? openPlaylistPicker(song, event.currentTarget) : startLogin(pathname + search)
      }
      className={cx(actionButtonClasses(), className)}
    >
      <PlusIcon />
    </button>
  )
}
