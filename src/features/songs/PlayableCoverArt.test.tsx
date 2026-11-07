import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { loggedInHandlers } from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'

const PLAYBACK = /^(Play|Pause|Resume|Replay|Retry) /

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const results = () => screen.getByRole('list', { name: 'Results' })
const row = (name: string) => within(results()).getByRole('article', { name })

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('artwork as the play button', () => {
  it('in Discover rows: one playback button per row, the artwork; it plays and toggles pause/resume', async () => {
    renderAt('/discover')
    await screen.findByText(/All \d+ covers/)
    for (const article of within(results()).getAllByRole('article')) {
      const playback = within(article)
        .queryAllByRole('button')
        .filter((b) => PLAYBACK.test(b.getAttribute('aria-label') ?? ''))
      if (article.getAttribute('aria-label')!.startsWith('No Link Yet')) {
        // No video: plain artwork, labelled, not a button.
        expect(playback).toEqual([])
        expect(within(article).getByText('No video')).toBeInTheDocument()
      } else {
        expect(playback).toHaveLength(1)
        expect(playback[0]!.querySelector('img')).not.toBeNull()
      }
    }

    const nightBus = row('Night Bus, covered by The Tidewater Choir')
    const artwork = within(nightBus).getByRole('button', {
      name: 'Play Night Bus by The Tidewater Choir',
    })
    fireEvent.click(artwork)
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    await waitFor(() =>
      expect(artwork).toHaveAccessibleName('Pause Night Bus by The Tidewater Choir'),
    )
    expect(nightBus).toHaveAttribute('aria-current', 'true')
    expect(within(nightBus).getByText('Playing')).toBeInTheDocument()

    fireEvent.click(artwork)
    await waitFor(() =>
      expect(artwork).toHaveAccessibleName('Resume Night Bus by The Tidewater Choir'),
    )
    fireEvent.click(artwork)
    await waitFor(() =>
      expect(artwork).toHaveAccessibleName('Pause Night Bus by The Tidewater Choir'),
    )
    expect(instance.calls).toEqual(['pause', 'play'])
    expect(FakePlayer.instances).toEqual([instance])
  })

  it('in Discover rows: Details, tags and artist names never start playback', async () => {
    const router = renderAt('/discover')
    await screen.findByText(/All \d+ covers/)
    const glass = row('Glass Houses, covered by The Tidewater Choir')

    fireEvent.click(within(glass).getByRole('button', { name: /^Details/ }))
    expect(within(glass).getByRole('button', { name: /^Details/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    fireEvent.click(within(glass).getByRole('link', { name: 'Cover genre: Pop' }))
    await waitFor(() => expect(router.state.location.search).toBe('?genre=pop'))
    fireEvent.click(
      within(row('Glass Houses, covered by The Tidewater Choir')).getByRole('link', {
        name: /The Tidewater Choir/,
      }),
    )
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/artists\//))

    expect(FakePlayer.instances).toEqual([])
    expect(screen.queryByRole('complementary', { name: 'Now playing' })).toBeNull()
  })

  it('in Home’s same-song pairs: each take’s artwork plays it; its artist link doesn’t', async () => {
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
    const router = renderAt('/')
    const same = await screen.findByRole('region', { name: 'Same song, different voices' })
    const pair = within(same).getByRole('article', { name: 'Night Bus' })
    const playback = within(pair)
      .getAllByRole('button')
      .filter((b) => PLAYBACK.test(b.getAttribute('aria-label') ?? ''))
    expect(playback).toHaveLength(2)
    for (const button of playback) expect(button.querySelector('img')).not.toBeNull()

    fireEvent.click(within(pair).getByRole('button', { name: 'Play Night Bus by Second Voice' }))
    await waitFor(() => expect(livePlayer().videoId).toBe('SECONDVOIC1'))
    const instance = livePlayer()

    fireEvent.click(within(pair).getByRole('link', { name: /Second Voice/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/artists/x1'))
    expect(instance.calls).toEqual([])
  })

  it('in a playlist: the artwork plays, and Remove doesn’t', async () => {
    const account = {
      favorites: [],
      playlists: [
        {
          _id: 'mix000000000000000000001',
          name: 'Late night',
          songs: [songFixtures[2]!._id, songFixtures[4]!._id],
        },
      ],
    }
    server.use(...loggedInHandlers(account))
    renderAt('/library/playlists/mix000000000000000000001')
    const list = await screen.findByRole('list', { name: 'Playlist covers' })

    fireEvent.click(
      within(list).getByRole('button', {
        name: 'Remove Glass Houses by The Tidewater Choir from Late night',
      }),
    )
    await waitFor(() => expect(account.playlists[0]!.songs).toEqual([songFixtures[4]!._id]))
    expect(FakePlayer.instances).toEqual([])

    await act(async () =>
      fireEvent.click(
        within(list).getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }),
      ),
    )
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
  })
})
