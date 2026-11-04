import { describe, expect, it } from 'vitest'
import { ORIGINAL_COLOR, versionColor } from './versionColor'

describe('versionColor', () => {
  it('starts at turquoise and ends at electric blue', () => {
    expect(versionColor(0, 5)).toContain('var(--color-turquoise) 100%')
    expect(versionColor(4, 5)).toContain('var(--color-turquoise) 0%')
  })

  it('resamples the ramp evenly for any number of covers', () => {
    expect(versionColor(1, 3)).toContain('var(--color-turquoise) 50%')
    expect(versionColor(2, 9)).toContain('var(--color-turquoise) 75%')
  })

  it('gives a single cover turquoise and keeps out-of-range indexes on the ramp', () => {
    expect(versionColor(0, 1)).toBe('var(--color-turquoise)')
    expect(versionColor(9, 5)).toContain('var(--color-turquoise) 0%')
  })

  it('keeps the original pink', () => {
    expect(ORIGINAL_COLOR).toBe('var(--color-pink)')
  })
})
