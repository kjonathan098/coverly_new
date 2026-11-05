import { useSyncExternalStore } from 'react'

/*
 * Player layouts under review. Both style the SAME player element and shell grid; switching
 * changes classes only, so the YouTube iframe is never moved or recreated and playback continues.
 * Phones (< 720px) are the same in both: the full-width bar.
 *
 * A (current): floating card from 720px, its own column from 1536px.
 * B: floating card from 720px, an integrated right-hand column from 1280px.
 *
 * The switch exists in development only; production uses A until a decision is made.
 */

export type PlayerLayout = 'a' | 'b'

type LayoutClasses = {
  label: string
  /** The shell's grid while a recording is loaded: page | player column. */
  shell: string
  /** The panel as a docked column (overrides the floating card from its breakpoint). */
  dock: string
  /** The floating card's move-to-the-other-side button disappears when docked. */
  sideToggle: string
  /** Labels and "More covers by…" links, shown only when docked. They scroll on their own, so the
   * video and its controls stay in view however much there is. */
  extras: string
}

export const PLAYER_LAYOUTS: Record<PlayerLayout, LayoutClasses> = {
  a: {
    label: 'A · floating, docked from 1536px',
    shell: 'wide:grid wide:grid-cols-[minmax(0,1fr)_auto]',
    dock: 'wide:sticky wide:top-14 wide:right-auto wide:bottom-auto wide:left-auto wide:z-10 wide:h-[calc(100dvh-3.5rem)] wide:w-[25rem] wide:rounded-none wide:border-l-[1.5px] wide:shadow-none',
    sideToggle: 'wide:hidden',
    extras:
      'wide:mt-5 wide:grid wide:min-h-0 wide:flex-1 wide:content-start wide:gap-5 wide:overflow-y-auto wide:overscroll-contain',
  },
  b: {
    label: 'B · docked from 1280px',
    shell: 'laptop:grid laptop:grid-cols-[minmax(0,1fr)_auto]',
    // 24.375rem: a 356 × 200 video (YouTube's minimum at 16:9) plus padding, to leave the page room.
    dock: 'laptop:sticky laptop:top-14 laptop:right-auto laptop:bottom-auto laptop:left-auto laptop:z-10 laptop:h-[calc(100dvh-3.5rem)] laptop:w-[24.375rem] laptop:rounded-none laptop:border-l-[1.5px] laptop:shadow-none',
    sideToggle: 'laptop:hidden',
    extras:
      'laptop:mt-5 laptop:grid laptop:min-h-0 laptop:flex-1 laptop:content-start laptop:gap-5 laptop:overflow-y-auto laptop:overscroll-contain',
  },
}

const STORAGE_KEY = 'coverly:player-layout'
const isLayout = (value: unknown): value is PlayerLayout => value === 'a' || value === 'b'

function initial(): PlayerLayout {
  if (!import.meta.env.DEV || typeof window === 'undefined') return 'a'
  const fromUrl = new URLSearchParams(window.location.search).get('player')
  if (isLayout(fromUrl)) {
    localStorage.setItem(STORAGE_KEY, fromUrl)
    return fromUrl
  }
  const saved = localStorage.getItem(STORAGE_KEY)
  return isLayout(saved) ? saved : 'a'
}

let layout: PlayerLayout = initial()
const listeners = new Set<() => void>()

export function setPlayerLayout(next: PlayerLayout) {
  if (!import.meta.env.DEV || next === layout) return
  layout = next
  localStorage.setItem(STORAGE_KEY, next)
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const get = () => layout

export function usePlayerLayout(): LayoutClasses & { id: PlayerLayout } {
  const id = useSyncExternalStore(subscribe, get, get)
  return { id, ...PLAYER_LAYOUTS[id] }
}
