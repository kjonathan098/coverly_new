import { Link, useLocation } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { Button, Container, Surface, buttonClasses } from '../../ui'
import { startLogin, useSession } from '../auth/session'
import { SongRow } from '../discover/SongRow'
import { NO_FILTERS } from '../songs/discover'
import { plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import type { CoverSong } from '../songs/types'
import { useFavorites, useFavoriteToggle } from './useFavorites'

/**
 * /favorites: the logged-in user's favorite covers, newest first, as Discover rows (play, details,
 * hearts and tags all work the same). Guests see a login prompt.
 */
export function FavoritesPage() {
  useDocumentTitle('Favorites · Coverly')
  const { pathname, search } = useLocation()
  const { user, ids, query } = useFavorites()
  const catalog = useCoverSongs()
  const session = useSession()

  return (
    <Surface
      as="section"
      tone="ink"
      grain
      aria-labelledby="favorites-title"
      className="min-h-[70vh] pb-16"
    >
      <Container className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-5">
        <h1 id="favorites-title" className="type-card m-0">
          Favorites
        </h1>
        {ids && <p className="type-meta m-0 text-fg-soft">{plural(ids.length, 'cover')}</p>}
      </Container>

      <Container className="mt-6">
        {session.isPending ? null : !user ? (
          <div className="grid justify-items-start gap-4">
            <p className="type-card m-0">Keep the covers you love.</p>
            <p className="m-0 max-w-[48ch] text-fg-soft">
              Log in with Google to save covers with the heart and find them here, on any device.
            </p>
            <Button onClick={() => startLogin(pathname + search)}>Log in with Google</Button>
          </div>
        ) : query.isError || catalog.isError ? (
          <div role="alert" className="grid justify-items-start gap-4">
            <p className="type-card m-0">Your favorites didn’t load.</p>
            <Button
              onClick={() => {
                if (query.isError) void query.refetch()
                if (catalog.isError) void catalog.refetch()
              }}
            >
              Try again
            </Button>
          </div>
        ) : !ids || !catalog.data ? (
          <p aria-busy="true" className="type-label m-0 text-fg-soft">
            Loading your favorites…
          </p>
        ) : ids.length === 0 ? (
          <div className="grid justify-items-start gap-4">
            <p className="type-card m-0">No favorites yet.</p>
            <p className="m-0 max-w-[48ch] text-fg-soft">
              Tap the heart on any cover to keep it here.
            </p>
            <Link to="/discover" className={buttonClasses({})}>
              Discover covers
            </Link>
          </div>
        ) : (
          <FavoriteList ids={ids} songs={catalog.data} />
        )}
      </Container>
    </Surface>
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
          <SongRow key={id} song={song} filters={NO_FILTERS} />
        ) : (
          <MissingFavorite key={id} songId={id} />
        )
      })}
    </ol>
  )
}

/** A favorite whose song has left the catalog: say so, and let it be removed. */
function MissingFavorite({ songId }: { songId: string }) {
  const remove = useFavoriteToggle(songId)
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-card px-3 py-3">
      <p className="m-0 text-label text-fg-soft">This cover is no longer in the catalog.</p>
      <Button
        variant="secondary"
        disabled={remove.isPending}
        onClick={() => remove.mutate(false)}
        className="min-h-9 px-3"
      >
        Remove
      </Button>
      {remove.isError && (
        <p role="alert" className="m-0 w-full text-meta text-pink">
          Couldn’t remove it. Try again.
        </p>
      )}
    </li>
  )
}
