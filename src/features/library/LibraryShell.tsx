import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowIcon, Button, Container, Surface } from '../../ui'

/** The frame of every Your Library page: the heading, a short count, and a way back to the Library. */
export function LibraryShell({
  title,
  meta,
  back = { to: '/library', label: 'Your Library' },
  actions,
  children,
}: {
  title: string
  meta?: ReactNode
  /** The link above the title: "Your Library" by default; false for none. */
  back?: false | { to: string; label: string }
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Surface
      as="section"
      tone="ink"
      grain
      aria-labelledby="library-title"
      className="min-h-[70vh] pb-16"
    >
      <Container className="grid gap-1 pt-5">
        {back && (
          <Link
            to={back.to}
            className="type-meta inline-flex w-max items-center gap-1 font-semibold text-fg-soft no-underline hover:text-fg"
          >
            <ArrowIcon className="size-4 -scale-x-100" />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 id="library-title" className="type-card m-0 min-w-0 [overflow-wrap:anywhere]">
            {title}
          </h1>
          {meta && <p className="type-meta m-0 text-fg-soft">{meta}</p>}
        </div>
        {actions}
      </Container>
      <Container className="mt-6">{children}</Container>
    </Surface>
  )
}

/** A failed load, with a retry. */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="grid justify-items-start gap-4">
      <p className="type-card m-0">{what} didn’t load.</p>
      <Button onClick={onRetry}>Try again</Button>
    </div>
  )
}
