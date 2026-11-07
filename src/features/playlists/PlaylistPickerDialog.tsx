import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, CloseIcon, PlusIcon, SearchIcon, cx } from '../../ui'
import { useSession } from '../auth/session'
import { CoverArt } from '../songs/CoverArt'
import { artistList, displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { playlistErrorMessage, type Playlist } from './api'
import { NewPlaylistForm, textInput } from './NewPlaylistForm'
import { closePlaylistPicker, usePlaylistPickerState } from './pickerStore'
import { usePlaylists, usePlaylistSong } from './usePlaylists'

/**
 * The add-to-playlist modal: one for the whole app, mounted by the app shell. Any "+" opens it.
 *
 * Like the Discover filter sheet, it is a non-modal <dialog> and the rest of the page (header,
 * content, footer) is made inert and dimmed while it's open, so it behaves like a modal without a
 * backdrop over the player: YouTube forbids covering the video, and the player keeps playing and
 * stays usable. It sits above a floating player (--player-inset) and clear of a docked one, so it
 * never covers the video, and opening it changes nothing about the player's element or layout.
 */
export function PlaylistPickerDialog() {
  const picker = usePlaylistPickerState()
  const session = useSession()
  const loggedOut = !session.isPending && !session.data

  // Logging out (here or in another tab) closes it.
  useEffect(() => {
    if (picker && loggedOut) closePlaylistPicker()
  }, [picker, loggedOut])

  if (!picker || !session.data) return null
  return createPortal(
    <PickerDialog key={picker.song.id} song={picker.song} opener={picker.opener} />,
    document.body,
  )
}

function PickerDialog({ song, opener }: { song: CoverSong; opener: HTMLElement | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const songId = useId()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const { playlists, query } = usePlaylists()

  useEffect(() => {
    const el = dialog.current
    if (!el) return
    // The app shell marks its header, content and footer; the player is deliberately not marked.
    const page = [...document.querySelectorAll('[data-shell="page"]')]
    for (const node of page) {
      node.setAttribute('inert', '')
      node.setAttribute('data-dimmed', '')
    }
    if (typeof el.show === 'function') el.show()
    else el.setAttribute('open', '')
    el.querySelector<HTMLElement>('input, button')?.focus()
    return () => {
      for (const node of page) {
        node.removeAttribute('inert')
        node.removeAttribute('data-dimmed')
      }
      if (opener?.isConnected) opener.focus()
    }
  }, [opener])

  const term = search.trim().toLowerCase()
  const shown = playlists?.filter((playlist) => playlist.name.toLowerCase().includes(term))
  const title = displayTitle(song.title)

  return (
    <>
      {/* Clicking outside closes it. Under the player (and the header), so it never covers the video. */}
      <div aria-hidden="true" onClick={closePlaylistPicker} className="fixed inset-0 z-[9]" />
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={songId}
        aria-modal="false"
        onClose={closePlaylistPicker}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          closePlaylistPicker()
        }}
        data-surface="ink"
        className={cx(
          'fixed top-3 left-1/2 z-50 m-0 hidden w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-card border-[1.5px] border-line bg-ink-2 p-0 text-fg shadow-[0_24px_60px_-12px_rgb(0_0_0/0.8)] open:flex',
          // Never taller than the room above a floating player.
          'max-h-[calc(100dvh-var(--player-inset,0px)-1.5rem)] tablet:top-18 tablet:max-h-[calc(100dvh-var(--player-inset,0px)-6rem)]',
        )}
      >
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          <CoverArt song={song} className="w-16 shrink-0 rounded-control max-tablet:hidden" />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="type-row m-0 text-[1.1875rem]">
              Add to playlist
            </h2>
            <p id={songId} className="m-0 truncate text-label text-fg-soft">
              {title} · {artistList(song.artists)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={closePlaylistPicker}
            className="-mt-1 -mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill hover:bg-raised"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <div className="relative px-4 pb-2">
          <label htmlFor={`${titleId}-search`} className="sr-only">
            Find a playlist
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-7.5 size-4 -translate-y-1/2 text-fg-soft" />
          <input
            id={`${titleId}-search`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a playlist"
            autoComplete="off"
            className={cx(textInput, 'pl-10')}
          />
        </div>

        {/* The only part that scrolls, so 5 or 100 playlists both fit. */}
        <div className="min-h-24 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
          {query.isError ? (
            <p role="alert" className="m-0 px-2 py-2 text-label">
              Your playlists didn’t load.{' '}
              <button
                type="button"
                onClick={() => void query.refetch()}
                className="cursor-pointer font-bold underline"
              >
                Try again
              </button>
            </p>
          ) : !shown ? (
            <p aria-busy="true" className="m-0 px-2 py-2 text-label text-fg-soft">
              Loading your playlists…
            </p>
          ) : shown.length > 0 ? (
            <ul aria-label="Your playlists" className="m-0 grid list-none gap-0.5 p-0">
              {shown.map((playlist) => (
                <PlaylistChoice key={playlist.id} playlist={playlist} songId={song.id} />
              ))}
            </ul>
          ) : (
            <p className="m-0 px-2 py-2 text-label text-fg-soft">
              {term ? `No playlist called “${search.trim()}”.` : 'No playlists yet.'}
            </p>
          )}
        </div>

        <div className="border-t-[1.5px] border-line px-4 py-3">
          {creating ? (
            <NewPlaylistForm
              songId={song.id}
              initialName={search.trim()}
              autoFocus
              onCreated={() => {
                setCreating(false)
                setSearch('')
              }}
            />
          ) : (
            <Button
              variant="secondary"
              icon={<PlusIcon />}
              onClick={() => setCreating(true)}
              className="w-full"
            >
              New playlist
            </Button>
          )}
        </div>
      </dialog>
    </>
  )
}

function PlaylistChoice({ playlist, songId }: { playlist: Playlist; songId: string }) {
  const toggle = usePlaylistSong(playlist.id, songId)
  const checked = playlist.songIds.includes(songId)
  return (
    <li>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-[color-mix(in_srgb,var(--surface-fg)_6%,transparent)]">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle.mutate(!checked)}
          className="size-5 shrink-0 cursor-pointer accent-pink"
        />
        <span className="min-w-0 flex-1 truncate text-label">{playlist.name}</span>
      </label>
      {toggle.isError && (
        <p role="alert" className="m-0 px-2 text-meta text-pink">
          {playlistErrorMessage(toggle.error)}
        </p>
      )}
    </li>
  )
}
