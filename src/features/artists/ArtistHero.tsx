import { useState } from 'react'
import { cx } from '../../ui'
import type { HeroVariant } from './heroVariant'
import { youtubeThumbnail } from '../songs/thumbnail'
import { displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { tintFor } from '../songs/tint'

/** Dev-only A/B switch, top right of the header. */
export function HeroVariantToggle({
  variant,
  onChange,
}: {
  variant: HeroVariant
  onChange: (variant: HeroVariant) => void
}) {
  if (!import.meta.env.DEV) return null
  return (
    <div
      role="group"
      aria-label="Artist header (development only)"
      className="type-chip absolute top-3 right-3 z-10 flex overflow-hidden rounded-pill bg-raised shadow-[inset_0_0_0_1px_var(--surface-line)]"
    >
      {(['a', 'b'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={variant === option}
          onClick={() => onChange(option)}
          className={cx(
            'cursor-pointer px-2.5 py-1 uppercase',
            variant === option ? 'bg-pink text-ink' : 'text-fg-soft hover:text-fg',
          )}
        >
          Header {option}
        </button>
      ))}
    </div>
  )
}

/**
 * Variant B's backdrop: a frame from the performance, printed as a duotone in its genre's ink with
 * a halftone (like the cards), on the right, fading into the page's ink toward the name. It's a
 * video frame, not a portrait, so it's decorative and captioned with what it is. If YouTube has no
 * large frame it uses the smaller one; if that fails too, the header is simply text.
 */
export function HeroBackdrop({ song }: { song: CoverSong }) {
  const [quality, setQuality] = useState<'maxresdefault' | 'hqdefault' | null>('maxresdefault')
  if (!song.video || quality === null) return null
  const next = () => setQuality(quality === 'maxresdefault' ? 'hqdefault' : null)

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-full overflow-hidden tablet:w-[68%]"
        style={{ backgroundColor: tintFor(song.genres[0]?.name) }}
      >
        <img
          src={youtubeThumbnail(song.video.videoId, quality)}
          alt=""
          decoding="async"
          onError={next}
          // YouTube answers a missing frame with a 120px placeholder rather than an error.
          onLoad={(event) => event.currentTarget.naturalWidth <= 120 && next()}
          className="size-full object-cover object-[50%_35%] mix-blend-multiply contrast-125 grayscale"
        />
        <span className="halftone absolute inset-0 opacity-35 [--halftone-color:var(--color-ink)] [--halftone-size:6px]" />
      </div>
      {/* The fade into ink: from the left on wide screens, over everything on phones. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-ink)_0%,color-mix(in_srgb,var(--color-ink)_88%,transparent)_45%,color-mix(in_srgb,var(--color-ink)_55%,transparent)_100%)] tablet:bg-[linear-gradient(90deg,var(--color-ink)_30%,color-mix(in_srgb,var(--color-ink)_70%,transparent)_50%,transparent_78%)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(transparent,var(--color-ink))]"
      />
      <p className="type-meta absolute right-3 bottom-2 z-[1] m-0 max-w-[60%] truncate text-right text-fg-soft max-tablet:hidden">
        From their cover of {displayTitle(song.title)}
      </p>
    </>
  )
}
