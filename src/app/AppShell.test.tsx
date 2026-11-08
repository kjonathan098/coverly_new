import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiUrl } from '../lib/api'
import { createQueryClient } from '../lib/queryClient'
import { songFixtures } from '../mocks/fixtures/songs'
import { server } from '../mocks/server'
import { FakePlayer, livePlayer } from '../test/fakeYouTube'
import { routes } from './routes'

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

/** Seven copies of the first fixture, so the homepage has collections to play from. */
function serveLargerCatalog() {
  const [base] = songFixtures
  const catalog = Array.from({ length: 7 }, (_, i) => ({
    ...base,
    _id: `repeat${i}`,
    title: `repeat song ${i + 1}`,
    links: [{ url: `https://youtu.be/REPEAT0000${i}`, platform: 'youtube', timeStamp: 0 }],
  }))
  server.use(
    http.get(apiUrl('/api/songs/all-songs'), () =>
      HttpResponse.json({ success: true, message: [...catalog, ...songFixtures] }),
    ),
  )
}

const player = () => screen.getByRole('complementary', { name: 'Now playing' })

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('the app shell’s player', () => {
  it('keeps the same recording playing, in the same iframe, through every kind of navigation', async () => {
    const router = renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    const iframe = instance.iframe

    const stillPlaying = async (where: string) => {
      expect(router.state.location.pathname + router.state.location.search).toBe(where)
      expect(iframe.isConnected).toBe(true)
      expect([...document.querySelectorAll('iframe')]).toEqual([iframe])
      expect(FakePlayer.instances).toEqual([instance])
      expect(instance.destroyed).toBe(false)
      // No reload, no re-load of the video, no pause: YouTube was never told anything.
      expect(instance.calls).toEqual([])
      expect(within(player()).getByText('Night Bus')).toBeInTheDocument()
    }

    await act(() => router.navigate('/'))
    await screen.findByRole('heading', { level: 1, name: 'Coverly' })
    await stillPlaying('/')

    await act(() => router.navigate('/discover?mood=dreamy'))
    await screen.findByText('3 covers match')
    await stillPlaying('/discover?mood=dreamy')

    await act(() => router.navigate(-1))
    await stillPlaying('/')
    await act(() => router.navigate(1))
    await stillPlaying('/discover?mood=dreamy')

    await act(() => router.navigate('/no-such-page'))
    expect(
      await screen.findByRole('heading', { name: 'There’s no page here.' }),
    ).toBeInTheDocument()
    await stillPlaying('/no-such-page')

    await act(() => router.navigate('/design'))
    await screen.findByRole('heading', { name: 'Recording tiles' })
    await stillPlaying('/design')
  })

  it('replaces the recording from any page, and shows it as current everywhere', async () => {
    serveLargerCatalog()
    const router = renderAt('/discover')
    await screen.findByText('All 13 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()

    // On the Magazine, the carousel's first cover goes into the same player.
    await act(() => router.navigate('/magazine'))
    const carousel = await screen.findByRole('region', { name: 'Featured collections' })
    const [slide] = within(carousel).getAllByRole('group', { hidden: true })
    fireEvent.click(
      within(slide!).getByRole('button', { name: 'Play song: Repeat Song 1 by Mara Quill' }),
    )
    await waitFor(() => expect(instance.calls).toEqual(['load REPEAT00000']))
    expect(FakePlayer.instances).toEqual([instance])
    expect(within(player()).getByText('Repeat Song 1')).toBeInTheDocument()
    expect(
      await within(slide!).findByRole('button', {
        name: 'Pause song: Repeat Song 1 by Mara Quill',
      }),
    ).toBeInTheDocument()

    // Back in Discover, the list knows what's playing without being told.
    await act(() => router.navigate('/discover'))
    await screen.findByText('All 13 covers')
    expect(screen.getByRole('article', { current: true })).toHaveAccessibleName(
      'Repeat Song 1, covered by Mara Quill',
    )
    expect(
      screen.getByRole('button', { name: 'Pause Repeat Song 1 by Mara Quill' }),
    ).toBeInTheDocument()
  })

  it('opens Discover from the player’s tags and a profile from its names, without interrupting playback', async () => {
    const router = renderAt('/discover?mood=dreamy')
    await screen.findByText('3 covers match')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    await act(() => router.navigate('/'))
    await screen.findByRole('heading', { level: 1, name: 'Coverly' })

    fireEvent.click(within(player()).getByRole('link', { name: 'Cover genre: Pop' }))
    await waitFor(() => expect(router.state.location.search).toBe('?genre=pop'))
    expect(router.state.location.pathname).toBe('/discover')
    expect(await screen.findByText('3 covers match')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Cover genre: Pop' })).toBeInTheDocument()

    // An artist's name opens their profile.
    const mara = (songFixtures[4]!.artist.original[0] as { _id: string })._id
    fireEvent.click(within(player()).getByRole('link', { name: 'Mara Quill, original artist' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/artists/${mara}`))
    expect(await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })).toBeInTheDocument()

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?genre=pop')
    await act(() => router.navigate(-1))
    expect(router.state.location.pathname).toBe('/')

    // Same player throughout: never re-created, reloaded or told to change.
    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.calls).toEqual([])
    expect(instance.iframe.isConnected).toBe(true)
  })

  it('stays closed after Close, on every page', async () => {
    const router = renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    fireEvent.click(within(player()).getByRole('button', { name: 'Close player' }))
    await act(() => router.navigate('/'))
    await screen.findByRole('heading', { level: 1, name: 'Coverly' })
    expect(screen.queryByRole('complementary', { name: 'Now playing' })).toBeNull()
    expect(document.querySelector('iframe')).toBeNull()
    expect(FakePlayer.instances.every((p) => p.destroyed)).toBe(true)
  })

  it('offers a skip link to the player while one is loaded', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    expect(screen.queryByRole('link', { name: 'Skip to the player' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    expect(screen.getByRole('link', { name: 'Skip to the player' })).toHaveAttribute(
      'href',
      '#now-playing',
    )
  })
})
