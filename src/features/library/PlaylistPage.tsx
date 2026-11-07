import { useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { Button, buttonClasses, cx } from '../../ui'
import { LoginPrompt } from '../auth/LoginPrompt'
import { useSession } from '../auth/session'
import { SongRow } from '../discover/SongRow'
import { MAX_PLAYLIST_NAME, playlistErrorMessage, type Playlist } from '../playlists/api'
import { textInput } from '../playlists/NewPlaylistForm'
import {
  useDeletePlaylist,
  usePlaylists,
  usePlaylistSong,
  useRenamePlaylist,
} from '../playlists/usePlaylists'
import { NO_FILTERS } from '../songs/discover'
import { artistList, displayTitle, plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { MissingSongRow } from '../songs/MissingSongRow'
import type { CoverSong } from '../songs/types'
import { LibraryShell, LoadError } from './LibraryShell'

/** /library/playlists/:id: one of the user's playlists, its songs in the order they were added. */
export function PlaylistPage() {
  const { id = '' } = useParams()
  const session = useSession()
  const { user, playlists, query } = usePlaylists()
  const catalog = useCoverSongs()
  const playlist = playlists?.find((p) => p.id === id)
  useDocumentTitle(`${playlist?.name ?? 'Playlist'} · Coverly`)

  if (session.isPending) return <LibraryShell title="Playlist">{null}</LibraryShell>
  if (!user) {
    return (
      <LibraryShell title="Playlist">
        <LoginPrompt title="Log in to see your playlists.">
          Playlists are private: only you can see yours, once you’re logged in.
        </LoginPrompt>
      </LibraryShell>
    )
  }
  if (query.isError || catalog.isError) {
    return (
      <LibraryShell title="Playlist">
        <LoadError
          what="This playlist"
          onRetry={() => {
            if (query.isError) void query.refetch()
            if (catalog.isError) void catalog.refetch()
          }}
        />
      </LibraryShell>
    )
  }
  if (!playlists || !catalog.data) {
    return (
      <LibraryShell title="Playlist">
        <p aria-busy="true" className="type-label m-0 text-fg-soft">
          Loading the playlist…
        </p>
      </LibraryShell>
    )
  }
  if (!playlist) {
    return (
      <LibraryShell title="Playlist not found">
        <div className="grid justify-items-start gap-4">
          <p className="m-0 max-w-[48ch] text-fg-soft">
            It may have been deleted. Your playlists are all in Your Library.
          </p>
          <Link to="/library" className={buttonClasses({})}>
            Go to Your Library
          </Link>
        </div>
      </LibraryShell>
    )
  }
  return <PlaylistView playlist={playlist} songs={catalog.data} />
}

function PlaylistView({ playlist, songs }: { playlist: Playlist; songs: CoverSong[] }) {
  const byId = new Map(songs.map((song) => [song.id, song]))
  return (
    <LibraryShell
      title={playlist.name}
      meta={`Playlist · ${plural(playlist.songIds.length, 'cover')}`}
      actions={<PlaylistActions playlist={playlist} />}
    >
      {playlist.songIds.length === 0 ? (
        <p className="m-0 max-w-[48ch] text-fg-soft">
          No covers here yet. Play a cover and use + beside it in the player to add it here.
        </p>
      ) : (
        <ol aria-label="Playlist covers" className="@container m-0 grid list-none gap-1 p-0">
          {playlist.songIds.map((songId) => (
            <PlaylistSong
              key={songId}
              playlist={playlist}
              songId={songId}
              song={byId.get(songId)}
            />
          ))}
        </ol>
      )}
    </LibraryShell>
  )
}

function PlaylistSong({
  playlist,
  songId,
  song,
}: {
  playlist: Playlist
  songId: string
  song: CoverSong | undefined
}) {
  const remove = usePlaylistSong(playlist.id, songId)
  if (!song) {
    return (
      <MissingSongRow
        onRemove={() => remove.mutate(false)}
        pending={remove.isPending}
        failed={remove.isError}
      />
    )
  }
  return (
    <SongRow
      song={song}
      filters={NO_FILTERS}
      remove={{
        label: `Remove ${displayTitle(song.title)} by ${artistList(song.artists)} from ${playlist.name}`,
        onRemove: () => remove.mutate(false),
      }}
    />
  )
}

/** Rename (inline) and delete (with a confirmation step). */
function PlaylistActions({ playlist }: { playlist: Playlist }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'idle' | 'rename' | 'delete'>('idle')
  const [name, setName] = useState(playlist.name)
  const rename = useRenamePlaylist(playlist.id)
  const remove = useDeletePlaylist(playlist.id)
  const inputId = useId()

  if (mode === 'rename') {
    return (
      <form
        className="mt-2 grid max-w-md gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          rename.mutate(trimmed, { onSuccess: () => setMode('idle') })
        }}
      >
        <label htmlFor={inputId} className="type-meta font-semibold text-fg-soft">
          Playlist name
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={inputId}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setMode('idle')}
            maxLength={MAX_PLAYLIST_NAME}
            autoComplete="off"
            className={cx(textInput, 'min-w-0 flex-1 basis-48')}
          />
          <Button type="submit" disabled={rename.isPending || !name.trim()}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => setMode('idle')}>
            Cancel
          </Button>
        </div>
        {rename.isError && (
          <p role="alert" className="m-0 text-meta text-pink">
            {playlistErrorMessage(rename.error)}
          </p>
        )}
      </form>
    )
  }

  if (mode === 'delete') {
    return (
      <div
        role="group"
        aria-label="Delete playlist"
        className="mt-2 grid justify-items-start gap-2"
      >
        <p className="m-0 text-label">
          Delete “{playlist.name}”? Its covers stay in the catalog and in your Favorites.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            autoFocus
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, { onSuccess: () => navigate('/library', { replace: true }) })
            }
          >
            Delete playlist
          </Button>
          <Button variant="secondary" onClick={() => setMode('idle')}>
            Cancel
          </Button>
        </div>
        {remove.isError && (
          <p role="alert" className="m-0 text-meta text-pink">
            {playlistErrorMessage(remove.error)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button
        variant="secondary"
        className="min-h-9 px-3"
        onClick={() => {
          setName(playlist.name)
          setMode('rename')
        }}
      >
        Rename
      </Button>
      <Button variant="secondary" className="min-h-9 px-3" onClick={() => setMode('delete')}>
        Delete
      </Button>
    </div>
  )
}
