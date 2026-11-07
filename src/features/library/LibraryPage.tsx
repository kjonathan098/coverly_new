import { Link } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { HeartIcon } from '../../ui'
import { LoginPrompt } from '../auth/LoginPrompt'
import { useSession } from '../auth/session'
import { useFavorites } from '../favorites/useFavorites'
import type { Playlist } from '../playlists/api'
import { NewPlaylistForm } from '../playlists/NewPlaylistForm'
import { usePlaylists } from '../playlists/usePlaylists'
import { CoverArt } from '../songs/CoverArt'
import { plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import type { CoverSong } from '../songs/types'
import { LibraryShell, LoadError } from './LibraryShell'

const tile = 'grid size-16 shrink-0 place-items-center overflow-hidden rounded-control bg-raised'
const entry =
  'flex min-h-20 items-center gap-4 rounded-card px-2 py-2 no-underline transition-colors duration-(--duration-fast) hover:bg-[color-mix(in_srgb,var(--surface-fg)_6%,transparent)]'

/** /library: Your Library. Favorites first, then the user's playlists, newest first. */
export function LibraryPage() {
  useDocumentTitle('Your Library · Coverly')
  const session = useSession()
  const { user, playlists, query } = usePlaylists()
  const { ids: favorites } = useFavorites()
  const catalog = useCoverSongs()
  const byId = new Map((catalog.data ?? []).map((song) => [song.id, song]))

  return (
    <LibraryShell title="Your Library" back={false}>
      {session.isPending ? null : !user ? (
        <LoginPrompt title="Your covers, in one place.">
          Log in with Google to keep favorites and make playlists. Browsing and listening stay open
          to everyone.
        </LoginPrompt>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
          <ul
            aria-label="Your Library"
            className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-1 p-0"
          >
            <li>
              <Link to="/library/favorites" className={entry}>
                <span className={`${tile} bg-pink text-ink *:size-7`}>
                  <HeartIcon filled />
                </span>
                <span className="min-w-0">
                  <span className="type-row block text-[1.1875rem]">Favorites</span>
                  <span className="type-meta block text-fg-soft">
                    {favorites ? plural(favorites.length, 'cover') : 'Covers you’ve hearted'}
                  </span>
                </span>
              </Link>
            </li>
            {query.isSuccess &&
              playlists?.map((playlist) => (
                <li key={playlist.id}>
                  <PlaylistEntry playlist={playlist} byId={byId} />
                </li>
              ))}
          </ul>

          {query.isError ? (
            <LoadError what="Your playlists" onRetry={() => void query.refetch()} />
          ) : query.isPending ? (
            <p aria-busy="true" className="type-label m-0 text-fg-soft">
              Loading your playlists…
            </p>
          ) : (
            playlists?.length === 0 && (
              <p className="m-0 max-w-[48ch] text-fg-soft">
                No playlists yet. Create one here, or use + in the player while a cover plays.
              </p>
            )
          )}

          <NewPlaylistForm className="max-w-md" />
        </div>
      )}
    </LibraryShell>
  )
}

function PlaylistEntry({ playlist, byId }: { playlist: Playlist; byId: Map<string, CoverSong> }) {
  // The art of its first song that's still in the catalog.
  const first = playlist.songIds.map((id) => byId.get(id)).find(Boolean)
  return (
    <Link to={`/library/playlists/${playlist.id}`} className={entry}>
      <span className={tile}>
        {first && <CoverArt song={first} className="size-full object-cover" />}
      </span>
      <span className="min-w-0">
        <span className="type-row block truncate text-[1.1875rem]">{playlist.name}</span>
        <span className="type-meta block text-fg-soft">
          Playlist · {plural(playlist.songIds.length, 'cover')}
        </span>
      </span>
    </Link>
  )
}
