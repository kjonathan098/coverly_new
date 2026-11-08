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

describe('the artist header', () => {
  const heroImage = () => document.querySelector<HTMLImageElement>('header img')
  const FAROLES = credit('Señales', 'original') // an original artist only

  it('B, the header with a performance frame, is the default', async () => {
    renderAt(`/artists/${MARA}`)
    await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })
    expect(heroImage()).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Header b' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('in development, ?hero=a still shows A, the text header', async () => {
    renderAt(`/artists/${MARA}?hero=a`)
    await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })
    expect(heroImage()).toBeNull()
    expect(screen.getByRole('button', { name: 'Header a' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('B shows a frame from one of their own solo performances, falling back to text if none loads', async () => {
    renderAt(`/artists/${MARA}`)
    await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })
    // Low Tide is a duet and No Link Yet has no video: Paper Lanterns, performed alone.
    expect(heroImage()).toHaveAttribute(
      'src',
      'https://i.ytimg.com/vi/AAAAAAAAAA1/maxresdefault.jpg',
    )
    expect(heroImage()).toHaveAttribute('alt', '')
    expect(screen.getByText('From their cover of Paper Lanterns')).toBeInTheDocument()

    fireEvent.error(heroImage()!)
    expect(heroImage()).toHaveAttribute('src', 'https://i.ytimg.com/vi/AAAAAAAAAA1/hqdefault.jpg')
    fireEvent.error(heroImage()!)
    expect(heroImage()).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Mara Quill' })).toBeInTheDocument()
  })

  it('B keeps the text header for an artist with no performances', async () => {
    renderAt(`/artists/${FAROLES}`)
    await screen.findByRole('heading', { level: 1, name: 'Los Faroles' })
    expect(heroImage()).toBeNull()
  })

  it('switches between A and B in place', async () => {
    const router = renderAt(`/artists/${MARA}`)
    await screen.findByRole('heading', { level: 1, name: 'Mara Quill' })
    fireEvent.click(screen.getByRole('button', { name: 'Header b' }))
    await waitFor(() => expect(heroImage()).not.toBeNull())
    expect(router.state.location.search).toBe('?hero=b')
    fireEvent.click(screen.getByRole('button', { name: 'Header a' }))
    await waitFor(() => expect(heroImage()).toBeNull())
  })
})
