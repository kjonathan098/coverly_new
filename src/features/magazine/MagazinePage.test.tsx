import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { server } from '../../mocks/server'
import { livePlayer } from '../../test/fakeYouTube'
import { BANGER_OF_THE_WEEK } from './bangerFeature'

function renderAt(url = '/magazine') {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

/**
 * The shared fixtures are too small for any real collection (6 covers minimum). This catalog
 * repeats the first fixture (folk, acoustic, dreamy + nostalgic, stripped-down, by Mara Quill)
 * seven times, so "Nostalgic" and "Acoustic & stripped down" qualify, and nothing else does.
 */
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

const carousel = () => screen.getByRole('region', { name: 'Featured collections' })
const slides = () => within(carousel()).getAllByRole('group', { hidden: true })

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('/magazine (the original homepage design)', () => {
  it('opens on the cover, whose “Open this issue” link leads to the content right after it', async () => {
    serveLargerCatalog()
    renderAt('/magazine')
    const cover = await screen.findByRole('region', {
      name: 'Coverly Magazine — Banger of the Week',
    })
    const open = within(cover).getByRole('link', { name: 'Open this issue' })
    expect(open).toHaveAttribute('href', '#magazine-content')
    const content = document.getElementById('magazine-content')!
    expect(cover.nextElementSibling).toBe(content)
    expect(
      await within(content).findByRole('region', { name: 'Featured collections' }),
    ).toBeInTheDocument()
  })

  it('falls back to browsing everything when no collection has enough covers', async () => {
    renderAt('/magazine')
    expect(await screen.findByRole('link', { name: 'Browse all 6 covers' })).toHaveAttribute(
      'href',
      '/discover',
    )
    expect(screen.queryByRole('region', { name: 'Featured collections' })).toBeNull()
  })

  it('features only collections the catalog can fill, with live counts', async () => {
    serveLargerCatalog()
    renderAt('/magazine')
    await screen.findByRole('region', { name: 'Featured collections' })
    expect(slides()).toHaveLength(2)

    const [first] = slides()
    expect(first).toHaveAccessibleName('1 of 2')
    expect(within(first!).getByRole('heading', { level: 2, name: 'Nostalgic' })).toBeInTheDocument()
    // 7 repeats + paper lanterns + Señales; Mara Quill and Ofelia Ruiz.
    expect(within(first!).getByText('9 covers · 2 cover artists')).toBeInTheDocument()
    expect(within(first!).getByRole('link', { name: 'Explore the collection' })).toHaveAttribute(
      'href',
      '/discover?mood=nostalgic',
    )
  })

  it('opens Discover on exactly the collection’s covers', async () => {
    serveLargerCatalog()
    const router = renderAt('/magazine')
    const explore = await screen.findAllByRole('link', { name: 'Explore the collection' })
    fireEvent.click(explore[0]!)
    expect(await screen.findByText('9 covers match')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/discover')
  })

  it('moves between collections only when asked, with buttons and arrow keys', async () => {
    serveLargerCatalog()
    renderAt('/magazine')
    await screen.findByRole('region', { name: 'Featured collections' })
    const [first, second] = slides()
    expect(first).not.toHaveAttribute('inert')
    expect(second).toHaveAttribute('inert')

    fireEvent.click(screen.getByRole('button', { name: 'Next collection' }))
    expect(first).toHaveAttribute('inert')
    expect(second).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: /^02/ })).toHaveAttribute('aria-current', 'true')
    expect(
      within(carousel()).getByText('Collection 2 of 2: Acoustic & stripped down'),
    ).toBeInTheDocument()

    fireEvent.keyDown(screen.getByRole('button', { name: /^02/ }), { key: 'ArrowRight' })
    expect(first).not.toHaveAttribute('inert')
    fireEvent.click(screen.getByRole('button', { name: 'Previous collection' }))
    expect(second).not.toHaveAttribute('inert')
  })

  it('plays a collection’s first cover in the shared player, and keeps playing across slides', async () => {
    serveLargerCatalog()
    renderAt('/magazine')
    await screen.findByRole('region', { name: 'Featured collections' })
    // Both slides open on the same repeated song; play the one on the visible slide.
    fireEvent.click(
      within(slides()[0]!).getByRole('button', { name: 'Play Repeat Song 1 by Mara Quill' }),
    )
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    const player = screen.getByRole('complementary', { name: 'Now playing' })
    expect(within(player).getByTitle('Repeat Song 1, playing from YouTube')).toBe(instance.iframe)
    // The video plays in the shell, not inside the slide's artwork.
    expect(within(carousel()).queryByTitle(/playing from YouTube/)).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next collection' }))
    })
    expect(instance.destroyed).toBe(false)
    expect(livePlayer()).toBe(instance)
    // The same recording opens the next slide too, and is shown as the one playing there.
    expect(
      within(slides()[1]!).getByRole('button', { name: 'Pause Repeat Song 1 by Mara Quill' }),
    ).toBeInTheDocument()
  })

  it('links moods, the piano shelf and artists into Discover', async () => {
    renderAt('/magazine')
    const moods = await screen.findByRole('region', { name: 'Start with a mood' })
    expect(within(moods).getByRole('link', { name: /^Soulful/ })).toHaveAttribute(
      'href',
      '/discover?mood=soulful',
    )
    const artists = screen.getByRole('region', { name: 'Artists who keep coming back' })
    expect(within(artists).getByRole('link', { name: 'The Tidewater Choir' })).toHaveAttribute(
      'href',
      '/discover?artist=the+tidewater+choir',
    )
    // The fixtures have no piano-driven covers, so the shelf stays out rather than showing a stub.
    expect(screen.queryByRole('region', { name: 'Piano-driven' })).toBeNull()
  })

  it('links to the whole catalog with live totals', async () => {
    renderAt('/magazine')
    expect(
      await screen.findByRole('heading', { name: '6 covers by 3 cover artists' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Discover' })).toHaveAttribute('href', '/discover')
  })

  it('navigates between pages from the header', async () => {
    const router = renderAt('/magazine')
    await screen.findByRole('region', { name: 'Start with a mood' })
    const nav = screen.getByRole('navigation', { name: 'Main' })
    fireEvent.click(within(nav).getByRole('link', { name: 'Discover' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Discover' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Discover' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.click(within(nav).getByRole('link', { name: 'Magazine' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/magazine'))
    expect(within(nav).getByRole('link', { name: 'Magazine' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows a retry when the catalog does not load', async () => {
    server.use(
      http.get(apiUrl('/api/songs/all-songs'), () =>
        HttpResponse.json({ success: true, message: 'oops' }),
      ),
    )
    renderAt('/magazine')
    expect(await screen.findByRole('alert')).toHaveTextContent('The catalog didn’t load.')
  })
})

describe('Banger of the Week on /magazine', () => {
  // The configured song, as the real catalog has it: Miley Cyrus's cover of Madonna's “Like a Prayer”.
  const person = (_id: string, name: string, roles: number[]) => ({
    _id,
    name,
    roles,
    profileImage: '',
    bio: '',
  })
  function serveFeaturedSong() {
    const featured = {
      ...songFixtures[0],
      _id: BANGER_OF_THE_WEEK.songId,
      title: 'like a prayer',
      artist: {
        original: [person('madonna0000000000000000', 'Madonna', [1])],
        coverArtist: [person('miley00000000000000000', 'Miley Cyrus', [2])],
      },
      links: [
        { url: 'https://www.youtube.com/watch?v=C0IQm-MXh2s', platform: 'youtube', timeStamp: 0 },
      ],
    }
    server.use(
      http.get(apiUrl('/api/songs/all-songs'), () =>
        HttpResponse.json({ success: true, message: [...songFixtures, featured] }),
      ),
    )
  }

  it('is the first feature after the cover, and plays the featured cover in the shared player', async () => {
    serveFeaturedSong()
    const router = renderAt('/magazine')
    const feature = await screen.findByRole('region', {
      name: /^Banger of the Week: ?This one hits different\.$/,
    })
    expect(document.getElementById('magazine-content')!.firstElementChild).toBe(feature)
    expect(within(feature).getByText('The Weekly Drop / 001')).toBeInTheDocument()
    expect(within(feature).getByRole('heading', { level: 3 })).toHaveTextContent('Like a Prayer')
    expect(
      within(feature).getByText(
        'Miley takes on a Madonna classic. Turn it up and hear what happens.',
      ),
    ).toBeInTheDocument()
    expect(within(feature).queryByText(/Development preview|not written yet/)).toBeNull()
    expect(
      within(feature).getByRole('link', { name: 'Miley Cyrus, cover artist' }),
    ).toHaveAttribute('href', '/artists/miley00000000000000000')
    expect(within(feature).getByRole('link', { name: /^Madonna/ })).toHaveAttribute(
      'href',
      '/artists/madonna0000000000000000',
    )

    fireEvent.click(
      within(feature).getByRole('button', {
        name: 'Listen to this banger: Like a Prayer by Miley Cyrus',
      }),
    )
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const player = screen.getByRole('complementary', { name: 'Now playing' })
    expect(within(player).getByTitle('Like a Prayer, playing from YouTube')).toBe(
      livePlayer().iframe,
    )
    expect(
      within(feature).getByRole('button', {
        name: 'Pause this banger: Like a Prayer by Miley Cyrus',
      }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/magazine')
  })

  it('stays out of the issue when the featured song is not in the catalog', async () => {
    renderAt('/magazine')
    await screen.findByRole('region', { name: 'Start with a mood' })
    expect(screen.queryByRole('region', { name: /^Banger of the Week/ })).toBeNull()
  })
})
