import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'
import { YOUTUBE_HOST } from '../player/playback'
import { PlayerState } from '../player/youtubeApi'

/*
 * The fixtures (src/mocks/fixtures/songs.ts), as Discover sees them:
 *   paper lanterns  Mara Quill               orig The Lamplighters  folk      sub acoustic  stripped-down        dreamy, nostalgic
 *   Low Tide        Mara Quill, Ofelia Ruiz  orig The Lamplighters  r&b/soul                strong-vocals, live  soulful
 *   glass houses    the tidewater choir      orig The Lamplighters  pop, r&b  sub lo-fi     strong-vocals        soulful, dreamy
 *   Señales         Ofelia Ruiz              orig Los Faroles       folk      sub acoustic  stripped-down, live  nostalgic
 *   night bus       the tidewater choir      orig Mara Quill        pop                     stripped-down, acoustic  dreamy
 *   no link yet     Mara Quill               orig Los Faroles       pop       (no video)                         soulful
 */

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
const rowTitles = () =>
  within(results())
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent?.replace(' (now playing)', ''))
const resultCount = () => screen.getByText(/^(All \d+ covers|\d+ covers? match)$/)
const filterBar = () => screen.getByRole('group', { name: 'Filters' })

/** Opens a group's panel from the filter bar and returns its options. */
function openGroup(name: string) {
  const trigger = within(filterBar()).getByRole('button', { name: new RegExp(`^${name}`) })
  if (trigger.getAttribute('aria-expanded') !== 'true') fireEvent.click(trigger)
  return within(filterBar()).getByRole('group', { name })
}

const searchBox = () => screen.findByRole('combobox', { name: /^Search songs/ })

const option = (panel: ReturnType<typeof openGroup>, name: string) =>
  within(panel).getByRole('checkbox', { name: new RegExp(`^${name} \\d+ covers?$`) })

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})

describe('/discover search and filters', () => {
  it('opens on search and results, with live totals', async () => {
    renderAt('/discover')
    expect(await screen.findByRole('heading', { level: 1, name: 'Discover' })).toBeInTheDocument()
    expect(
      await screen.findByText('6 covers · 3 cover artists · 3 original artists'),
    ).toBeInTheDocument()
    expect(await searchBox()).toHaveAccessibleName(
      'Search songs, original artists and cover artists',
    )
    expect(resultCount()).toHaveTextContent('All 6 covers')
  })

  it('offers all six filter groups directly', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    const names = within(filterBar())
      .getAllByRole('button')
      .map((b) => b.textContent)
    expect(names).toEqual([
      'Original artist',
      'Cover artist',
      'Cover genre',
      'Subgenre',
      'Performance style',
      'Mood',
    ])
  })

  it('filters by original artist from the UI, separately from cover artist', async () => {
    const router = renderAt('/discover')
    await screen.findByText('All 6 covers')

    const originals = openGroup('Original artist')
    fireEvent.click(option(originals, 'Mara Quill'))
    expect(resultCount()).toHaveTextContent('1 cover match')
    expect(rowTitles()).toEqual(['Night Bus'])
    expect(router.state.location.search).toBe('?songBy=Mara+Quill')
    expect(
      screen.getByRole('button', { name: 'Remove Original artist: Mara Quill' }),
    ).toBeInTheDocument()

    // The same person as a cover artist is a different filter, and both together match nothing.
    const covers = openGroup('Cover artist')
    expect(option(covers, 'Mara Quill')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Original artist: Mara Quill' }))
    fireEvent.click(option(openGroup('Cover artist'), 'Mara Quill'))
    expect(rowTitles()).toEqual(['Paper Lanterns', 'Low Tide', 'No Link Yet'])
  })

  it('combines groups with accurate counts: original artist and cover genre', async () => {
    renderAt('/discover?songBy=The+Lamplighters')
    expect(await screen.findByText('3 covers match')).toBeInTheDocument()

    const genres = openGroup('Cover genre')
    expect(option(genres, 'R&B and soul')).toHaveAccessibleName('R&B and soul 2 covers')
    expect(option(genres, 'Folk')).toHaveAccessibleName('Folk 1 cover')
    fireEvent.click(option(genres, 'R&B and soul'))
    expect(rowTitles()).toEqual(['Low Tide', 'Glass Houses'])

    // Within a group, choices widen: other original artists still count against the genre.
    const originals = openGroup('Original artist')
    expect(option(originals, 'The Lamplighters')).toBeChecked()
    expect(option(originals, 'Los Faroles')).toBeDisabled()
  })

  it('keeps the acoustic subgenre and the acoustic performance style apart', async () => {
    const router = renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(option(openGroup('Subgenre'), 'Acoustic'))
    expect(rowTitles()).toEqual(['Paper Lanterns', 'Señales'])
    expect(router.state.location.search).toBe('?sub=acoustic')
    // No cover is tagged with both, so the style can't be added on top.
    expect(option(openGroup('Performance style'), 'Acoustic')).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Remove Subgenre: Acoustic' }))
    fireEvent.click(option(openGroup('Performance style'), 'Acoustic'))
    expect(rowTitles()).toEqual(['Night Bus'])
    expect(router.state.location.search).toBe('?style=acoustic')
  })

  it('combines mood and performance style', async () => {
    renderAt('/discover?mood=dreamy&style=stripped-down')
    expect(await screen.findByText('2 covers match')).toBeInTheDocument()
    expect(rowTitles()).toEqual(['Paper Lanterns', 'Night Bus'])
  })

  it('closes a filter panel with Escape and returns focus to its button', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    openGroup('Mood')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(within(filterBar()).queryByRole('group', { name: 'Mood' })).toBeNull()
    expect(within(filterBar()).getByRole('button', { name: /^Mood/ })).toHaveFocus()
  })
})

