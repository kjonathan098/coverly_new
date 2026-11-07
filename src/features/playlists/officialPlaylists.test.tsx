import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import {
  loggedInHandlers,
  officialPlaylistHandlers,
  type MockAccount,
  type MockPlaylist,
} from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'

const NIGHT_BUS = songFixtures[4]!._id
const GLASS_HOUSES = songFixtures[2]!._id
const GONE = 'gone00000000000000000001'
const BEATLES = 'beatles00000000000000001'
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

const beatles = (): MockPlaylist => ({
  _id: BEATLES,
  name: 'The Beatles Covers',
  description: 'Fab four, new voices.',
  songs: [GLASS_HOUSES, GONE, NIGHT_BUS],
})

function logIn(account: Partial<MockAccount>) {
  const full: MockAccount = { favorites: [], playlists: [], official: [], ...account }
  server.use(...loggedInHandlers(full))
  return full
}

const player = () => screen.getByRole('complementary', { name: 'Now playing' })
const rows = () =>
  Array.from(screen.getByRole('list', { name: 'Playlist covers' }).children) as HTMLElement[]

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('a Coverly playlist, for guests and users', () => {
  it('opens by its URL for a guest, plays through the shared player, and offers no editing', async () => {
    server.use(...officialPlaylistHandlers([beatles()], () => 'guest'))
    renderAt(`/playlists/${BEATLES}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The Beatles Covers' }),
    ).toBeInTheDocument()
    expect(screen.getByText('By Coverly')).toBeInTheDocument()
    expect(screen.getByText('Fab four, new voices.')).toBeInTheDocument()
    expect(screen.getByText('Coverly playlist · 3 covers')).toBeInTheDocument()
    // The cover that left the catalog isn't shown to visitors.
    expect(rows()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Unpublish|Remove)/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    expect(within(player()).getByText('Night Bus')).toBeInTheDocument()
  })

  it('says so for an unknown id (including a personal playlist’s)', async () => {
    renderAt(`/playlists/${MIX}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Playlist not found' }),
    ).toBeInTheDocument()
  })

  it('Home shows “Playlists by Coverly” only when there are some', async () => {
    renderAt('/')
    await screen.findByRole('region', { name: 'Explore covers' })
    await waitFor(() => expect(screen.queryByText('Loading covers…')).toBeNull())
    expect(screen.queryByRole('region', { name: 'Playlists by Coverly' })).toBeNull()
  })

  it('Home lists them, linking to their page', async () => {
    server.use(...officialPlaylistHandlers([beatles()], () => 'guest'))
    renderAt('/')
    const section = await screen.findByRole('region', { name: 'Playlists by Coverly' })
    const link = within(section).getByRole('link', { name: /The Beatles Covers/ })
    expect(link).toHaveAttribute('href', `/playlists/${BEATLES}`)
    expect(link).toHaveTextContent('By Coverly')
  })

  it('a regular user gets no editing, no Publish, and no Coverly group in the modal', async () => {
    logIn({ official: [beatles()], playlists: [{ _id: MIX, name: 'Mine', songs: [] }] })
    const router = renderAt(`/playlists/${BEATLES}`)
    await screen.findByRole('heading', { level: 1, name: 'The Beatles Covers' })
    expect(screen.queryByRole('button', { name: /^(Edit|Delete|Unpublish|Remove)/ })).toBeNull()

    await act(() => router.navigate(`/library/playlists/${MIX}`))
    await screen.findByRole('heading', { level: 1, name: 'Mine' })
    expect(screen.getByText('Private playlist · 0 covers')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Publish as Coverly playlist' })).toBeNull()

    await act(() => router.navigate('/discover'))
    await screen.findByText(/All \d+ covers/)
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    fireEvent.click(
      await within(player()).findByRole('button', {
        name: 'Add Night Bus by The Tidewater Choir to a playlist',
      }),
    )
    const modal = await screen.findByRole('dialog', { name: 'Add to playlist' })
    await within(modal).findByRole('checkbox', { name: 'Mine' })
    expect(within(modal).queryByRole('list', { name: 'Coverly playlists' })).toBeNull()
    expect(within(modal).queryByRole('checkbox', { name: 'The Beatles Covers' })).toBeNull()
  })
})

describe('admins', () => {
  it('publish their own playlist (same id and songs), and the music keeps playing', async () => {
    const account = logIn({
      isAdmin: true,
      playlists: [{ _id: MIX, name: 'The Beatles Covers', songs: [GLASS_HOUSES, NIGHT_BUS] }],
    })
    const router = renderAt('/discover')
    await screen.findByText(/All \d+ covers/)
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()

    await act(() => router.navigate(`/library/playlists/${MIX}`))
    await screen.findByRole('heading', { level: 1, name: 'The Beatles Covers' })
    fireEvent.click(screen.getByRole('button', { name: 'Publish as Coverly playlist' }))
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/playlists/${MIX}`))
    expect(await screen.findByText('Coverly playlist · 2 covers')).toBeInTheDocument()
    expect(account.playlists).toEqual([])
    expect(account.official!.map((p) => [p._id, p.songs])).toEqual([
      [MIX, [GLASS_HOUSES, NIGHT_BUS]],
    ])

    await act(() => router.navigate('/'))
    const section = await screen.findByRole('region', { name: 'Playlists by Coverly' })
    expect(within(section).getByRole('link', { name: /The Beatles Covers/ })).toBeInTheDocument()

    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.calls).toEqual([])
    expect(instance.iframe.isConnected).toBe(true)
  })

  it('edit, remove covers from and unpublish a Coverly playlist they didn’t make', async () => {
    const account = logIn({ isAdmin: true, official: [beatles()] })
    const router = renderAt(`/playlists/${BEATLES}`)
    await screen.findByRole('heading', { level: 1, name: 'The Beatles Covers' })
    // Editors see the missing cover so they can tidy it up.
    expect(rows()).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Playlist name'), {
      target: { value: 'Beatles, Reborn' },
    })
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'New takes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Beatles, Reborn' }),
    ).toBeInTheDocument()
    expect(account.official![0]).toMatchObject({
      name: 'Beatles, Reborn',
      description: 'New takes.',
    })

    fireEvent.click(within(rows()[1]!).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(account.official![0]!.songs).toEqual([GLASS_HOUSES, NIGHT_BUS])

    fireEvent.click(screen.getByRole('button', { name: 'Unpublish' }))
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Unpublish' })).getByRole('button', {
        name: 'Unpublish',
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/library'))
    expect(account.official).toEqual([])
  })

  it('see a separate Coverly group in the modal and add the playing cover to it', async () => {
    const account = logIn({
      isAdmin: true,
      official: [beatles()],
      playlists: [{ _id: MIX, name: 'Mine', songs: [] }],
    })
    renderAt('/discover')
    await screen.findByText(/All \d+ covers/)
    fireEvent.click(screen.getByRole('button', { name: /^Play Low Tide by / }))
    fireEvent.click(
      await within(player()).findByRole('button', { name: /^Add Low Tide by .* to a playlist$/ }),
    )
    const modal = await screen.findByRole('dialog', { name: 'Add to playlist' })
    const coverly = await within(modal).findByRole('list', { name: 'Coverly playlists' })
    expect(within(modal).getByText('Coverly playlists · admin')).toBeInTheDocument()
    expect(within(modal).getByRole('list', { name: 'Your playlists' })).toBeInTheDocument()

    fireEvent.click(within(coverly).getByRole('checkbox', { name: 'The Beatles Covers' }))
    await waitFor(() => expect(account.official![0]!.songs).toContain(songFixtures[1]!._id))
    expect(account.playlists![0]!.songs).toEqual([])
  })
})
