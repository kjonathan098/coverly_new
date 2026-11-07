import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { loggedInHandlers, type MockAccount } from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'

const NIGHT_BUS = songFixtures[4]!._id
const GLASS_HOUSES = songFixtures[2]!._id
const GONE = 'gone00000000000000000001'
const MIX = 'mix000000000000000000001'

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function logIn(account: Partial<MockAccount> = {}) {
  const full: MockAccount = { favorites: [], playlists: [], ...account }
  server.use(...loggedInHandlers(full))
  return full
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('Your Library', () => {
  it('asks guests to log in', async () => {
    renderAt('/library')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Your Library' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Log in with Google' })).toBeInTheDocument()
  })

  it('shows Favorites first, then playlists, and creates a playlist', async () => {
    const account = logIn({
      favorites: [NIGHT_BUS],
      playlists: [{ _id: MIX, name: 'Late night', songs: [GLASS_HOUSES, NIGHT_BUS] }],
    })
    const router = renderAt('/library')
    const library = await screen.findByRole('list', { name: 'Your Library' })
    await waitFor(() => expect(within(library).getAllByRole('link')).toHaveLength(2))
    const [favorites, mix] = within(library).getAllByRole('link')
    expect(favorites).toHaveTextContent('Favorites1 cover')
    expect(favorites).toHaveAttribute('href', '/library/favorites')
    expect(mix).toHaveTextContent('Late nightPlaylist · 2 covers')

    fireEvent.change(screen.getByLabelText('New playlist'), { target: { value: '  Road trip ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(within(library).getAllByRole('link')).toHaveLength(3))
    expect(within(library).getAllByRole('link')[1]).toHaveTextContent('Road trip')
    expect(account.playlists!.map((p) => p.name)).toEqual(['Road trip', 'Late night'])

    fireEvent.click(within(library).getAllByRole('link')[2]!)
    expect(router.state.location.pathname).toBe(`/library/playlists/${MIX}`)
  })
})

describe('a playlist page', () => {
  it('lists its covers in order, removes them (even ones gone from the catalog), and keeps the music playing', async () => {
    const account = logIn({
      playlists: [{ _id: MIX, name: 'Late night', songs: [GLASS_HOUSES, GONE, NIGHT_BUS] }],
    })
    const router = renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()

    await act(() => router.navigate(`/library/playlists/${MIX}`))
    expect(await screen.findByRole('heading', { level: 1, name: 'Late night' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Playlist covers' })
    const rows = () => Array.from(list.children) as HTMLElement[]
    expect(rows()).toHaveLength(3)
    expect(within(rows()[0]!).getByRole('article')).toHaveAccessibleName(
      'Glass Houses, covered by The Tidewater Choir',
    )
    expect(rows()[1]).toHaveTextContent('This cover is no longer in the catalog.')

    fireEvent.click(within(rows()[1]!).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(rows()).toHaveLength(2))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove Glass Houses by The Tidewater Choir from Late night',
      }),
    )
    await waitFor(() => expect(rows()).toHaveLength(1))
    await waitFor(() => expect(account.playlists![0]!.songs).toEqual([NIGHT_BUS]))

    // Playing from the playlist uses the same player.
    expect(within(rows()[0]!).getByRole('button', { name: /^Pause Night Bus/ })).toBeInTheDocument()
    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.calls).toEqual([])
  })

  it('renames, and deletes after a confirmation', async () => {
    const account = logIn({ playlists: [{ _id: MIX, name: 'Late night', songs: [] }] })
    const router = renderAt(`/library/playlists/${MIX}`)
    await screen.findByRole('heading', { level: 1, name: 'Late night' })
    expect(screen.getByText(/No covers here yet/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    fireEvent.change(screen.getByLabelText('Playlist name'), { target: { value: 'After hours' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'After hours' }),
    ).toBeInTheDocument()
    expect(account.playlists![0]!.name).toBe('After hours')

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete playlist' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/library'))
    expect(account.playlists).toEqual([])
  })

  it('says so when the playlist doesn’t exist or isn’t yours', async () => {
    logIn()
    renderAt('/library/playlists/someoneelse0000000000001')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Playlist not found' }),
    ).toBeInTheDocument()
  })
})
