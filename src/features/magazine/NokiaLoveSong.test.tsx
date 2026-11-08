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
import { livePlayer } from '../../test/fakeYouTube'

// The recording as the catalog has it (simulated with MSW; a fake YouTube player plays it).
const person = (_id: string, name: string, roles: number[]) => ({
  _id,
  name,
  roles,
  profileImage: '',
  bio: '',
})
const DILEMMA = {
  ...songFixtures[0],
  _id: 'dilemma00000000000000001',
  title: 'dilemma',
  artist: {
    original: [
      person('nelly000000000000000001', 'Nelly', [1]),
      person('kelly00000000000000001', 'Kelly Rowland', [1]),
    ],
    coverArtist: [person('holsten0000000000000001', 'Chris Holsten', [2])],
  },
  links: [
    { url: 'https://www.youtube.com/watch?v=l9tS2xVjmqM', platform: 'youtube', timeStamp: 0 },
  ],
}

function renderMagazine(catalog: object[]) {
  server.use(
    http.get(apiUrl('/api/songs/all-songs'), () =>
      HttpResponse.json({ success: true, message: catalog }),
    ),
  )
  const router = createMemoryRouter(routes, { initialEntries: ['/magazine'] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
const feature = () => screen.findByRole('region', { name: 'Dilemma, covered by Chris Holsten' })

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('Nokia love song in Magazine', () => {
  it('shows the Nokia and the catalog’s Dilemma cover, with no heading', async () => {
    renderMagazine([...songFixtures, DILEMMA])
    const section = await feature()
    expect(within(section).getByRole('img')).toHaveAccessibleName(/Boo I miss you! xOxO/)
    expect(within(section).queryByRole('heading')).toBeNull()
    expect(section).toHaveTextContent(
      'Some texts never go out of style. Neither do some love songs.',
    )
    expect(section).toHaveTextContent('Dilemma')
    expect(
      within(section).getByRole('link', { name: 'Chris Holsten, cover artist' }),
    ).toHaveAttribute('href', '/artists/holsten0000000000000001')
    expect(
      within(section).getByRole('link', { name: 'Kelly Rowland, original artist' }),
    ).toBeInTheDocument()
  })

  it('plays and pauses the cover in the shared player with the heart', async () => {
    const router = renderMagazine([...songFixtures, DILEMMA])
    const section = await feature()
    fireEvent.click(within(section).getByRole('button', { name: 'Play Dilemma by Chris Holsten' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const player = screen.getByRole('complementary', { name: 'Now playing' })
    expect(within(player).getByTitle('Dilemma, playing from YouTube')).toBe(livePlayer().iframe)
    const pause = await within(section).findByRole('button', {
      name: 'Pause Dilemma by Chris Holsten',
    })
    fireEvent.click(pause)
    expect(
      await within(section).findByRole('button', { name: 'Resume Dilemma by Chris Holsten' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/magazine')
  })

  it('stays out of the issue when the catalog has no recording of that video', async () => {
    renderMagazine(songFixtures)
    await screen.findByRole('region', { name: 'Start with a mood' })
    expect(screen.queryByRole('region', { name: /Dilemma/ })).toBeNull()
  })
})
