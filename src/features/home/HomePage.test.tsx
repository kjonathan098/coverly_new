import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'

function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const section = (name: string) => screen.getByRole('region', { name })

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

describe('Home', () => {
  it('welcomes, then explores real covers with their original artists', async () => {
    renderHome()
    expect(screen.getByRole('heading', { level: 1, name: 'Coverly' })).toBeInTheDocument()
    const explore = await screen.findByRole('region', { name: 'Explore covers' })
    const cards = within(explore).getAllByRole('article')
    // The fixture without a video isn't picked; the other five are.
    expect(cards).toHaveLength(5)
    expect(within(explore).getAllByText('Original').length).toBe(5)
    expect(within(explore).getByRole('link', { name: /^See all 6/ })).toHaveAttribute(
      'href',
      '/discover',
    )
  })

  it('opens Discover on a real mood, as a fresh filter', async () => {
    const router = renderHome()
    const moods = await screen.findByRole('region', { name: 'Discover by mood' })
    const tiles = within(moods).getAllByRole('link', { name: /^Mood: / })
    expect(tiles.map((t) => t.getAttribute('aria-label'))).toEqual([
      'Mood: Dreamy, 3 covers',
      'Mood: Soulful, 3 covers',
      'Mood: Nostalgic, 2 covers',
    ])
    fireEvent.click(tiles[0]!)
    await waitFor(() => expect(router.state.location.search).toBe('?mood=dreamy'))
    expect(router.state.location.pathname).toBe('/discover')
  })

  it('hides "Same song, different voices" when no song is covered twice', async () => {
    renderHome()
    await screen.findByRole('region', { name: 'Explore covers' })
    expect(screen.queryByRole('region', { name: 'Same song, different voices' })).toBeNull()
  })

  it('pairs two voices on the same song, and plays either in the shared player', async () => {
    const nightBus = songFixtures.find((s) => s.title === 'night bus')!
    const secondVoice = {
      ...nightBus,
      _id: 'night-bus-2',
      artist: { ...nightBus.artist, coverArtist: [{ _id: 'x1', name: 'Second Voice' }] },
      links: [{ url: 'https://youtu.be/SECONDVOIC1', platform: 'youtube', timeStamp: 0 }],
    }
    server.use(
      http.get(apiUrl('/api/songs/all-songs'), () =>
        HttpResponse.json({ success: true, message: [...songFixtures, secondVoice] }),
      ),
    )
    renderHome()
    const same = await screen.findByRole('region', { name: 'Same song, different voices' })
    const pair = within(same).getByRole('article', { name: 'Night Bus' })
    fireEvent.click(within(pair).getByRole('button', { name: 'Play Night Bus by Second Voice' }))
    await waitFor(() => expect(livePlayer().videoId).toBe('SECONDVOIC1'))
    expect(
      within(pair).getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }),
    ).toBeInTheDocument()
  })

  it('The Cover Machine shows a real cover, plays it, and deals another on Surprise me', async () => {
    renderHome()
    const machine = await screen.findByRole('region', { name: 'The Cover Machine' })
    const playButton = await within(machine).findByRole('button', { name: /^Play / })
    const first = playButton.getAttribute('aria-label')!
    expect(within(machine).getByText('(Cover)')).toBeInTheDocument()
    expect(within(machine).getByText(/^Original by/)).toBeInTheDocument()

    // Surprise swaps the song but never starts playback.
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    fireEvent.click(within(machine).getByRole('button', { name: 'Surprise me' }))
    random.mockRestore()
    const second = within(machine)
      .getByRole('button', { name: /^Play / })
      .getAttribute('aria-label')!
    expect(second).not.toBe(first)
    expect(FakePlayer.instances).toHaveLength(0)
    expect(within(machine).getByText(/^Now showing /)).toBeInTheDocument()

    // Play hands it to the shared player, and the button becomes Pause.
    fireEvent.click(within(machine).getByRole('button', { name: second }))
    await waitFor(() => expect(FakePlayer.instances).toHaveLength(1))
    expect(livePlayer().iframe.isConnected).toBe(true)
    expect(
      await within(machine).findByRole('button', { name: second.replace(/^Play/, 'Pause') }),
    ).toBeInTheDocument()
  })

  it('invites to the Magazine', async () => {
    renderHome()
    expect(
      within(section('Beyond the covers.')).getByRole('link', {
        name: 'Open the Magazine',
      }),
    ).toHaveAttribute('href', '/magazine')
  })

  it('offers a retry when the catalog does not load', async () => {
    server.use(
      http.get(apiUrl('/api/songs/all-songs'), () =>
        HttpResponse.json({ success: true, message: 'oops' }),
      ),
    )
    renderHome()
    expect(await screen.findByRole('alert')).toHaveTextContent('The catalog didn’t load.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
