import { useSearchParams } from 'react-router'
import type { CoverSong } from '../songs/types'

/*
 * EXPERIMENT (dev only): two artist headers to compare.
 *   A: text only (production).
 *   B: a frame from one of the artist's own cover performances behind the header, on the right.
 * Switch with ?hero=a / ?hero=b, or the small toggle on the header. Production always shows A.
 */
export type HeroVariant = 'a' | 'b'

export function useHeroVariant(): [HeroVariant, (variant: HeroVariant) => void] {
  const [params, setParams] = useSearchParams()
  const variant: HeroVariant = import.meta.env.DEV && params.get('hero') === 'b' ? 'b' : 'a'
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
