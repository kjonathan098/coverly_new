import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { Container, Surface, Wordmark, cx } from '../ui'

// A pink underline that draws in on hover, and stays drawn for the current page.
const navLink = (current = false) =>
  cx(
    'bg-[linear-gradient(var(--color-pink),var(--color-pink))] bg-bottom-left bg-no-repeat py-2 no-underline transition-[background-size] duration-(--duration-base)',
    current ? 'bg-size-[100%_2px]' : 'bg-size-[0%_2px] hover:bg-size-[100%_2px]',
  )

function SiteHeader() {
  return (
    <Surface
      as="header"
      tone="ink"
      className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--color-ink)_92%,transparent)] backdrop-blur-md"
    >
      <Container size="full" className="flex min-h-14 items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <Link to="/" className="no-underline" aria-label="Coverly home">
            <Wordmark />
          </Link>
          <p className="m-0 hidden text-meta text-fg-soft italic desktop:block">
            Every song has another side
          </p>
        </div>
        <nav aria-label="Main" className="flex gap-4 text-label font-medium tablet:gap-7">
          <NavLink to="/discover" className={({ isActive }) => navLink(isActive)}>
            Discover
          </NavLink>
          <Link to={{ pathname: '/', hash: '#moods' }} className={navLink()}>
            Moods
          </Link>
          <Link to={{ pathname: '/', hash: '#artists' }} className={navLink()}>
            Artists
          </Link>
        </nav>
      </Container>
    </Surface>
  )
}

function SiteFooter() {
  return (
    <Surface as="footer" tone="ink" grain className="pt-8 pb-14">
      <Container size="full" className="grid gap-3 tablet:grid-cols-2 tablet:items-end">
        <p className="type-wordmark m-0 text-[clamp(3rem,8vw,6rem)]">Coverly</p>
        <div className="text-fg-soft tablet:text-right">
          <p className="italic">Every song has another side.</p>
          <p className="type-meta mt-1">Covers play from YouTube.</p>
        </div>
      </Container>
    </Surface>
  )
}

/** Header, footer and scroll handling shared by the site's pages. */
export function SiteLayout() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-paper focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
      {/* New pages start at the top; Back and Forward return to where the reader was. */}
      <ScrollRestoration />
    </>
  )
}
