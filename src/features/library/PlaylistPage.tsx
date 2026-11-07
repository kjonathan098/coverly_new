import { useId, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { Button, buttonClasses, cx } from '../../ui'
import { LoginPrompt } from '../auth/LoginPrompt'
import { useSession } from '../auth/session'
import { SongRow } from '../discover/SongRow'
import {
  MAX_PLAYLIST_DESCRIPTION,
  MAX_PLAYLIST_NAME,
  playlistErrorMessage,
  type Playlist,
  type PlaylistKind,
} from '../playlists/api'
import { CoverlyBadge } from '../playlists/CoverlyBadge'
import { textInput } from '../playlists/NewPlaylistForm'
import {
  useDeletePlaylist,
  useOfficialPlaylists,
  usePlaylists,
  usePlaylistSong,
  usePublishPlaylist,
  useUpdatePlaylist,
} from '../playlists/usePlaylists'
import { NO_FILTERS } from '../songs/discover'
import { artistList, displayTitle, plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { MissingSongRow } from '../songs/MissingSongRow'
import type { CoverSong } from '../songs/types'
import { LibraryShell, LoadError } from './LibraryShell'

const HOME = { to: '/', label: 'Home' }

/** /library/playlists/:id: one of the user's own playlists, its songs in the order they were added. */
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
  return (
    <Loaded
      query={query}
      catalog={catalog}
      playlist={playlist}
      notFound={
        <NotFound text="It may have been deleted. Your playlists are all in Your Library.">
          <Link to="/library" className={buttonClasses({})}>
            Go to Your Library
          </Link>
        </NotFound>
      }
    >
      {(found, songs) => (
        <PlaylistView playlist={found} songs={songs} kind="mine" canEdit isAdmin={user.isAdmin} />
      )}
    </Loaded>
  )
}

/**
 * /playlists/:id: a Coverly playlist. Public: anyone can open and play it, guests included. Admins
 * also get its editing controls (the backend checks every change again).
 */
export function OfficialPlaylistPage() {
  const { id = '' } = useParams()
  const { data: user } = useSession()
  const { playlists, query } = useOfficialPlaylists()
  const catalog = useCoverSongs()
  const playlist = playlists?.find((p) => p.id === id)
  useDocumentTitle(`${playlist?.name ?? 'Coverly playlist'} · Coverly`)
  const admin = Boolean(user?.isAdmin)

  return (
    <Loaded
      query={query}
      catalog={catalog}
      playlist={playlist}
      back={HOME}
      notFound={
        <NotFound text="Coverly may have taken it down.">
          <Link to="/" className={buttonClasses({})}>
            Go to Home
          </Link>
        </NotFound>
      }
    >
      {(found, songs) => (
        <PlaylistView
          playlist={found}
          songs={songs}
          kind="official"
          canEdit={admin}
          isAdmin={admin}
        />
      )}
    </Loaded>
  )
}

/** The loading, error and not-found states both pages share; then the playlist itself. */
function Loaded({
  query,
  catalog,
  playlist,
  back,
  notFound,
  children,
}: {
  query: { isError: boolean; data?: unknown; refetch: () => unknown }
  catalog: ReturnType<typeof useCoverSongs>
  playlist: Playlist | undefined
  back?: { to: string; label: string }
  notFound: ReactNode
  children: (playlist: Playlist, songs: CoverSong[]) => ReactNode
}) {
  if (query.isError || catalog.isError) {
    return (
      <LibraryShell title="Playlist" back={back}>
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
  if (!query.data || !catalog.data) {
    return (
      <LibraryShell title="Playlist" back={back}>
        <p aria-busy="true" className="type-label m-0 text-fg-soft">
          Loading the playlist…
        </p>
      </LibraryShell>
    )
  }
  if (!playlist) {
    return (
      <LibraryShell title="Playlist not found" back={back}>
        {notFound}
      </LibraryShell>
    )
  }
  return children(playlist, catalog.data)
}

function NotFound({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-4">
      <p className="m-0 max-w-[48ch] text-fg-soft">{text}</p>
      {children}
    </div>
  )
}

function PlaylistView({
  playlist,
  songs,
  kind,
  canEdit,
  isAdmin,
}: {
  playlist: Playlist
  songs: CoverSong[]
  kind: PlaylistKind
  canEdit: boolean
  isAdmin: boolean
}) {
  const byId = new Map(songs.map((song) => [song.id, song]))
  const official = kind === 'official'
  const count = plural(playlist.songIds.length, 'cover')
  return (
    <LibraryShell
      title={playlist.name}
      back={official ? HOME : undefined}
      meta={official ? `Coverly playlist · ${count}` : `Private playlist · ${count}`}
      actions={
        <>
          {official && (
            <div className="grid gap-2">
              <CoverlyBadge />
              {playlist.description && (
                <p className="m-0 max-w-[60ch] text-fg-soft">{playlist.description}</p>
              )}
            </div>
          )}
          {canEdit && <PlaylistActions playlist={playlist} kind={kind} isAdmin={isAdmin} />}
        </>
      }
    >
      {playlist.songIds.length === 0 ? (
        <p className="m-0 max-w-[48ch] text-fg-soft">
          No covers here yet.
          {canEdit && ' Play a cover and use + beside it in the player to add it here.'}
        </p>
      ) : (
        <ol aria-label="Playlist covers" className="@container m-0 grid list-none gap-1 p-0">
          {playlist.songIds.map((songId) => (
            <PlaylistSong
              key={songId}
              playlist={playlist}
              songId={songId}
              song={byId.get(songId)}
              kind={kind}
              canEdit={canEdit}
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
  kind,
  canEdit,
}: {
  playlist: Playlist
  songId: string
  song: CoverSong | undefined
  kind: PlaylistKind
  canEdit: boolean
}) {
  const remove = usePlaylistSong(playlist.id, songId, kind)
  if (!song) {
    // Only an editor can tidy it up; for everyone else a missing cover simply isn't listed.
    if (!canEdit) return null
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
      remove={
        canEdit
          ? {
              label: `Remove ${displayTitle(song.title)} by ${artistList(song.artists)} from ${playlist.name}`,
              onRemove: () => remove.mutate(false),
            }
          : undefined
      }
    />
  )
}

/**
 * Edit (inline), delete (with a confirmation step), and for admins publish or unpublish. A Coverly
 * playlist's edit form includes its description.
 */
function PlaylistActions({
  playlist,
  kind,
  isAdmin,
}: {
  playlist: Playlist
  kind: PlaylistKind
  isAdmin: boolean
}) {
  const navigate = useNavigate()
  const official = kind === 'official'
  const [mode, setMode] = useState<'idle' | 'edit' | 'delete' | 'publish'>('idle')
  const [name, setName] = useState(playlist.name)
  const [description, setDescription] = useState(playlist.description)
  const update = useUpdatePlaylist(playlist.id, kind)
  const remove = useDeletePlaylist(playlist.id, kind)
  const move = usePublishPlaylist(playlist.id, !official)
  const nameId = useId()
  const descriptionId = useId()

  if (mode === 'edit') {
    return (
      <form
        className="mt-2 grid max-w-md gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          const changes = official
            ? { name: trimmed, description: description.trim() }
            : { name: trimmed }
          update.mutate(changes, { onSuccess: () => setMode('idle') })
        }}
        onKeyDown={(event) => event.key === 'Escape' && setMode('idle')}
      >
        <label htmlFor={nameId} className="type-meta font-semibold text-fg-soft">
          Playlist name
        </label>
        <input
          id={nameId}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={MAX_PLAYLIST_NAME}
          autoComplete="off"
          className={textInput}
        />
        {official && (
          <>
            <label htmlFor={descriptionId} className="type-meta mt-1 font-semibold text-fg-soft">
              Description (optional)
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={MAX_PLAYLIST_DESCRIPTION}
              rows={2}
              className={cx(textInput, 'rounded-control py-2')}
            />
          </>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          <Button type="submit" disabled={update.isPending || !name.trim()}>
            Save
          </Button>
          <Button variant="secondary" onClick={() => setMode('idle')}>
            Cancel
          </Button>
        </div>
        {update.isError && (
          <p role="alert" className="m-0 text-meta text-pink">
            {playlistErrorMessage(update.error)}
          </p>
        )}
      </form>
    )
  }

  if (mode === 'delete' || mode === 'publish') {
    const deleting = mode === 'delete'
    const action = deleting ? remove : move
    const question = deleting
      ? `Delete “${playlist.name}”? Its covers stay in the catalog and in your Favorites.`
      : official
        ? `Unpublish “${playlist.name}”? It leaves Home and goes back, private, to the Library of whoever made it.`
        : `Publish “${playlist.name}” as a Coverly playlist? Everyone will be able to see and play it, and it leaves your Library. Any Coverly admin can then change it.`
    const confirm = deleting ? 'Delete playlist' : official ? 'Unpublish' : 'Publish'
    // After deleting, or once it has moved to the other kind, this page no longer shows it.
    const after = deleting
      ? official
        ? '/'
        : '/library'
      : official
        ? '/library'
        : `/playlists/${playlist.id}`
    return (
      <div role="group" aria-label={confirm} className="mt-2 grid justify-items-start gap-2">
        <p className="m-0 max-w-[60ch] text-label">{question}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            autoFocus
            disabled={action.isPending}
            // mutateAsync, not mutate's callbacks: once the playlist leaves this page's list, this
            // component unmounts, and per-call callbacks would no longer run. Errors show below.
            onClick={() =>
              action.mutateAsync().then(
                () => navigate(after, { replace: true }),
                () => undefined,
              )
            }
          >
            {confirm}
          </Button>
          <Button variant="secondary" onClick={() => setMode('idle')}>
            Cancel
          </Button>
        </div>
        {action.isError && (
          <p role="alert" className="m-0 text-meta text-pink">
            {playlistErrorMessage(action.error)}
          </p>
        )}
      </div>
    )
  }

  const small = 'min-h-9 px-3'
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button
        variant="secondary"
        className={small}
        onClick={() => {
          setName(playlist.name)
          setDescription(playlist.description)
          setMode('edit')
        }}
      >
        {official ? 'Edit' : 'Rename'}
      </Button>
      <Button variant="secondary" className={small} onClick={() => setMode('delete')}>
        Delete
      </Button>
      {isAdmin && (
        <Button variant="secondary" className={small} onClick={() => setMode('publish')}>
          {official ? 'Unpublish' : 'Publish as Coverly playlist'}
        </Button>
      )}
    </div>
  )
}
