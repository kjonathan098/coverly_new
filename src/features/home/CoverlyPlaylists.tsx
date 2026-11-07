import { Link } from 'react-router'
import { CoverlyBadge } from '../playlists/CoverlyBadge'
import { useOfficialPlaylists } from '../playlists/usePlaylists'
import { CoverArt } from '../songs/CoverArt'
import { plural } from '../songs/format'
import type { CoverSong } from '../songs/types'

const MAX = 4

/**
 * "Playlists by Coverly": Coverly's own playlists, newest first. Rendered only when there are some
 * (and once they've loaded): no placeholders. Each opens its public page.
 */
export function CoverlyPlaylists({ songs }: { songs: readonly CoverSong[] }) {
  const { playlists } = useOfficialPlaylists()
  if (!playlists || playlists.length === 0) return null
  const byId = new Map(songs.map((song) => [song.id, song]))

  return (
    <section aria-labelledby="coverly-playlists-title">
      <div className="mb-5">
        <h2 id="coverly-playlists-title" className="type-card m-0">
          Playlists by Coverly
        </h2>
        <p className="m-0 mt-1 max-w-[56ch] text-fg-soft">Covers we’ve put together for you.</p>
      </div>
      <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-3 p-0 tablet:grid-cols-2 desktop:grid-cols-4">
        {playlists.slice(0, MAX).map((playlist) => {
          // The art of its first cover that's still in the catalog.
          const first = playlist.songIds.map((id) => byId.get(id)).find(Boolean)
          return (
            <li key={playlist.id}>
              <Link
                to={`/playlists/${playlist.id}`}
                className="flex items-center gap-3 rounded-card bg-raised p-2 no-underline transition-colors duration-(--duration-fast) hover:bg-[color-mix(in_srgb,var(--surface-fg)_10%,var(--surface-raised))]"
              >
                <span className="w-24 shrink-0 overflow-hidden rounded-control bg-ink">
                  {first && <CoverArt song={first} />}
                </span>
                <span className="grid min-w-0 gap-1">
                  <CoverlyBadge />
                  <span className="type-row truncate text-[1.0625rem]">{playlist.name}</span>
                  <span className="type-meta truncate text-fg-soft">
                    {playlist.description || plural(playlist.songIds.length, 'cover')}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
