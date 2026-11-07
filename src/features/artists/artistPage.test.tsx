import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'

type Ref = { _id: string; name: string }
const credit = (title: string, role: 'coverArtist' | 'original', index = 0) =>
  (songFixtures.find((s) => s.title === title)!.artist[role][index] as Ref)._id
const MARA = credit('night bus', 'original') // covers three songs, and wrote Night Bus
const OFELIA = credit('Low Tide', 'coverArtist', 1) // with Mara on Low Tide
const TIDEWATER = credit('night bus', 'coverArtist')

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const section = (name: string) => screen.getByRole('region', { name })
const cards = (name: string) =>
  within(section(name))
    .getAllByRole('article')
    .map((card) => within(card).getByRole('heading', { level: 3 }).textContent)

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('an artist profile', () => {
  it('shows both roles in separate sections, with performance counts (for guests too)', async () => {
    renderAt(`/artists/${MARA}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })).toBeInTheDocument()
    const roles = screen.getByRole('list', { name: 'On Coverly' })
    expect(roles).toHaveTextContent('Cover artist3 covers performed')
    expect(roles).toHaveTextContent('Original artist1 cover of their songs')

    expect(cards('Covers by Mara Quill')).toEqual(['Low Tide', 'No Link Yet', 'Paper Lanterns'])
    expect(cards('Covers of songs by Mara Quill')).toEqual(['Night Bus'])
    // Discover's filters, one click away.
    expect(
      within(section('Covers by Mara Quill')).getByRole('link', {
        name: /Their covers in Discover/,
      }),
    ).toHaveAttribute('href', '/discover?artist=Mara+Quill')
    expect(
      within(section('Covers of songs by Mara Quill')).getByRole('link', {
        name: /Covers of their songs in Discover/,
      }),
    ).toHaveAttribute('href', '/discover?songBy=Mara+Quill')
  })

  it('a cover with two artists is on both profiles; a one-role artist gets one section', async () => {
    const router = renderAt(`/artists/${OFELIA}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ofelia Ruiz' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'On Coverly' })).toHaveTextContent(
      'Cover artist2 covers performed',
    )
    expect(screen.queryByText('Original artist')).toBeNull()
    expect(cards('Covers by Ofelia Ruiz')).toEqual(['Low Tide', 'Señales'])

    // Each name on Low Tide leads to its own artist, by id.
    const lowTide = within(section('Covers by Ofelia Ruiz')).getAllByRole('article')[0]!
    expect(within(lowTide).getByRole('link', { name: 'Mara Quill, cover artist' })).toHaveAttribute(
      'href',
      `/artists/${MARA}`,
    )
    expect(
      within(lowTide).getByRole('link', { name: 'Ofelia Ruiz, cover artist' }),
    ).toHaveAttribute('href', `/artists/${OFELIA}`)
    await act(() => router.navigate(`/artists/${MARA}`))
    expect(cards('Covers by Mara Quill')).toContain('Low Tide')
  })

  it('plays from its cards, and moving between profiles never touches the player; names never play', async () => {
    const router = renderAt(`/artists/${MARA}`)
    await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })

    // An artist link navigates without playing anything.
    const nightBus = within(section('Covers of songs by Mara Quill')).getByRole('article')
    fireEvent.click(
      within(nightBus).getByRole('link', { name: 'The Tidewater Choir, cover artist' }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'The Tidewater Choir' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/artists/${TIDEWATER}`)
    expect(FakePlayer.instances).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()

    await act(() => router.navigate(`/artists/${MARA}`))
    await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })
    expect(
      screen.getByRole('button', { name: 'Pause Night Bus by The Tidewater Choir' }),
    ).toBeInTheDocument()
    await act(() => router.navigate('/discover'))
    await screen.findByText(/All \d+ covers/)
    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.calls).toEqual([])
    expect(instance.iframe.isConnected).toBe(true)
  })

  it('says “Artist not found” for an id no cover credits', async () => {
    renderAt('/artists/nobody00000000000000000')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Artist not found' }),
    ).toBeInTheDocument()
  })
})