describe('/discover text search', () => {
  it('matches titles, cover artists and original artists without picking a suggestion', async () => {
    renderAt('/discover')
    const search = await searchBox()
    fireEvent.change(search, { target: { value: 'mara' } })
    expect(resultCount()).toHaveTextContent('4 covers match')
    fireEvent.change(search, { target: { value: 'faroles' } })
    expect(rowTitles()).toEqual(['Señales', 'No Link Yet'])
    fireEvent.change(search, { target: { value: 'senales' } })
    expect(rowTitles()).toEqual(['Señales'])
  })

  it('suggests each artist by role, and picking one filters that role exactly', async () => {
    const router = renderAt('/discover')
    const search = await searchBox()
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'mara' } })

    const list = screen.getByRole('listbox', { name: 'Suggestions' })
    expect(within(list).getByRole('group', { name: 'Original artist' })).toHaveTextContent(
      'Mara Quill 1 cover',
    )
    expect(within(list).getByRole('group', { name: 'Cover artist' })).toHaveTextContent(
      'Mara Quill 3 covers',
    )

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(search).toHaveAttribute(
      'aria-activedescendant',
      within(list).getAllByRole('option')[1]!.id,
    )
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(screen.queryByRole('listbox')).toBeNull()
    expect(search).toHaveValue('')
    expect(
      screen.getByRole('button', { name: 'Remove Cover artist: Mara Quill' }),
    ).toBeInTheDocument()
    expect(resultCount()).toHaveTextContent('3 covers match')
    expect(router.state.location.search).toBe('?artist=Mara+Quill')
  })

  it('closes suggestions, then clears the search, with Escape', async () => {
    renderAt('/discover')
    const search = await searchBox()
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'glass' } })
    expect(search).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search).toHaveAttribute('aria-expanded', 'false')
    expect(search).toHaveValue('glass')
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search).toHaveValue('')
  })

  it('explains an empty result and offers a way out', async () => {
    renderAt('/discover?q=zzz&mood=soulful')
    const empty = (await screen.findByText('No covers match “zzz” with these filters.'))
      .parentElement!
    fireEvent.click(within(empty).getByRole('button', { name: 'Clear search' }))
    expect(resultCount()).toHaveTextContent('3 covers match')
  })
})

describe('/discover URL state', () => {
  it('restores filters and sort from a direct link', async () => {
    renderAt('/discover?songBy=The+Lamplighters&sort=title')
    expect(await screen.findByText('3 covers match')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('title')
    expect(rowTitles()).toEqual(['Glass Houses', 'Low Tide', 'Paper Lanterns'])
  })

  it('sorts without losing filters, and keeps the sort when filters are cleared', async () => {
    const router = renderAt('/discover?mood=soulful')
    await screen.findByText('3 covers match')
    expect(rowTitles()).toEqual(['Low Tide', 'Glass Houses', 'No Link Yet'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'title' },
    })
    expect(rowTitles()).toEqual(['Glass Houses', 'Low Tide', 'No Link Yet'])
    expect(router.state.location.search).toBe('?mood=soulful&sort=title')

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(router.state.location.search).toBe('?sort=title')
  })

  it('walks filter history with Back and Forward; typing doesn’t add entries', async () => {
    const router = renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(option(openGroup('Original artist'), 'The Lamplighters'))
    fireEvent.click(option(openGroup('Mood'), 'Dreamy'))
    expect(rowTitles()).toEqual(['Paper Lanterns', 'Glass Houses'])
    const search = screen.getByRole('combobox', { name: /^Search songs/ })
    fireEvent.change(search, { target: { value: 'gl' } })
    fireEvent.change(search, { target: { value: 'glass' } })
    expect(rowTitles()).toEqual(['Glass Houses'])

    await act(() => router.navigate(-1))
    expect(router.state.location.search).toBe('?songBy=The+Lamplighters')
    expect(resultCount()).toHaveTextContent('3 covers match')

    await act(() => router.navigate(1))
    expect(router.state.location.search).toBe('?mood=dreamy&songBy=The+Lamplighters&q=glass')
    expect(rowTitles()).toEqual(['Glass Houses'])
  })
})

