import { useId, useState } from 'react'
import { Button, cx } from '../../ui'
import { MAX_PLAYLIST_NAME, playlistErrorMessage, type Playlist } from './api'
import { useCreatePlaylist } from './usePlaylists'

export const textInput =
  'min-h-11 w-full rounded-pill border-0 bg-raised px-4 text-body text-fg shadow-[inset_0_0_0_1.5px_var(--surface-line)] placeholder:text-fg-soft focus-visible:shadow-[inset_0_0_0_2px_var(--color-pink)]'

/** Names and creates a playlist, optionally with a first song already in it. */
export function NewPlaylistForm({
  songId,
  onCreated,
  initialName = '',
  autoFocus = false,
  className,
}: {
  songId?: string
  onCreated?: (playlist: Playlist) => void
  initialName?: string
  autoFocus?: boolean
  className?: string
}) {
  const id = useId()
  const [name, setName] = useState(initialName)
  const create = useCreatePlaylist()

  return (
    <form
      className={cx('grid gap-1.5', className)}
      onSubmit={(event) => {
        event.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        create.mutate(
          { name: trimmed, songId },
          {
            onSuccess: (playlist) => {
              setName('')
              onCreated?.(playlist)
            },
          },
        )
      }}
    >
      <label htmlFor={id} className="type-meta font-semibold text-fg-soft">
        New playlist
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus={autoFocus}
          maxLength={MAX_PLAYLIST_NAME}
          placeholder="Name"
          autoComplete="off"
          className={cx(textInput, 'min-w-0 flex-1')}
        />
        <Button type="submit" disabled={create.isPending || !name.trim()} className="shrink-0">
          Create
        </Button>
      </div>
      {create.isError && (
        <p role="alert" className="m-0 text-meta text-pink">
          {playlistErrorMessage(create.error)}
        </p>
      )}
    </form>
  )
}
