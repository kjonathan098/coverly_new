import { PlayerState, type YTPlayer, type YTPlayerOptions } from '../features/player/youtubeApi'

/**
 * A stand-in for the YouTube IFrame Player API, installed for every test. Like the real one, it
 * replaces the target element with an iframe, reports state asynchronously, switches videos in
 * place and removes its iframe on destroy(). Tests can also play the part of YouTube's own
 * controls with emit() and fail().
 */
export class FakePlayer implements YTPlayer {
  static instances: FakePlayer[] = []

  readonly iframe: HTMLIFrameElement
  readonly options: YTPlayerOptions
  videoId: string
  calls: string[] = []
  destroyed = false

  constructor(element: HTMLElement, options: YTPlayerOptions) {
    this.options = options
    this.videoId = options.videoId
    this.iframe = document.createElement('iframe')
    this.iframe.src = `${options.host ?? 'https://www.youtube.com'}/embed/${options.videoId}?enablejsapi=1`
    element.replaceWith(this.iframe)
    FakePlayer.instances.push(this)
    this.later(() => {
      options.events?.onReady?.({ target: this })
      if (options.playerVars?.autoplay) this.emit(PlayerState.PLAYING)
    })
  }

  private later(fn: () => void) {
    queueMicrotask(() => {
      if (!this.destroyed) fn()
    })
  }

  /** Report a state, as YouTube does after its own controls or the API change it. */
  emit(state: number) {
    this.options.events?.onStateChange?.({ data: state, target: this })
  }

  fail(code: number) {
    this.options.events?.onError?.({ data: code, target: this })
  }

  blockAutoplay() {
    this.options.events?.onAutoplayBlocked?.({ target: this })
  }

  loadVideoById({ videoId, startSeconds }: { videoId: string; startSeconds?: number }) {
    this.videoId = videoId
    this.calls.push(`load ${videoId}${startSeconds ? ` @${startSeconds}` : ''}`)
    this.later(() => this.emit(PlayerState.PLAYING))
  }

  playVideo() {
    this.calls.push('play')
    this.later(() => this.emit(PlayerState.PLAYING))
  }

  pauseVideo() {
    this.calls.push('pause')
    this.later(() => this.emit(PlayerState.PAUSED))
  }

  seekTo(seconds: number) {
    this.calls.push(`seek ${seconds}`)
  }

  destroy() {
    this.calls.push('destroy')
    this.destroyed = true
    this.iframe.remove()
  }

  getIframe() {
    return this.iframe
  }
}

export function installFakeYouTube() {
  FakePlayer.instances = []
  window.YT = { Player: FakePlayer }
}

export function uninstallFakeYouTube() {
  delete window.YT
  FakePlayer.instances = []
}

/** The one live player, failing the test if there are none or several. */
export function livePlayer(): FakePlayer {
  const live = FakePlayer.instances.filter((p) => !p.destroyed)
  if (live.length !== 1) throw new Error(`Expected one live YouTube player, found ${live.length}`)
  return live[0]!
}
