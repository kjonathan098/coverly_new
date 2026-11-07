import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'
import { AccountControl } from '../features/auth/AccountControl'
import { useCompletePendingFavorite } from '../features/favorites/useFavorites'
import { PlayerPanel } from '../features/player/PlayerPanel'
import { usePlayerLayout } from '../features/player/layouts'
import { PlayerLayoutToggle } from '../features/player/PlayerLayoutToggle'
import { usePlayback } from '../features/player/playback'
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
      data-shell="page"
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
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 py-1 tablet:gap-x-5">
          {import.meta.env.DEV && <PlayerLayoutToggle />}
          <nav aria-label="Main" className="flex gap-3 text-label font-medium tablet:gap-7">
            <NavLink to="/discover" className={({ isActive }) => navLink(isActive)}>
              Discover
            </NavLink>
            <NavLink to="/magazine" className={({ isActive }) => navLink(isActive)}>
              Magazine
            </NavLink>
            <NavLink to="/favorites" className={({ isActive }) => navLink(isActive)}>
              Favorites
            </NavLink>
          </nav>
          <AccountControl />
        </div>
      </Container>
    </Surface>
  )
}

function SiteFooter() {
  return (
    <Surface as="footer" tone="ink" grain data-shell="page" className="pt-8 pb-14">
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

/**
 * The application shell: the one layout around every route. It never unmounts during in-app
 * navigation, so the player it holds, outside the route outlet, keeps playing from page to page.
 * Only the content in <main> changes.
 *
 * Phones and tablets: the player floats over the bottom of the page, and the page gets bottom
 * padding (--player-inset) so nothing stays hidden under it. From 1536px: the player takes its own
 * column while something is loaded, and the page keeps the rest.
 */
export function AppShell() {
  // A guest's heart click, finished once they've logged in.
  useCompletePendingFavorite()
  const open = usePlayback().song !== null
  const layout = usePlayerLayout()
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-paper focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      {open && (
        <a
          href="#now-playing"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-paper focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to the player
        </a>
      )}
      <SiteHeader />
      <div className={cx(open && layout.shell)}>
        <div className="min-w-0 pb-(--player-inset,0px)">
          {/* data-shell="page": what a full-screen sheet makes inert. The player is never marked. */}
          <main id="main" data-shell="page">
            <Outlet />
          </main>
          <SiteFooter />
        </div>
        <PlayerPanel />
      </div>
      {/* New pages start at the top; Back and Forward return to where the reader was. */}
      <ScrollRestoration />
    </>
  )
}
