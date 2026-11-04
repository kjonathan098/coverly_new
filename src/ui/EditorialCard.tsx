import type { ReactNode } from 'react'
import { cx } from './cx'

type EditorialCardProps = {
  /** The story's format: Interview, Essay, Discover, Cover story. */
  format: string
  title: string
  href: string
  dek?: ReactNode
  /** Read time or length, e.g. "12 min read". */
  meta?: string
  /** Art-directed artwork for this story. Each story brings its own; the card only frames it. */
  art: ReactNode
  className?: string
}

/**
 * A story card for paper surfaces. The artwork varies per story; the text block is always the same,
 * so the publication stays recognizable. The whole card is one link, named by the title.
 */
export function EditorialCard({
  format,
  title,
  href,
  dek,
  meta,
  art,
  className,
}: EditorialCardProps) {
  return (
    <article className={cx('group relative', className)}>
      <div className="relative">{art}</div>
      <div className="grid max-w-[34rem] gap-2 pt-6">
        <p className="type-label text-accent">{format}</p>
        <h3 className="type-card m-0">
          <a
            href={href}
            className="no-underline decoration-pink decoration-[3px] underline-offset-[0.12em] group-hover:underline after:absolute after:inset-0 after:z-10 focus-visible:underline"
          >
            {title}
          </a>
        </h3>
        {dek && <p className="type-lead max-w-[46ch] text-fg-soft">{dek}</p>}
        {meta && <p className="type-meta text-fg-soft">{meta}</p>}
      </div>
    </article>
  )
}

/** The frame most story art sits in: a field of ink or blue with a halftone corner. */
export function ArtPanel({
  tone = 'ink',
  className,
  children,
}: {
  tone?: 'ink' | 'blue'
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cx(
        'relative overflow-visible text-paper',
        tone === 'ink' ? 'bg-ink' : 'rounded-[2.1rem] border-[10px] border-ink bg-blue',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cx(
          'halftone pointer-events-none absolute inset-0 [--halftone-size:12px]',
          tone === 'ink'
            ? 'opacity-55 [--halftone-color:var(--color-blue)] mask-[radial-gradient(circle_at_74%_38%,#000_0_18%,transparent_58%)]'
            : 'rounded-[1.5rem] [--halftone-color:var(--color-pink)] mask-[radial-gradient(circle_at_100%_100%,#000_0_12%,transparent_46%)]',
        )}
      />
      {children}
    </div>
  )
}
