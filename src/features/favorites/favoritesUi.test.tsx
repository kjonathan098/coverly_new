import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { loggedInHandlers, type MockAccount } from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'
import { AUTH_CHANNEL } from '../auth/session'

const NIGHT_BUS = songFixtures[4]!._id
const GLASS_HOUSES = songFixtures[2]!._id
const GONE = 'gone00000000000000000001'

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function logIn(favorites: string[] = []) {
  const account: MockAccount = { favorites }
  server.use(...loggedInHandlers(account))
  return account
}

function finishPopupLogin(status: 'success' | 'failed') {
  const channel = new BroadcastChannel(AUTH_CHANNEL)
  channel.postMessage({ type: 'coverly:auth', status })
  channel.close()
}

const player = () => screen.getByRole('complementary', { name: 'Now playing' })
const heart = (scope: HTMLElement, name: string) => within(scope).getByRole('button', { name })

async function playNightBus() {
  await screen.findByText(/covers? match|All \d+ covers/)
  fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
  await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
  return livePlayer()
}

function expectPlayerUntouched(instance: ReturnType<typeof livePlayer>) {
  expect(FakePlayer.instances).toEqual([instance])
  expect(instance.calls).toEqual([])
  expect(instance.iframe.isConnected).toBe(true)
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('the heart in Now Playing', () => {
  it('favorites the playing cover; Favorites agrees and removes it from its row; the music never stops', async () => {
    const account = logIn()
    const router = renderAt('/discover')
    const instance = await playNightBus()
    const playerHeart = await waitFor(() => {
      const button = heart(player(), 'Favorite Night Bus by The Tidewater Choir')
      expect(button).toBeEnabled()
      return button
    })
    expect(playerHeart).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(playerHeart)
    await waitFor(() => expect(playerHeart).toHaveAttribute('aria-pressed', 'true'))
    await waitFor(() => expect(account.favorites).toEqual([NIGHT_BUS]))

    await act(() => router.navigate('/favorites'))
    const list = await screen.findByRole('list', { name: 'Favorite covers' })
    expect(within(list).getByRole('article')).toHaveAccessibleName(
      'Night Bus, covered by The Tidewater Choir',
    )

    // Remove it from its row: it leaves the page, and the player's heart empties.
    fireEvent.click(
      within(list).getByRole('button', {
        name: 'Remove Night Bus by The Tidewater Choir from Favorites',
      }),
    )
    expect(await screen.findByText('No favorites yet.')).toBeInTheDocument()
    await waitFor(() => expect(account.favorites).toEqual([]))
    expect(playerHeart).toHaveAttribute('aria-pressed', 'false')

    expectPlayerUntouched(instance)
  })

  it('a guest’s heart opens the Google popup, and the favorite is saved after login', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ focus: vi.fn() } as unknown as Window)
    renderAt('/discover')
    const instance = await playNightBus()
    const guestHeart = await within(player()).findByRole('button', {
      name: 'Log in to favorite Night Bus by The Tidewater Choir',
    })
    expect(guestHeart).not.toHaveAttribute('aria-pressed')

    fireEvent.click(guestHeart)
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/google?from=%2Fdiscover&mode=popup'),
      'coverly-login',
      expect.any(String),
    )

    const account = logIn()
    const puts = vi.fn()
    server.events.on('request:start', ({ request }) => request.method === 'PUT' && puts())
    finishPopupLogin('success')

    // Several steps (login message → session re-check → the saved click's PUT): allow for a busy run.
    await waitFor(() => expect(account.favorites).toEqual([NIGHT_BUS]), { timeout: 3000 })
    const userHeart = await within(player()).findByRole('button', {
      name: 'Favorite Night Bus by The Tidewater Choir',
    })
    await waitFor(() => expect(userHeart).toHaveAttribute('aria-pressed', 'true'))
    expect(puts).toHaveBeenCalledTimes(1)
    expectPlayerUntouched(instance)
    server.events.removeAllListeners()
  })

  it('a canceled login drops the guest’s click', async () => {
    vi.spyOn(window, 'open').mockReturnValue({ focus: vi.fn() } as unknown as Window)
    renderAt('/discover')
    await playNightBus()
    fireEvent.click(
      await within(player()).findByRole('button', {
        name: 'Log in to favorite Night Bus by The Tidewater Choir',
      }),
    )
    finishPopupLogin('failed')
    await waitFor(() => expect(sessionStorage.length).toBe(0))

    // Logging in later doesn't add it.
    const account = logIn()
    finishPopupLogin('success')
    await within(player()).findByRole('button', {
      name: 'Favorite Night Bus by The Tidewater Choir',
    })
    expect(account.favorites).toEqual([])
  })

  it('is the only place for hearts and +: cards and Discover rows keep just Play', async () => {
    logIn([NIGHT_BUS])
    const router = renderAt('/')
    const explore = await screen.findByRole('region', { name: 'Explore covers' })
    await within(explore).findAllByRole('button', { name: /^Play / })
    expect(within(explore).queryAllByRole('button', { name: /Favorite|to a playlist/ })).toEqual([])

    await act(() => router.navigate('/discover'))
    const results = await screen.findByRole('list', { name: 'Results' })
    expect(within(results).getAllByRole('button', { name: /^Play / }).length).toBeGreaterThan(0)
    expect(
      within(results).queryAllByRole('button', { name: /Favorite|to a playlist|^Remove/ }),
    ).toEqual([])
  })
})

describe('the Favorites page', () => {
  it('moved into Your Library (/favorites redirects), and asks guests to log in', async () => {
    const router = renderAt('/favorites')
    expect(await screen.findByRole('button', { name: 'Log in with Google' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/library/favorites')
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library')
  })

  it('lists newest first, and lets a song that left the catalog be removed', async () => {
    const account = logIn([GLASS_HOUSES, GONE, NIGHT_BUS])
    renderAt('/favorites')
    const list = await screen.findByRole('list', { name: 'Favorite covers' })
    // Top-level rows only (rows hold their own tag lists).
    const items = Array.from(list.children) as HTMLElement[]
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByRole('article')).toHaveAccessibleName(
      'Night Bus, covered by The Tidewater Choir',
    )
    expect(items[1]).toHaveTextContent('This cover is no longer in the catalog.')

    fireEvent.click(within(items[1]!).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(list.children).toHaveLength(2))
    await waitFor(() => expect(account.favorites).toEqual([GLASS_HOUSES, NIGHT_BUS]))
  })

  it('clears the hearts at logout', async () => {
    logIn([NIGHT_BUS])
    renderAt('/favorites')
    await screen.findByRole('list', { name: 'Favorite covers' })
    fireEvent.click(screen.getByRole('button', { name: 'Log out Rae Moreno' }))
    expect(await screen.findByRole('button', { name: 'Log in with Google' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Favorite covers' })).toBeNull()
  })
})
