import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { livePlayer } from '../../test/fakeYouTube'

type Ref = { _id: string; name: string }
const lowTide = songFixtures.find((s) => s.title === 'Low Tide')!
const [mara, ofelia] = lowTide.artist.coverArtist as Ref[]
const [original] = lowTide.artist.original as Ref[]

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const player = () => screen.getByRole('complementary', { name: 'Now playing' })

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})

describe('the Now Playing information', () => {
  it('shows the whole title and every artist on labelled lines, with controls apart from the text', async () => {
    const router = renderAt('/discover')
    await screen.findByText(/All \d+ covers/)
    fireEvent.click(screen.getByRole('button', { name: /^Play Low Tide by / }))
    await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
    const instance = livePlayer()
    const panel = player()

    // The title: complete, and allowed to wrap (never cut off with an ellipsis).
    const title = within(panel).getByText('Low Tide')
    expect(title.className).not.toMatch(/truncate|line-clamp/)

    // "Cover by" and "Original by", each with all its artists, linking to their profiles.
    // The first list in the panel (the docked-only extras below have their own).
    const people = panel.querySelector('dl')!
    const terms = within(people)
      .getAllByRole('term')
      .map((term) => term.textContent)
    expect(terms).toEqual(['Cover by', 'Original by'])
    const [covers, originals] = within(people).getAllByRole('definition')
    expect(covers).toHaveTextContent('Mara Quill and Ofelia Ruiz')
    expect(covers!.className).not.toMatch(/truncate/)
    expect(within(covers!).getByRole('link', { name: 'Mara Quill, cover artist' })).toHaveAttribute(
      'href',
      `/artists/${mara!._id}`,
    )
    expect(
      within(covers!).getByRole('link', { name: 'Ofelia Ruiz, cover artist' }),
    ).toHaveAttribute('href', `/artists/${ofelia!._id}`)
    expect(within(originals!).getByRole('link', { name: /, original artist$/ })).toHaveAttribute(
      'href',
      `/artists/${original!._id}`,
    )

    // Every control is there, outside the text, in a sensible keyboard order.
    const controls = within(panel)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'))
    expect(controls).toEqual([
      // A guest here: the heart and + ask to log in first.
      'Log in to favorite Low Tide by Mara Quill and Ofelia Ruiz',
      'Log in to add Low Tide by Mara Quill and Ofelia Ruiz to a playlist',
      'Pause Low Tide',
      'Move the player to the left',
      'Close player',
    ])
    for (const definition of [covers!, originals!]) {
      expect(within(definition).queryAllByRole('button')).toEqual([])
    }

    // An artist link navigates without touching playback.
    fireEvent.click(within(covers!).getByRole('link', { name: 'Ofelia Ruiz, cover artist' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/artists/${ofelia!._id}`))
    expect(instance.calls).toEqual([])
    expect(instance.iframe.isConnected).toBe(true)
  })
})
