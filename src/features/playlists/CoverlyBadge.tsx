import { cx } from '../../ui'

/** Marks a Coverly playlist: a small yellow sticker, as on the Home collage. */
export function CoverlyBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'type-lettering inline-block w-max -rotate-2 bg-yellow px-1.5 text-[0.8125rem] leading-[1.45] text-ink uppercase',
        className,
      )}
    >
      By Coverly
    </span>
  )
}
