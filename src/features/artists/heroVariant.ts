import { useSearchParams } from 'react-router'
import type { CoverSong } from '../songs/types'

/*
 * Two artist headers. B is the official one (user decision, 2026-11-08):
 *   A: text only. Kept in development only, for comparison.
 *   B: a frame from one of the artist's own cover performances behind the header, on the right
 *      (text only when they have none, or no frame loads).
 * Production always shows B. In development, ?hero=a or the small toggle on the header shows A.
 */
export type HeroVariant = 'a' | 'b'

export function useHeroVariant(): [HeroVariant, (variant: HeroVariant) => void] {
  const [params, setParams] = useSearchParams()
  const variant: HeroVariant = import.meta.env.DEV && params.get('hero') === 'a' ? 'a' : 'b'
  const set = (next: HeroVariant) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        updated.set('hero', next)
        return updated
      },
      { replace: true, preventScrollReset: true },
    )
  return [variant, set]
}

/**
 * The performance to show behind the header: one the artist performs, with a video. A solo
 * performance first (more likely to show them), then title order. Null for original-only artists.
 */
export function heroSong(covers: readonly CoverSong[]): CoverSong | null {
  const withVideo = covers.filter((song) => song.video)
  return withVideo.find((song) => song.artists.length === 1) ?? withVideo[0] ?? null
}
