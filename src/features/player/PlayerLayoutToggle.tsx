import { cx } from '../../ui'
import { PLAYER_LAYOUTS, setPlayerLayout, usePlayerLayout, type PlayerLayout } from './layouts'

/** Development only: switch the player between the layouts under review, without stopping it. */
export function PlayerLayoutToggle() {
  const { id } = usePlayerLayout()
  return (
    <div
      role="group"
      aria-label="Player layout (development only)"
      className="hidden items-center gap-1 rounded-pill p-1 text-meta shadow-[inset_0_0_0_1.5px_var(--surface-line)] desktop:flex"
    >
      <span className="px-2 text-fg-soft">Player</span>
      {(Object.keys(PLAYER_LAYOUTS) as PlayerLayout[]).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={id === option}
          title={PLAYER_LAYOUTS[option].label}
          onClick={() => setPlayerLayout(option)}
          className={cx(
            'min-h-8 cursor-pointer rounded-pill px-3 font-bold uppercase',
            id === option ? 'bg-pink text-ink' : 'text-fg hover:bg-raised',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
