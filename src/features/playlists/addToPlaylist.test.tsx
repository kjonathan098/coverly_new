import { QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { createQueryClient } from '../../lib/queryClient'
import { songFixtures } from '../../mocks/fixtures/songs'
import { loggedInHandlers, type MockAccount } from '../../mocks/handlers/auth'
import { server } from '../../mocks/server'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'
import { AUTH_CHANNEL } from '../auth/session'

const NIGHT_BUS = songFixtures[4]!._id
const MIX = 'mix000000000000000000001'
const ROAD = 'road00000000000000000001'
const ADD_NIGHT_BUS = 'Add Night Bus by The Tidewater Choir to a playlist'

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function logIn() {
  const account: MockAccount = {
    favorites: [],
    playlists: [
      { _id: MIX, name: 'Late night', songs: [] },
      { _id: ROAD, name: 'Road trip', songs: [NIGHT_BUS] },
    ],
  }
  server.use(...loggedInHandlers(account))
  return account
}

const player = () => screen.getByRole('complementary', { name: 'Now playing' })
const dialog = () => screen.queryByRole('dialog', { name: 'Add to playlist' })

async function playNightBus() {
  await screen.findByText(/All \d+ covers/)
  fireEvent.click(screen.getByRole('button', { name: 'Play Night Bus by The Tidewater Choir' }))
  await waitFor(() => expect(livePlayer().iframe.isConnected).toBe(true))
  return livePlayer()
}

/** Clicks "+" for Night Bus in `scope` and waits for the modal's playlists. */
async function openPicker(scope: HTMLElement) {
  const plus = await waitFor(() => {
    const button = within(scope).getByRole('button', { name: ADD_NIGHT_BUS })
    expect(button).toBeEnabled()
    return button
  })
  fireEvent.click(plus)
  const modal = await screen.findByRole('dialog', { name: 'Add to playlist' })
  await within(modal).findByRole('checkbox', { name: 'Late night' })
  return { plus, modal }
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => vi.restoreAllMocks())

describe('the add-to-playlist modal', () => {
  it('adds and removes, finds and creates playlists, and closes back to "+", while the music plays on', async () => {
    const account = logIn()
    renderAt('/discover')
    const instance = await playNightBus()
    const video = instance.iframe.parentElement
    const { plus, modal } = await openPicker(player())
    expect(modal).toHaveAccessibleDescription('Night Bus · The Tidewater Choir')

    // The page behind is inert and dimmed; the player is not.
    expect(document.querySelector('main')).toHaveAttribute('inert')
    expect(document.querySelector('main')).toHaveAttribute('data-dimmed')
    expect(player().closest('[inert]')).toBeNull()

    const lateNight = within(modal).getByRole('checkbox', { name: 'Late night' })
    const roadTrip = within(modal).getByRole('checkbox', { name: 'Road trip' })
    expect(lateNight).not.toBeChecked()
    expect(roadTrip).toBeChecked()
    fireEvent.click(lateNight)
    fireEvent.click(roadTrip)
    await waitFor(() => expect(lateNight).toBeChecked())
    await waitFor(() => expect(roadTrip).not.toBeChecked())
    await waitFor(() =>
      expect(account.playlists!.map((p) => [p.name, p.songs])).toEqual([
        ['Late night', [NIGHT_BUS]],
        ['Road trip', []],
      ]),
    )

    // Search narrows the list; "New playlist" starts from what was typed.
    fireEvent.change(within(modal).getByRole('searchbox', { name: 'Find a playlist' }), {
      target: { value: 'road' },
    })
    expect(within(modal).getAllByRole('checkbox')).toHaveLength(1)
    expect(within(modal).getByRole('checkbox', { name: 'Road trip' })).toBeInTheDocument()
    fireEvent.change(within(modal).getByRole('searchbox', { name: 'Find a playlist' }), {
      target: { value: 'Rainy days' },
    })
    expect(within(modal).getByText('No playlist called “Rainy days”.')).toBeInTheDocument()
    fireEvent.click(within(modal).getByRole('button', { name: 'New playlist' }))
    expect(within(modal).getByLabelText('New playlist')).toHaveValue('Rainy days')
    fireEvent.click(within(modal).getByRole('button', { name: 'Create' }))
    expect(await within(modal).findByRole('checkbox', { name: 'Rainy days' })).toBeChecked()
    expect(account.playlists![0]).toMatchObject({ name: 'Rainy days', songs: [NIGHT_BUS] })

    // Escape closes it, the page comes back, and focus returns to "+".
    fireEvent.keyDown(within(modal).getByRole('checkbox', { name: 'Rainy days' }), {
      key: 'Escape',
    })
    expect(dialog()).toBeNull()
    expect(document.querySelector('main')).not.toHaveAttribute('inert')
    expect(document.querySelector('main')).not.toHaveAttribute('data-dimmed')
    expect(plus).toHaveFocus()

    // The same player, in the same place, untouched.
    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.calls).toEqual([])
    expect(instance.iframe.parentElement).toBe(video)
    expect(instance.iframe.isConnected).toBe(true)
  })

  it('closes with its button, and the Library agrees', async () => {
    const account = logIn()
    const router = renderAt('/discover')
    const instance = await playNightBus()
    const { modal } = await openPicker(player())
    fireEvent.click(within(modal).getByRole('checkbox', { name: 'Late night' }))
    await waitFor(() => expect(account.playlists![0]!.songs).toEqual([NIGHT_BUS]))
    fireEvent.click(within(modal).getByRole('button', { name: 'Close' }))
    expect(dialog()).toBeNull()

    await act(() => router.navigate('/library'))
    const library = await screen.findByRole('list', { name: 'Your Library' })
    await waitFor(() =>
      expect(within(library).getByRole('link', { name: /Late night/ })).toHaveTextContent(
        '1 cover',
      ),
    )
    expect(FakePlayer.instances).toEqual([instance])
    expect(instance.calls).toEqual([])
  })

  it('asks a guest to log in first, with no automatic action afterwards', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ focus: vi.fn() } as unknown as Window)
    renderAt('/discover')
    await playNightBus()
    fireEvent.click(
      await within(player()).findByRole('button', {
        name: 'Log in to add Night Bus by The Tidewater Choir to a playlist',
      }),
    )
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/google?from=%2Fdiscover&mode=popup'),
      'coverly-login',
      expect.any(String),
    )
    expect(dialog()).toBeNull()

    const account = logIn()
    const channel = new BroadcastChannel(AUTH_CHANNEL)
    channel.postMessage({ type: 'coverly:auth', status: 'success' })
    channel.close()
    await within(player()).findByRole('button', { name: ADD_NIGHT_BUS })
    expect(dialog()).toBeNull()
    expect(account.playlists!.map((p) => p.songs)).toEqual([[], [NIGHT_BUS]])
  })
})
