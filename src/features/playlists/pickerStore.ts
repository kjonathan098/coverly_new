import { useSyncExternalStore } from 'react'
import type { CoverSong } from '../songs/types'

/*
 * Which song the add-to-playlist modal is open for, if any. One modal for the whole app (mounted by
 * the app shell, like the player); any "+" opens it with its song.
 */
type PickerState = { song: CoverSong; opener: HTMLElement | null } | null

let state: PickerState = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

/** Opens the modal for `song`. Focus goes back to `opener` when it closes. */
export function openPlaylistPicker(song: CoverSong, opener: HTMLElement | null = null) {
  state = { song, opener }
  emit()
}

export function closePlaylistPicker() {
  if (!state) return
  state = null
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const snapshot = () => state

export function usePlaylistPickerState() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
