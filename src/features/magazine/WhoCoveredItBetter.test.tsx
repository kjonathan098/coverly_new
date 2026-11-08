import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { userFixture } from '../../mocks/fixtures/users'
import { loggedInHandlers } from '../../mocks/handlers/auth'
import { matchupHandlers, type MockMatchup } from '../../mocks/handlers/matchups'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'
import { AUTH_CHANNEL } from '../auth/session'

// Two covers of the same song (same title and original artist), by different cover artists.
const SIMZ = 'match0000000000000000001'
const ANDRADE = 'match0000000000000000002'
const person = (_id: string, name: string, roles: number[]) => ({
  _id,
  name,
  roles,
  profileImage: '',
  bio: '',
})
const gorillaz = person('gorillaz00000000000000001', 'Gorillaz', [1])
const cover = (_id: string, artist: object, video: string) => ({
  ...songFixtures[0],
  _id,
  title: 'feel good inc.',
  artist: { original: [gorillaz], coverArtist: [artist] },
  links: [{ url: `https://www.youtube.com/watch?v=${video}`, platform: 'youtube', timeStamp: 0 }],
})
const CATALOG = [
  ...songFixtures,
  cover(SIMZ, person('simz000000000000000000001', 'Little Simz', [2]), 'SIMZ0000001'),
  cover(ANDRADE, person('andrade000000000000000001', 'Daniela Andrade', [2]), 'ANDRADE0001'),
]

let voter: string | null = null
function serve(matchup: MockMatchup, catalog: object[] = CATALOG) {
  server.use(
    http.get(apiUrl('/api/songs/all-songs'), () =>
      HttpResponse.json({ success: true, message: catalog }),
    ),
    ...matchupHandlers(matchup, () => voter),
  )
  return matchup
}
const newMatchup = (votes: Record<string, string> = {}): MockMatchup => ({
  id: 'feel-good-inc-001',
  songs: [SIMZ, ANDRADE],
  votes,
})
function logIn() {
  server.use(...loggedInHandlers())
  voter = userFixture._id
}
function finishPopupLogin(status: 'success' | 'failed') {
  const channel = new BroadcastChannel(AUTH_CHANNEL)
  channel.postMessage({ type: 'coverly:auth', status })
  channel.close()
}

function renderMagazine(url = '/magazine') {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [url] })} />
    </QueryClientProvider>,
  )
}
const showdown = () =>
  screen.findByRole('region', { name: /^Who covered it better\? ?Feel Good Inc\.$/ })
const button = (name: string | RegExp) => screen.getByRole('button', { name })

