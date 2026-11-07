import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'
import { parseSong } from './contract'
import { SongCard } from './SongCard'

function renderHome() {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('a song card', () => {
  it('is played and paused through its artwork, its only button, in the shared player', async () => {
    const router = renderHome()
    const explore = await screen.findByRole('region', { name: 'Explore covers' })
    const cards = await within(explore).findAllByRole('article')

    for (const card of cards) {
      // One button per card: the artwork. The title and artists are not inside it.
      const [button, ...others] = within(card).getAllByRole('button')
      expect(others).toEqual([])
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAccessibleName(/^Play .+ by .+/)
      expect(button!.querySelector('img')).not.toBeNull()
      expect(button!.contains(card.querySelector('h3'))).toBe(false)
    }

    const artwork = within(explore).getByRole('button', {
      name: 'Play Night Bus by The Tidewater Choir',
    })
    fireEvent.click(artwork)
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    expect(
      within(screen.getByRole('complementary', { name: 'Now playing' })).getByText('Night Bus'),
    ).toBeInTheDocument()
    // Now playing: the same button pauses, and the artwork carries the badge.
    await waitFor(() =>
      expect(artwork).toHaveAccessibleName('Pause Night Bus by The Tidewater Choir'),
    )
    expect(within(artwork).getByText('Playing')).toBeInTheDocument()

    fireEvent.click(artwork)
    await waitFor(() =>
      expect(artwork).toHaveAccessibleName('Resume Night Bus by The Tidewater Choir'),
    )
    expect(instance.calls).toEqual(['pause'])
    expect(within(artwork).getByText('Paused')).toBeInTheDocument()

    // Leaving the page doesn't touch the player.
    await act(() => router.navigate('/discover'))
    await screen.findByText(/All \d+ covers/)
    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.calls).toEqual(['pause'])
  })

  it('without a video, has no button and says so', () => {
    const song = parseSong(songFixtures.find((s) => s.title === 'no link yet'))!
    render(
      <MemoryRouter>
        <SongCard song={song} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('No video')).toBeInTheDocument()
  })
})
