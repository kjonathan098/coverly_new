import { useState, type CSSProperties } from 'react'
import { cx } from '../../ui'
import { YouTubeEmbed } from '../player/YouTubeEmbed'
import { displayTitle } from './format'
import type { CoverSong } from './types'
import { tintFor } from './tint'

type CoverArtProps = {
  song: CoverSong
  playing?: boolean
  /** hero uses the larger thumbnail. */
  size?: 'card' | 'hero'
  /** Overrides the genre ink, so a group of covers can print in one color. */
  tint?: string
  className?: string
  style?: CSSProperties
}

/**
 * The cover's own video frame, printed as a duotone in its genre's ink with a halftone over it.
 * It shows its true colors on hover, and becomes the player while it plays. Without a
 * thumbnail it falls back to a plain halftone, so nothing depends on artwork existing.
 */
export function CoverArt({
  song,
  playing = false,
  size = 'card',
  tint: tintOverride,
  className,
  style,
}: CoverArtProps) {
  const [failed, setFailed] = useState(false)
  const tint = tintOverride ?? tintFor(song.genres[0]?.name)
  const thumbnail = song.video
    ? `https://i.ytimg.com/vi/${song.video.videoId}/${size === 'hero' ? 'hqdefault' : 'mqdefault'}.jpg`
    : null

  return (
    <div
      className={cx('relative aspect-video overflow-hidden bg-ink-3', className)}
      style={{ backgroundColor: tint, ...style }}
    >
      {playing && song.video ? (
        <YouTubeEmbed video={song.video} title={displayTitle(song.title)} />
      ) : (
        <>
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
          <div
            aria-hidden="true"
            className="halftone pointer-events-none absolute inset-0 opacity-60 [--halftone-color:var(--color-ink)] [--halftone-size:7px] mask-[linear-gradient(200deg,transparent_40%,#000_100%)] transition-opacity duration-(--duration-slow) group-hover:opacity-0"
          />
        </>
      )}
    </div>
  )
}
