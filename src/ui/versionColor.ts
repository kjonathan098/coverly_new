/** The original's color. Covers use versionColor(); both read the palette tokens in theme.css. */
export const ORIGINAL_COLOR = 'var(--color-pink)'

/**
 * Color of the cover at `index` (0 = first recorded) out of `count`, on the turquoise to blue ramp.
 * The ramp is resampled, so any number of covers gets an even spread.
 */
export function versionColor(index: number, count: number): string {
  if (count <= 1) return 'var(--color-turquoise)'
  const t = Math.min(1, Math.max(0, index / (count - 1)))
  const turquoise = Math.round((1 - t) * 100)
  return `color-mix(in oklch, var(--color-turquoise) ${turquoise}%, var(--color-blue))`
}
