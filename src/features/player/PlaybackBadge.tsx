import { cx } from '../../ui'
import type { PlaybackStatus } from './playback'

const LABELS: Record<PlaybackStatus, string> = {
  loading: 'Starting',
  playing: 'Playing',
  paused: 'Paused',
  ended: 'Finished',
  unavailable: 'Can’t play here',
}

/**
 * Marks the recording that's in the player, wherever it appears: a row, a card, a slide.
 * The bars move only while it plays (and not at all with reduced motion).
 */
export function PlaybackBadge({
  status,
  className,
}: {
  status: PlaybackStatus
  className?: string
}) {
  const moving = status === 'playing'
  return (
    <span
      className={cx(
        'type-chip inline-flex min-h-6 items-center gap-1.5 rounded-pill px-2 align-middle whitespace-nowrap',
        status === 'unavailable' ? 'bg-raised text-fg' : 'bg-pink text-ink',
        className,
      )}
    >
      {status !== 'unavailable' && (
        <span aria-hidden="true" className="flex h-2.5 items-end gap-[2px]">
          {[0, 1, 2].map((bar) => (
            <span
              key={bar}
              className={cx(
                'h-full w-[3px] origin-bottom rounded-pill bg-current',
                moving ? 'animate-equalize' : 'scale-y-50',
              )}
              style={moving ? { animationDelay: `${bar * -0.27}s` } : undefined}
            />
          ))}
        </span>
      )}
      {LABELS[status]}
    </span>
  )
}
