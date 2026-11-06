import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { loggedInHandlers } from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'
import { safeReturnPath } from './returnPath'
import { AUTH_CHANNEL } from './session'

function renderAt(url: string) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [url] })} />
    </QueryClientProvider>,
  )
}

const header = () => screen.getByRole('banner')

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

/** What the popup's completion page (public/auth-complete.html) sends when Google login ends. */
function finishPopupLogin(status: 'success' | 'failed') {
  const channel = new BroadcastChannel(AUTH_CHANNEL)
  channel.postMessage({ type: 'coverly:auth', status })
  channel.close()
}

async function startPlaying() {
  await screen.findByText('All 6 covers')
  fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
  await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
  return livePlayer()
}

function expectPlayerUntouched(instance: ReturnType<typeof livePlayer>) {
  expect(FakePlayer.instances).toEqual([instance])
  expect(instance.calls).toEqual([])
  expect(instance.iframe.isConnected).toBe(true)
}

describe('safeReturnPath', () => {
  it('keeps Coverly routes with their search', () => {
    expect(safeReturnPath('/discover?mood=dreamy&genre=pop')).toBe(
      '/discover?mood=dreamy&genre=pop',
    )
    expect(safeReturnPath('/')).toBe('/')
  })

  it('falls back to the homepage for anything that could leave the site', () => {
    for (const path of [
      '@evil.example',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '',
      'discover',
      '/a\nb',
      `/${'x'.repeat(2000)}`,
    ])
      expect(safeReturnPath(path)).toBe('/')
  })
})

describe('the account control', () => {
  it('offers guests a Google login that returns to the same route', async () => {
    renderAt('/discover?mood=dreamy')
    const login = await within(header()).findByRole('link', { name: 'Log in' })
    expect(login).toHaveAttribute(
      'href',
      `${apiUrl('/api/auth/google')}?from=${encodeURIComponent('/discover?mood=dreamy')}`,
    )
    expect(within(header()).queryByRole('button', { name: /Log out/ })).toBeNull()
    // Guests browse as before.
    expect(await screen.findByText('3 covers match')).toBeInTheDocument()
  })

  it('logs in through a Google popup, in place, without touching the player', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ focus: vi.fn() } as unknown as Window)
    renderAt('/discover')
    const instance = await startPlaying()

    const login = await within(header()).findByRole('link', { name: 'Log in' })
    expect(fireEvent.click(login)).toBe(false) // the popup replaces the page navigation
    expect(open).toHaveBeenCalledWith(
      `${apiUrl('/api/auth/google')}?from=%2Fdiscover&mode=popup`,
      'coverly-login',
      expect.stringContaining('popup'),
    )

    server.use(...loggedInHandlers())
    finishPopupLogin('success')
    expect(await within(header()).findByText('Rae Moreno')).toBeInTheDocument()
    expectPlayerUntouched(instance)
  })

  it('falls back to the full-page login when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    renderAt('/discover?mood=dreamy')
    const login = await within(header()).findByRole('link', { name: 'Log in' })
    // Not prevented: the browser follows the link, which returns to /discover?mood=dreamy.
    expect(fireEvent.click(login)).toBe(true)
  })

  it('stays a guest when the popup login is canceled or fails', async () => {
    vi.spyOn(window, 'open').mockReturnValue({ focus: vi.fn() } as unknown as Window)
    renderAt('/discover')
    const instance = await startPlaying()
    fireEvent.click(await within(header()).findByRole('link', { name: 'Log in' }))

    finishPopupLogin('failed')
    expect(await within(header()).findByText('Login didn’t finish.')).toHaveRole('status')
    expect(within(header()).getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(within(header()).queryByRole('button', { name: /Log out/ })).toBeNull()
    expectPlayerUntouched(instance)
  })

  it('ignores channel messages that aren’t a login result', async () => {
    server.use(...loggedInHandlers())
    renderAt('/')
    await within(header()).findByText('Rae Moreno')
    const channel = new BroadcastChannel(AUTH_CHANNEL)
    channel.postMessage({ type: 'coverly:auth', status: 'success', user: { name: 'Mallory' } })
    channel.postMessage('logged-in')
    channel.close()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(within(header()).queryByText('Mallory')).toBeNull()
  })

  it('shows the logged-in user, and logs out without touching the player', async () => {
    server.use(...loggedInHandlers())
    renderAt('/discover')
    const instance = await startPlaying()

    expect(await within(header()).findByText('Rae Moreno')).toBeInTheDocument()
    fireEvent.click(within(header()).getByRole('button', { name: 'Log out Rae Moreno' }))

    expect(await within(header()).findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(within(header()).queryByText('Rae Moreno')).toBeNull()
    expectPlayerUntouched(instance)
  })

  it('stays logged in and says so when logout fails', async () => {
    // The first matching handler wins, so the failing logout goes first.
    server.use(
      http.get(apiUrl('/api/auth/logout'), () => new HttpResponse(null, { status: 500 })),
      ...loggedInHandlers(),
    )
    renderAt('/')
    fireEvent.click(await within(header()).findByRole('button', { name: 'Log out Rae Moreno' }))
    expect(await within(header()).findByText('Couldn’t log out. Try again.')).toHaveRole('status')
    expect(within(header()).getByRole('button', { name: 'Log out Rae Moreno' })).toBeEnabled()
  })

  it('treats an unusable session check as a guest, and the page still works', async () => {
    server.use(http.get(apiUrl('/api/user/getUser'), () => HttpResponse.text('<html>')))
    renderAt('/discover')
    expect(await within(header()).findByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(await screen.findByText('All 6 covers')).toBeInTheDocument()
  })
})
