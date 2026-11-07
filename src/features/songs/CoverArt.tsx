import { useState, type CSSProperties } from 'react'
import { cx } from '../../ui'
import { PlaybackBadge } from '../player/PlaybackBadge'
import type { PlaybackStatus } from '../player/playback'
import type { CoverSong } from './types'
import { tintFor } from './tint'
import { youtubeThumbnail } from './thumbnail'

type CoverArtProps = {
  song: CoverSong
  /** Set when this recording is the one in the player: the artwork carries its badge. */
  status?: PlaybackStatus | null
  /** hero uses the larger thumbnail. */
  size?: 'card' | 'hero'
  /** Overrides the genre ink, so a group of covers can print in one color. */
  tint?: string
  className?: string
  style?: CSSProperties
}

/**
 * The cover's own video frame, printed as a duotone in its genre's ink with a halftone over it.
 * It shows its true colors on hover. Without a thumbnail it falls back to a plain halftone, so
 * nothing depends on artwork existing. It never plays video itself: the app shell's player does.
 */
export function CoverArt({
  song,
  status = null,
  size = 'card',
  tint: tintOverride,
  className,
  style,
}: CoverArtProps) {
  const [failed, setFailed] = useState(false)
  const tint = tintOverride ?? tintFor(song.genres[0]?.name)
  const thumbnail = song.video
    ? youtubeThumbnail(song.video.videoId, size === 'hero' ? 'hqdefault' : 'mqdefault')
    : null

  return (
    // Spans (displayed as blocks), so the artwork can sit inside a button, as on SongCard.
    <span
      className={cx('relative block aspect-video overflow-hidden bg-ink-3', className)}
      style={{ backgroundColor: tint, ...style }}
    >
      {thumbnail && !failed && (
        <img
          src={thumbnail}
          alt=""
          loading={size === 'hero' ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          // YouTube answers a missing thumbnail with a 120px grey placeholder, not an error.
          onLoad={(event) => event.currentTarget.naturalWidth <= 120 && setFailed(true)}
          className="absolute inset-0 size-full object-cover mix-blend-multiply contrast-125 grayscale transition-[filter,mix-blend-mode] duration-(--duration-slow) ease-snap group-hover:mix-blend-normal group-hover:grayscale-0"
        />
      )}
      <span
        aria-hidden="true"
        className="halftone pointer-events-none absolute inset-0 block opacity-60 [--halftone-color:var(--color-ink)] [--halftone-size:7px] mask-[linear-gradient(200deg,transparent_40%,#000_100%)] transition-opacity duration-(--duration-slow) group-hover:opacity-0"
      />
      {status && <PlaybackBadge status={status} className="absolute top-2 left-2 shadow-sm" />}
    </span>
  )
}
