import { useMemo } from 'react'
import { cx } from './cx'
import { halftoneDots } from './halftone'

type SleeveProps = {
  /** The version's color (ORIGINAL_COLOR or versionColor()). */
  color: string
  /** Short text printed on the sleeve, usually the two-digit year. */
  label?: string
  size?: 'sm' | 'lg'
  className?: string
}

/** Generated cover art: a halftone in the version's color. Used whenever a recording has no image. */
export function Sleeve({ color, label, size = 'sm', className }: SleeveProps) {
  const dots = useMemo(
    () =>
      halftoneDots({
        step: size === 'lg' ? 6 : 9,
        light: { x: 100, y: 100 },
        bounds: [-6, -6, 106, 106],
        near: 10,
        far: 120,
        gamma: 0.9,
        max: 0.68,
      }),
    [size],
  )
  return (
    <div
      aria-hidden="true"
      style={{ color }}
      className={cx(
        'relative aspect-square shrink-0 overflow-hidden bg-ink-3',
        size === 'lg' ? 'rounded-card' : 'rounded-sleeve',
        className,
      )}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="currentColor">
        {dots.map((dot, index) => (
          <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} />
        ))}
      </svg>
      {label && (
        <span
          className={cx(
            'type-lettering absolute z-10 leading-none text-paper [text-shadow:0_0_0.35rem_var(--color-ink)]',
            size === 'lg'
              ? 'right-2 bottom-1.5 text-[2.4rem]'
              : 'right-1 bottom-0.5 text-[0.95rem]',
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
