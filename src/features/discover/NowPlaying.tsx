import { useEffect, useRef } from 'react'
import { CloseIcon } from '../../ui'
import { YouTubeEmbed } from '../player/YouTubeEmbed'
import { artistList, displayTitle } from '../songs/format'
import type { CoverSong, Video } from '../songs/types'

type NowPlayingProps = {
  song: CoverSong & { video: Video }
  onClose: () => void
}

/**
 * Discover's player, docked to the bottom of the page so browsing continues while a cover plays.
 * It belongs to the page: it unmounts (and the video stops) when the reader leaves Discover.
 * YouTube requires an embedded player of at least 200 × 200 px with nothing laid over it, so the
 * video keeps that size everywhere and the controls sit beside or above it, never on it.
 * While open, the page gets bottom padding equal to the panel, so it never hides the last results.
 */
export function NowPlaying({ song, onClose }: NowPlayingProps) {
  const panel = useRef<HTMLElement>(null)
  const title = displayTitle(song.title)
  const originals = artistList(song.originalArtists)

  useEffect(() => {
    const el = panel.current
    if (!el) return
    const reserve = () => {
      document.body.style.paddingBottom = `${el.offsetHeight}px`
    }
    reserve()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(reserve)
    observer?.observe(el)
    return () => {
      observer?.disconnect()
      document.body.style.paddingBottom = ''
    }
  }, [])

  return (
    <section
      ref={panel}
      data-surface="ink"
      aria-label="Now playing"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-line bg-ink-2 text-fg shadow-[0_-18px_40px_-16px_rgb(0_0_0/0.75)]"
    >
      <div className="mx-auto flex max-w-page flex-col tablet:flex-row tablet:items-center tablet:gap-5 tablet:px-margin tablet:py-3">
        <div className="flex min-w-0 items-center gap-3 px-margin py-2 tablet:order-2 tablet:flex-1 tablet:px-0">
          <div className="min-w-0 flex-1">
            <p className="type-meta m-0 font-semibold text-accent max-tablet:sr-only">
              Now playing
            </p>
            <p className="type-row m-0 truncate text-[1.0625rem] tablet:text-[1.25rem]">{title}</p>
            <p className="m-0 truncate text-label">
              <span className="font-medium">{artistList(song.artists)}</span>
              {originals && (
                <span className="text-fg-soft">
                  {' '}
                  · <span className="font-semibold">Original</span> {originals}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close player"
            onClick={onClose}
            className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] transition-colors hover:bg-pink hover:text-ink hover:shadow-none"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        {/* 356 × 200 is 16:9 at YouTube’s 200px minimum; narrower phones keep 200px and letterbox. */}
        <div className="relative mx-auto aspect-video min-h-[200px] w-[356px] max-w-full shrink-0 overflow-hidden bg-ink max-tablet:mb-2 tablet:order-1 tablet:mx-0 tablet:rounded-control">
          <YouTubeEmbed key={song.id} video={song.video} title={title} />
        </div>
      </div>
    </section>
  )
}
