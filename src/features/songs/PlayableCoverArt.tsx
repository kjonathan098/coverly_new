import { PauseIcon, PlayIcon, cx } from '../../ui'
import { play, playVerb, usePlaybackOf } from '../player/playback'
import { CoverArt } from './CoverArt'
import { artistList, displayTitle } from './format'
import type { CoverSong } from './types'

const SIZES = {
  // Cards (Explore, Magazine shelf, same-song takes).
  card: { circle: 'size-14 *:size-6', corner: 'right-2 bottom-2 size-8 *:size-4' },
  // Compact rows (Discover, Favorites, playlists): thumbnails ~90–110px wide.
  row: { circle: 'size-9 *:size-4', corner: 'right-1 bottom-1 size-6 *:size-3' },
}

/**
 * A cover's artwork as its Play/Pause button: the one playback control wherever a song's thumbnail
 * shows. It calls `play(song)`, which plays it in the app shell's player, or toggles pause/resume
 * when it's the song already there.
 *
 * - Hover (devices that can hover) and keyboard focus: a translucent pink circle at the center.
 * - Touch screens, which can't hover: a small permanent icon in the corner.
 * - No video: plain artwork, not a button, with a "No video" label.
 *
 * Only the artwork is the button: titles, artist links, tags and other actions stay outside it.
 * Transitions follow the global reduced-motion rule (base.css).
 */
export function PlayableCoverArt({
  song,
  size = 'card',
  badge = true,
  artSize,
  className,
  artClassName,
}: {
  song: CoverSong
  /** Overlay scale for the thumbnail: `card` or the compact `row`. */
  size?: keyof typeof SIZES
  /** Show the Playing/Paused badge on the artwork (rows show it beside the title instead). */
  badge?: boolean
  /** Which thumbnail CoverArt loads. */
  artSize?: 'card' | 'hero'
  /** Placement of the whole control (grid cells, width). */
  className?: string
  /** CoverArt's own classes (rounding). */
  artClassName?: string
}) {
  const status = usePlaybackOf(song.id)
  const art = (
    <CoverArt song={song} size={artSize} status={badge ? status : null} className={artClassName} />
  )

  if (!song.video) {
    return (
      <span className={cx('relative block', className)}>
        {art}
        <span className="type-chip absolute bottom-1.5 left-1.5 rounded-pill bg-raised px-2 text-fg-soft">
          No video
        </span>
      </span>
    )
  }

  const verb = playVerb(status)
  const icon = verb === 'Pause' ? <PauseIcon /> : <PlayIcon />
  const sizes = SIZES[size]
  return (
    <button
      type="button"
      aria-label={`${verb} ${displayTitle(song.title)} by ${artistList(song.artists)}`}
      onClick={() => play(song)}
      className={cx(
        'group/art relative block w-full cursor-pointer p-0 text-left',
        // The focus ring follows the artwork's corners.
        size === 'card'
          ? 'rounded-card focus-visible:rounded-card'
          : 'rounded-control focus-visible:rounded-control',
        className,
      )}
    >
      {art}
      {/* Hover and keyboard focus: a translucent pink circle at the center, over a slight darkening.
          Hidden otherwise, so the artwork stays clean. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid place-items-center bg-[radial-gradient(circle,rgb(0_0_0/0.18),transparent_70%)] opacity-0 transition-opacity duration-(--duration-fast) ease-snap group-hover/art:opacity-100 group-focus-visible/art:opacity-100"
      >
        <span
          className={cx(
            'grid scale-90 place-items-center rounded-pill bg-pink/50 text-ink shadow-[0_6px_18px_-6px_rgb(0_0_0/0.45)] ring-1 ring-pink/70 transition-transform duration-(--duration-fast) ease-snap group-hover/art:scale-100 group-focus-visible/art:scale-100',
            sizes.circle,
          )}
        >
          {icon}
        </span>
      </span>
      {/* Touch screens: a small permanent icon, so it's clear the artwork plays. */}
      <span
        aria-hidden="true"
        className={cx(
          'pointer-events-none absolute hidden place-items-center rounded-pill bg-[rgb(10_8_16/0.62)] text-paper backdrop-blur-sm pointer-coarse:grid',
          sizes.corner,
        )}
      >
        {icon}
      </span>
    </button>
  )
}