beforeEach(() => {
  voter = null
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => vi.restoreAllMocks())

describe('Who Covered It Better? (guests)', () => {
  it('lets guests listen and asks them to log in to vote, with no results', async () => {
    serve(newMatchup({ someone: SIMZ }))
    renderMagazine()
    const section = await showdown()
    expect(within(section).getByText(/^Originally by/)).toHaveTextContent('Originally by Gorillaz')
    expect(within(section).getByText('Vote to reveal the results.')).toBeInTheDocument()
    expect(within(section).queryByText(/%$/)).toBeNull()
    expect(within(section).getByRole('button', { name: 'Play Feel Good Inc. by Little Simz' }))
    expect(button('Log in to vote for Little Simz')).not.toHaveAttribute('aria-pressed')
    expect(button('Log in to vote for Daniela Andrade')).toBeInTheDocument()
  })

  it('casts the chosen vote after a successful popup login, once', async () => {
    const matchup = serve(newMatchup())
    const open = vi.spyOn(window, 'open').mockReturnValue({ focus() {} } as Window)
    renderMagazine()
    const section = await showdown()
    fireEvent.click(button('Log in to vote for Daniela Andrade'))
    expect(open).toHaveBeenCalledOnce()
    expect(within(section).getByRole('status')).toHaveTextContent(
      'Log in to count your vote for Daniela Andrade.',
    )
    expect(matchup.votes).toEqual({})

    logIn()
    act(() => finishPopupLogin('success'))
    expect(await screen.findByText('vote so far')).toBeInTheDocument()
    expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument()
    expect(matchup.votes).toEqual({ [userFixture._id]: ANDRADE })
    expect(button('Your vote')).toHaveAttribute('aria-pressed', 'true')
  })

  it('casts nothing when the popup login fails', async () => {
    const matchup = serve(newMatchup())
    vi.spyOn(window, 'open').mockReturnValue({ focus() {} } as Window)
    renderMagazine()
    await showdown()
    fireEvent.click(button('Log in to vote for Little Simz'))
    act(() => finishPopupLogin('failed'))
    await waitFor(() => expect(screen.queryByText(/Log in to count your vote/)).toBeNull())

    // Logging in later (say, from the header) doesn't bring the dropped vote back.
    logIn()
    act(() => finishPopupLogin('success'))
    expect(await screen.findByRole('button', { name: 'Vote for Little Simz' })).toBeInTheDocument()
    expect(matchup.votes).toEqual({})
  })

  it('casts nothing when the popup is closed without logging in', async () => {
    const matchup = serve(newMatchup())
    vi.spyOn(window, 'open').mockReturnValue({ focus() {} } as Window)
    renderMagazine()
    await showdown()
    fireEvent.click(button('Log in to vote for Little Simz'))
    // The popup closes; this window gets focus back and no login result arrives.
    act(() => void window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(screen.queryByText(/Log in to count your vote/)).toBeNull(), {
      timeout: 2500,
    })
    logIn()
    act(() => finishPopupLogin('success'))
    expect(await screen.findByRole('button', { name: 'Vote for Little Simz' })).toBeInTheDocument()
    expect(matchup.votes).toEqual({})
  })
})

describe('Who Covered It Better? (logged in)', () => {
  it('hides the results until the reader votes, then shows the real split', async () => {
    logIn()
    const matchup = serve(newMatchup({ a: SIMZ, b: SIMZ, c: ANDRADE }))
    renderMagazine()
    const section = await showdown()
    await within(section).findByRole('button', { name: 'Vote for Little Simz' })
    expect(within(section).getByText('Vote to reveal the results.')).toBeInTheDocument()
    expect(within(section).queryByText(/votes$/)).toBeNull()

    fireEvent.click(button('Vote for Daniela Andrade'))
    expect(await within(section).findByText('votes so far')).toBeInTheDocument()
    expect(within(section).getByText('4', { selector: 'span' })).toBeInTheDocument()
    expect(within(section).getAllByText('50%', { selector: 'span' })).toHaveLength(2)
    expect(within(section).getByRole('status')).toHaveTextContent(
      'Vote counted for Daniela Andrade. Little Simz 50%, Daniela Andrade 50%. 4 votes in total.',
    )
    expect(button('Your vote')).toHaveAttribute('aria-pressed', 'true')
    expect(matchup.votes[userFixture._id]).toBe(ANDRADE)

    // Switching moves the same vote: still 4 in total, now 3 to 1.
    fireEvent.click(button('Switch to Little Simz'))
    expect(await within(section).findByText('75%', { selector: 'span' })).toBeInTheDocument()
    expect(within(section).getByText('25%', { selector: 'span' })).toBeInTheDocument()
    expect(within(section).getByText('4', { selector: 'span' })).toBeInTheDocument()
    expect(matchup.votes[userFixture._id]).toBe(SIMZ)
    expect(button('Switch to Daniela Andrade')).toHaveAttribute('aria-pressed', 'false')
  })

  it('plays either cover in the shared player, and voting never interrupts it', async () => {
    logIn()
    serve(newMatchup())
    renderMagazine()
    const section = await showdown()
    fireEvent.click(
      within(section).getByRole('button', { name: 'Play Feel Good Inc. by Little Simz' }),
    )
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    const calls = [...instance.calls]

    fireEvent.click(
      await within(section).findByRole('button', { name: 'Vote for Daniela Andrade' }),
    )
    await within(section).findByText('vote so far')
    fireEvent.click(button('Switch to Little Simz'))
    await within(section).findByText('100%', { selector: 'span' })

    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.destroyed).toBe(false)
    expect(instance.calls).toEqual(calls)
    expect(
      within(screen.getByRole('complementary', { name: 'Now playing' })).getByTitle(
        'Feel Good Inc., playing from YouTube',
      ),
    ).toBe(instance.iframe)
  })
})

describe('Who Covered It Better? sample results', () => {
  it('shows labelled samples after a real vote, with the real count kept apart', async () => {
    logIn()
    const matchup = serve({ ...newMatchup(), demo: { [SIMZ]: 54, [ANDRADE]: 46 } })
    renderMagazine()
    const section = await showdown()
    fireEvent.click(
      await within(section).findByRole('button', { name: 'Vote for Daniela Andrade' }),
    )
    expect(await within(section).findByText('54%')).toBeInTheDocument()
    expect(within(section).getByText('46%')).toBeInTheDocument()
    expect(within(section).getByText('100')).toBeInTheDocument()
    expect(within(section).getByText('sample votes')).toBeInTheDocument()
    expect(within(section).getByText('Preview data · 1 real vote')).toBeInTheDocument()
    expect(within(section).getByRole('status')).toHaveTextContent(
      'Preview with sample results, not community votes: Little Simz 54%, Daniela Andrade 46% of 100 sample votes. 1 real vote so far.',
    )
    // Only the real vote was cast.
    expect(matchup.votes).toEqual({ [userFixture._id]: ANDRADE })
  })
})

describe('Who Covered It Better? (nothing to show)', () => {
  it('stays out of the issue without a current matchup', async () => {
    server.use(
      http.get(apiUrl('/api/songs/all-songs'), () =>
        HttpResponse.json({ success: true, message: CATALOG }),
      ),
    )
    renderMagazine()
    await screen.findByRole('region', { name: 'Artists who keep coming back' })
    expect(screen.queryByRole('region', { name: /^Who covered it better/ })).toBeNull()
  })

  it('stays out of the issue when a matchup song is not in the catalog', async () => {
    serve(newMatchup(), CATALOG.slice(0, -1))
    renderMagazine()
    await screen.findByRole('region', { name: 'Artists who keep coming back' })
    expect(screen.queryByRole('region', { name: /^Who covered it better/ })).toBeNull()
  })
})
