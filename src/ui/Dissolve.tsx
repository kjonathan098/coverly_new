import { cx } from './cx'

/**
 * The halftone band between two surfaces. Place it where ink meets paper; never a hard edge.
 * `to` is the surface that comes next.
 */
export function Dissolve({ to, className }: { to: 'paper' | 'ink'; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'dissolve tablet:[--cell:12px] [--cell:10px]',
        to === 'ink' && 'scale-y-[-1]',
        className,
      )}
    />
  )
}
