import { Link } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { buttonClasses } from '../../ui'
import { LoginPrompt } from '../auth/LoginPrompt'
import { useSession } from '../auth/session'
import { SongRow } from '../discover/SongRow'
import { LibraryShell, LoadError } from '../library/LibraryShell'
import { NO_FILTERS } from '../songs/discover'
import { artistList, displayTitle, plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { MissingSongRow } from '../songs/MissingSongRow'
import type { CoverSong } from '../songs/types'
import { useFavorites, useFavoriteToggle } from './useFavorites'

/**
 * /library/favorites: the logged-in user's favorite covers, newest first, as Discover rows (play,
 * details, hearts and tags all work the same). Guests see a login prompt.
 */
export function FavoritesPage() {
  useDocumentTitle('Favorites · Coverly')
  const { user, ids, query } = useFavorites()
  const catalog = useCoverSongs()
  const session = useSession()

  return (
    <LibraryShell title="Favorites" meta={ids && plural(ids.length, 'cover')}>
      {session.isPending ? null : !user ? (
        <LoginPrompt title="Keep the covers you love.">
          Log in with Google to save covers with the heart in the player and find them here, on any
          device.
        </LoginPrompt>
      ) : query.isError || catalog.isError ? (
        <LoadError
          what="Your favorites"
          onRetry={() => {
            if (query.isError) void query.refetch()
            if (catalog.isError) void catalog.refetch()
          }}
        />
      ) : !ids || !catalog.data ? (
        <p aria-busy="true" className="type-label m-0 text-fg-soft">
          Loading your favorites…
        </p>
      ) : ids.length === 0 ? (
        <div className="grid justify-items-start gap-4">
          <p className="type-card m-0">No favorites yet.</p>
          <p className="m-0 max-w-[48ch] text-fg-soft">
            Play a cover and tap the heart beside it in the player to keep it here.
          </p>
          <Link to="/discover" className={buttonClasses({})}>
            Discover covers
          </Link>
        </div>
      ) : (
        <FavoriteList ids={ids} songs={catalog.data} />
      )}
    </LibraryShell>
  )
}

function FavoriteList({ ids, songs }: { ids: string[]; songs: CoverSong[] }) {
  const byId = new Map(songs.map((song) => [song.id, song]))
  return (
    // A size container, like Discover's results, so rows lay out by the room they have.
    <ol aria-label="Favorite covers" className="@container m-0 grid list-none gap-1 p-0">
      {[...ids].reverse().map((id) => {
        const song = byId.get(id)
        return song ? (
          <FavoriteRow key={id} song={song} />
        ) : (
          <MissingFavorite key={id} songId={id} />
        )
      })}
    </ol>
  )
}

/** A favorite, with Remove (the hearts live in the player, not on rows). */
function FavoriteRow({ song }: { song: CoverSong }) {
  const remove = useFavoriteToggle(song.id)
  return (
    <SongRow
      song={song}
      filters={NO_FILTERS}
      remove={{
        label: `Remove ${displayTitle(song.title)} by ${artistList(song.artists)} from Favorites`,
        onRemove: () => remove.mutate(false),
      }}
    />
  )
}

function MissingFavorite({ songId }: { songId: string }) {
  const remove = useFavoriteToggle(songId)
  return (
    <MissingSongRow
      onRemove={() => remove.mutate(false)}
      pending={remove.isPending}
      failed={remove.isError}
    />
  )
}
