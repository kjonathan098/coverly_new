import { useSyncExternalStore } from 'react'
import { displayTitle } from '../songs/format'
import type { CoverSong, Video } from '../songs/types'
import { PlayerState, loadYouTubeApi, type YTPlayer } from './youtubeApi'

/*
 * Coverly's one player. Playback state lives here, outside React's tree, so every page reads the
 * same truth and no route change can reset it. The YouTube player itself is created once, inside
 * the element the app shell gives it (attachPlayer), and is never moved or re-created while it
 * plays: another recording is loaded into the same instance with loadVideoById.
 *
 * Status comes from YouTube's own events. If the listener pauses with YouTube's controls, every
 * row in Coverly shows "paused" too.
 */

/**
 * Privacy-enhanced mode. Verified with the IFrame API on 2026-11-05: the player is served from this
 * host, its events fire, and loadVideoById switches videos in place. (Label-owned music videos
 * refuse to embed on IP-address origins such as 127.0.0.1 with error 150 on either host; use
 * localhost in development.)
 */
export const YOUTUBE_HOST = 'https://www.youtube-nocookie.com'

export type PlayableSong = CoverSong & { video: Video }

export type PlaybackStatus = 'loading' | 'playing' | 'paused' | 'ended' | 'unavailable'

/** Why a recording can't play here, from YouTube's onError codes (or the API failing to load). */
export type PlaybackProblem = 'removed' | 'not-embeddable' | 'not-loaded' | 'other'

export type Playback =
  | { song: null; status: 'idle'; problem: null }
  | { song: PlayableSong; status: PlaybackStatus; problem: PlaybackProblem | null }

const IDLE: Playback = { song: null, status: 'idle', problem: null }

let state: Playback = IDLE
const listeners = new Set<() => void>()

function set(next: Playback) {
  state = next
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const getSnapshot = () => state

export const isPlayable = (song: CoverSong | null | undefined): song is PlayableSong =>
  Boolean(song?.video)

/* ---------------------------------------------------------------- the YouTube instance ---- */

let host: HTMLElement | null = null
let instance: YTPlayer | null = null
let ready = false
// Bumped by close(), so an API load that finishes after Close creates nothing.
let generation = 0

const problemFor = (code: number): PlaybackProblem =>
  code === 100 ? 'removed' : code === 101 || code === 150 ? 'not-embeddable' : 'other'

const iframeTitle = (song: PlayableSong) => `${displayTitle(song.title)}, playing from YouTube`

function onStateChange(code: number) {
  if (!state.song) return
  const status: PlaybackStatus | null =
    code === PlayerState.PLAYING
      ? 'playing'
      : code === PlayerState.PAUSED
        ? 'paused'
        : code === PlayerState.ENDED
          ? 'ended'
          : code === PlayerState.BUFFERING
            ? state.status === 'playing'
              ? 'playing'
              : 'loading'
            : null // unstarted or cued: keep what we have until YouTube says more
  if (status && status !== state.status) set({ ...state, status, problem: null })
}

function load(song: PlayableSong) {
  if (instance && ready) {
    instance.loadVideoById({ videoId: song.video.videoId, startSeconds: song.video.startSeconds })
    instance.getIframe().title = iframeTitle(song)
    return
  }
  if (instance) return // still starting: onReady loads whatever is current then
  if (!host) return // no shell to play in (attachPlayer loads it when one appears)
  const mine = ++generation
  const container = host
  loadYouTubeApi().then(
    (YT) => {
      if (mine !== generation || instance || !state.song) return
      // YouTube replaces this element with its iframe. React never renders into it.
      const slot = document.createElement('div')
      container.replaceChildren(slot)
      const first = state.song
      ready = false
      instance = new YT.Player(slot, {
        host: YOUTUBE_HOST,
        videoId: first.video.videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          rel: 0,
          ...(first.video.startSeconds ? { start: first.video.startSeconds } : {}),
        },
        events: {
          onReady: ({ target }) => {
            ready = true
            target.getIframe().title = iframeTitle(first)
            // Another recording was picked while the player was starting.
            if (state.song && state.song.id !== first.id) load(state.song)
          },
          onStateChange: ({ data }) => onStateChange(data),
          onError: ({ data }) => {
            if (state.song) set({ ...state, status: 'unavailable', problem: problemFor(data) })
          },
          // The browser refused to start with sound: wait, paused, for a press of play.
          onAutoplayBlocked: () => {
            if (state.song) set({ ...state, status: 'paused', problem: null })
          },
        },
      })
    },
    () => {
      if (mine === generation && state.song)
        set({ ...state, status: 'unavailable', problem: 'not-loaded' })
    },
  )
}

/** The app shell hands over the element the player lives in, once, for the app's lifetime. */
export function attachPlayer(element: HTMLElement) {
  host = element
  if (state.song && !instance) load(state.song)
  return () => {
    if (host === element) host = null
  }
}

/* ------------------------------------------------------------------------ actions ---- */

/**
 * The one play action for every button in Coverly. Another recording replaces the current one in
 * the same player; the current recording pauses, resumes, replays after it ended, or retries
 * after it failed.
 */
export function play(song: CoverSong) {
  if (!isPlayable(song)) return
  if (state.song?.id === song.id) {
    if (state.status === 'playing' || state.status === 'loading') pause()
    else if (state.status === 'paused') resume()
    else if (state.status === 'ended') replay()
    else retry()
    return
  }
  set({ song, status: 'loading', problem: null })
  load(song)
}

export function pause() {
  if (instance && ready) instance.pauseVideo()
}

export function resume() {
  if (instance && ready) instance.playVideo()
}

export function replay() {
  if (!state.song || !instance || !ready) return
  instance.seekTo(state.song.video.startSeconds, true)
  instance.playVideo()
}

function retry() {
  if (!state.song) return
  const song = state.song
  set({ song, status: 'loading', problem: null })
  load(song)
}

/** The explicit stop: removes the player entirely. The next play starts a new one. */
export function close() {
  generation++
  instance?.destroy()
  instance = null
  ready = false
  host?.replaceChildren()
  set(IDLE)
}

/**
 * What a recording's play button does next, given its status in the player (null: not loaded).
 * Every play button in Coverly names its action with this.
 */
export function playVerb(
  status: PlaybackStatus | null,
): 'Play' | 'Pause' | 'Resume' | 'Replay' | 'Retry' {
  switch (status) {
    case 'loading':
    case 'playing':
      return 'Pause'
    case 'paused':
      return 'Resume'
    case 'ended':
      return 'Replay'
    case 'unavailable':
      return 'Retry'
    default:
      return 'Play'
  }
}

/* -------------------------------------------------------------------------- hooks ---- */

/** Everything about the current recording, for the player itself. */
export function usePlayback(): Playback {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Whether this recording is the current one, and how it's doing. Rows, cards and slides use it;
 * each re-renders only when its own answer changes.
 */
export function usePlaybackOf(songId: string): PlaybackStatus | null {
  const pick = () => {
    const now = state
    return now.song !== null && now.song.id === songId ? now.status : null
  }
  return useSyncExternalStore(subscribe, pick, pick)
}

/** Tests only: forget everything, as on a fresh page load. */
export function resetPlayback() {
  generation++
  instance = null
  ready = false
  host = null
  state = IDLE
  listeners.clear()
}
