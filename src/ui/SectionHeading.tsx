import type { ReactNode } from 'react'
import { cx } from './cx'

type SectionHeadingProps = {
  title: ReactNode
  /** A content type or area name, such as "Originals & covers". Only when it tells the reader something. */
  label?: string
  /** One or two sentences. Sits beside the title on desktop and under it on phones. */
  intro?: ReactNode
  id?: string
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

export function SectionHeading({
  title,
  label,
  intro,
  id,
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cx(
        'mb-10 grid gap-y-3 desktop:grid-cols-12 desktop:items-end desktop:gap-x-gutter',
        className,
      )}
    >
      {label && <p className="type-label text-accent desktop:col-span-12">{label}</p>}
      <Heading id={id} className="type-section m-0 desktop:col-span-7">
        {title}
      </Heading>
      {intro && (
        <div className="type-lead max-w-[44ch] text-fg-soft desktop:col-span-4 desktop:col-start-8">
          {intro}
        </div>
      )}
    </header>
  )
}
