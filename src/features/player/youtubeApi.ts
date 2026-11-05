/*
 * The YouTube IFrame Player API, loaded on demand (only once someone presses play) and typed by
 * hand for the few parts Coverly uses, so no type package is needed.
 * Reference: https://developers.google.com/youtube/iframe_api_reference
 */

export const PlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

export type YTPlayer = {
  loadVideoById(options: { videoId: string; startSeconds?: number }): void
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  destroy(): void
  getIframe(): HTMLIFrameElement
}

export type YTPlayerOptions = {
  host?: string
  videoId: string
  width?: string | number
  height?: string | number
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (event: { target: YTPlayer }) => void
    onStateChange?: (event: { data: number; target: YTPlayer }) => void
    onError?: (event: { data: number; target: YTPlayer }) => void
    onAutoplayBlocked?: (event: { target: YTPlayer }) => void
  }
}

export type YTNamespace = {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const API_URL = 'https://www.youtube.com/iframe_api'
let loading: Promise<YTNamespace> | null = null

/** Resolves with the API, adding its script the first time. A failed load can be retried. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  loading ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube player API loaded without a Player'))
    }
    const script = document.createElement('script')
    script.src = API_URL
    script.async = true
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('YouTube player API did not load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/** Tests only: forget a previous load. */
export function resetYouTubeApiLoader() {
  loading = null
}