describe('/discover rows', () => {
  it('shows title, cover artists and original artists, with the rest in Details', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    const row = screen.getByRole('article', {
      name: 'Low Tide, covered by Mara Quill and Ofelia Ruiz',
    })
    expect(
      within(row).getByRole('button', { name: 'Show covers with cover artist Ofelia Ruiz' }),
    ).toBeInTheDocument()
    expect(
      within(row).getAllByRole('button', {
        name: 'Show covers with original artist The Lamplighters',
      }),
    ).not.toHaveLength(0)
    expect(within(row).getByRole('list', { name: 'Cover genres' })).toHaveTextContent(
      'R&B and soul',
    )

    fireEvent.click(within(row).getByRole('button', { name: /^Details/ }))
    const details = document.getElementById(
      within(row)
        .getByRole('button', { name: /^Details/ })
        .getAttribute('aria-controls')!,
    )!
    const group = (term: string) =>
      within(details).getByText(term, { selector: 'dt' }).nextElementSibling!.textContent
    expect(group('Cover genre')).toBe('R&B and soul')
    expect(group('Subgenre')).toBe('Not listed')
    expect(group('Performance style')).toBe('Strong vocalsLive')
    expect(group('Mood')).toBe('Soulful')
    // The original genre is never shown as the recording's genre.
    expect(details).not.toHaveTextContent('Pop')

    fireEvent.click(within(details).getByRole('button', { name: 'Performance style: Live' }))
    expect(rowTitles()).toEqual(['Low Tide', 'Señales'])
    expect(
      within(screen.getAllByRole('article')[0]!.parentElement!).getByRole('button', {
        name: 'Performance style: Live',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('narrows to an artist from a row', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    const row = screen.getByRole('article', { name: 'Señales, covered by Ofelia Ruiz' })
    fireEvent.click(
      within(row).getAllByRole('button', {
        name: 'Show covers with original artist Los Faroles',
      })[0]!,
    )
    expect(rowTitles()).toEqual(['Señales', 'No Link Yet'])
    expect(
      screen.getByRole('button', { name: 'Remove Original artist: Los Faroles' }),
    ).toBeInTheDocument()
  })
})

describe('/discover filter sheet (phones)', () => {
  it('leaves the player usable: the page goes inert, the player doesn’t', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))

    const opener = screen.getByRole('button', { name: 'Filters' })
    fireEvent.click(opener)
    const sheet = screen.getByRole('dialog', { name: 'Filters' })
    expect(sheet).toHaveAttribute('open')
    expect(document.getElementById('main')).toHaveAttribute('inert')
    expect(document.querySelector('header')).toHaveAttribute('inert')
    expect(document.querySelector('footer')).toHaveAttribute('inert')
    expect(document.getElementById('now-playing')).not.toHaveAttribute('inert')
    expect(document.getElementById('now-playing')!.closest('[inert]')).toBeNull()

    fireEvent.keyDown(sheet, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Filters' })).toBeNull()
    expect(document.querySelector('[inert]')).toBeNull()
    expect(opener).toHaveFocus()
  })
})

describe('/discover playback (the app shell’s player)', () => {
  const player = () => screen.getByRole('complementary', { name: 'Now playing' })

  it('plays one recording at a time, replacing it in the same player, and marks it in the list', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    expect(screen.queryByRole('complementary', { name: 'Now playing' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    expect(livePlayer().options).toMatchObject({ host: YOUTUBE_HOST, videoId: 'EEEEEEEEEE5' })
    expect(within(player()).getByTitle('Night Bus, playing from YouTube')).toBe(livePlayer().iframe)
    expect(player()).toHaveTextContent('The Tidewater Choir · Original Mara Quill')
    const row = screen.getByRole('article', { current: true })
    expect(row).toHaveAccessibleName('Night Bus, covered by The Tidewater Choir')
    expect(await within(row).findByText('Playing')).toBeInTheDocument()

    const first = livePlayer()
    fireEvent.click(
      screen.getByRole('button', { name: 'Play Low Tide by Mara Quill and Ofelia Ruiz' }),
    )
    await waitFor(() => expect(first.calls).toEqual(['load BBBBBBBBBB2 @30']))
    expect(FakePlayer.instances).toHaveLength(1)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    expect(first.iframe.title).toBe('Low Tide, playing from YouTube')
    expect(screen.getByRole('article', { current: true })).toHaveAccessibleName(
      'Low Tide, covered by Mara Quill and Ofelia Ruiz',
    )
    expect(
      await screen.findByRole('button', { name: 'Pause Low Tide by Mara Quill and Ofelia Ruiz' }),
    ).toBeInTheDocument()
  })

  it('pauses and resumes from the row or the player, and follows YouTube’s own controls', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(
      screen.getByRole('button', { name: 'Play Glass Houses by The Tidewater Choir' }),
    )
    fireEvent.click(
      await screen.findByRole('button', { name: 'Pause Glass Houses by The Tidewater Choir' }),
    )
    const row = screen.getByRole('article', { current: true })
    expect(await within(row).findByText('Paused')).toBeInTheDocument()

    fireEvent.click(within(player()).getByRole('button', { name: 'Resume Glass Houses' }))
    expect(await within(row).findByText('Playing')).toBeInTheDocument()

    // The listener pauses with YouTube's controls, inside the video.
    act(() => livePlayer().emit(PlayerState.PAUSED))
    expect(
      screen.getByRole('button', { name: 'Resume Glass Houses by The Tidewater Choir' }),
    ).toBeInTheDocument()
    expect(
      within(player()).getByRole('button', { name: 'Resume Glass Houses' }),
    ).toBeInTheDocument()
  })

  it('keeps the player on an ended recording, with Replay and Close', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(
      screen.getByRole('button', { name: 'Play Low Tide by Mara Quill and Ofelia Ruiz' }),
    )
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    act(() => livePlayer().emit(PlayerState.ENDED))
    expect(within(player()).getByText('Finished')).toBeInTheDocument()
    fireEvent.click(within(player()).getByRole('button', { name: 'Replay Low Tide' }))
    expect(livePlayer().calls).toEqual(['seek 30', 'play'])
  })

  it('closes: the player is destroyed and the list is no longer marked', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Paper Lanterns by Mara Quill' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()

    fireEvent.click(within(player()).getByRole('button', { name: 'Close player' }))
    expect(instance.destroyed).toBe(true)
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'Now playing' })).toBeNull()
    expect(screen.queryByRole('article', { current: true })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Play Paper Lanterns by Mara Quill' }),
    ).toBeInTheDocument()
  })

  it('explains a recording that can’t play here, with a link to YouTube', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    act(() => livePlayer().fail(100))

    expect(within(player()).getByRole('alert')).toHaveTextContent(
      'This video has been removed from YouTube.',
    )
    expect(
      within(player()).getByRole('link', { name: 'Watch on YouTube (opens in a new tab)' }),
    ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=EEEEEEEEEE5')
    expect(
      within(screen.getByRole('article', { current: true })).getByText('Can’t play here'),
    ).toBeInTheDocument()
  })

  it('keeps playing while filters change, even when the recording leaves the results', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Paper Lanterns by Mara Quill' }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    fireEvent.click(option(openGroup('Mood'), 'Soulful'))
    expect(rowTitles()).not.toContain('Paper Lanterns')
    expect(livePlayer()).toBe(instance)
    expect(within(player()).getByText('Paper Lanterns')).toBeInTheDocument()
  })

  it('offers no play control without a video', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    const row = screen.getByRole('article', { name: 'No Link Yet, covered by Mara Quill' })
    expect(within(row).queryByRole('button', { name: /^Play/ })).toBeNull()
    expect(within(row).getByText('No video')).toBeInTheDocument()
  })
})

it('shows a retry when the catalog does not load', async () => {
  server.use(
    http.get(apiUrl('/api/songs/all-songs'), () =>
      HttpResponse.json({ success: true, message: 'oops' }),
    ),
  )
  renderAt('/discover')
  expect(await screen.findByRole('alert')).toHaveTextContent('The catalog didn’t load.')
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
})
