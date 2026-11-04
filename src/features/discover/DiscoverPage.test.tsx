import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { server } from '../../mocks/server'

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

describe('/discover playback', () => {
  it('plays one recording at a time in the docked player, and marks it in the list', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))

    const player = screen.getByRole('region', { name: 'Now playing' })
    expect(within(player).getByTitle('Night Bus, playing from YouTube')).toHaveAttribute(
      'src',
      expect.stringContaining('youtube-nocookie.com/embed/EEEEEEEEEE5?autoplay=1'),
    )
    expect(player).toHaveTextContent('The Tidewater Choir · Original Mara Quill')
    expect(screen.getByRole('article', { current: true })).toHaveAccessibleName(
      'Night Bus, covered by The Tidewater Choir',
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Play Low Tide by Mara Quill and Ofelia Ruiz' }),
    )
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
    expect(within(player).getByTitle('Low Tide, playing from YouTube')).toHaveAttribute(
      'src',
      expect.stringContaining('BBBBBBBBBB2?autoplay=1&rel=0&playsinline=1&start=30'),
    )
    expect(
      screen.getByRole('button', { name: 'Stop Low Tide by Mara Quill and Ofelia Ruiz' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('stops from the row or the player, and releases the space it reserved', async () => {
    renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(
      screen.getByRole('button', { name: 'Play Glass Houses by The Tidewater Choir' }),
    )
    expect(document.body.style.paddingBottom).not.toBe('')
    fireEvent.click(
      screen.getByRole('button', { name: 'Stop Glass Houses by The Tidewater Choir' }),
    )
    expect(screen.queryByRole('region', { name: 'Now playing' })).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: 'Play Glass Houses by The Tidewater Choir' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close player' }))
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.body.style.paddingBottom).toBe('')
  })

  it('keeps playing while filters change, and stops when leaving Discover', async () => {
    const router = renderAt('/discover')
    await screen.findByText('All 6 covers')
    fireEvent.click(screen.getByRole('button', { name: 'Play Paper Lanterns by Mara Quill' }))
    fireEvent.click(option(openGroup('Mood'), 'Soulful'))
    expect(screen.getByRole('region', { name: 'Now playing' })).toBeInTheDocument()

    await act(() => router.navigate('/'))
    expect(
      document.querySelector('iframe[title="Paper Lanterns, playing from YouTube"]'),
    ).toBeNull()
    expect(document.body.style.paddingBottom).toBe('')
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
