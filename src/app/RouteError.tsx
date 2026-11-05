import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { Container, Surface, buttonClasses } from '../ui'

/**
 * Shown in place of a page that failed or doesn't exist. It renders inside the app shell, so the
 * header stays usable and a playing recording keeps playing.
 */
export function RouteError() {
  const error = useRouteError()
  const missing = isRouteErrorResponse(error) && error.status === 404
  if (import.meta.env.DEV && !missing) console.error(error)
  return (
    <Surface as="section" tone="ink" grain className="py-24">
      <Container className="grid justify-items-start gap-4">
        <h1 className="type-headline m-0">
          {missing ? 'There’s no page here.' : 'This page didn’t load.'}
        </h1>
        <p className="type-lead m-0 max-w-[44ch] text-fg-soft">
          {missing
            ? 'The link may be old or mistyped.'
            : 'Something went wrong while showing it. Anything that was playing is still playing.'}
        </p>
        <Link to="/" className={buttonClasses()}>
          Go to the homepage
        </Link>
      </Container>
    </Surface>
  )
}
