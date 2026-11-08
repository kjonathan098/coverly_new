import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { songFixtures } from '../../mocks/fixtures/songs'
import { isPlayable } from '../player/playback'
import { parseSongs } from '../songs/contract'
import { displayTitle } from '../songs/format'
import { BangerOfTheWeek } from './BangerOfTheWeek'
import { BANGER_OF_THE_WEEK, type BangerFeature } from './bangerFeature'

const catalog = parseSongs(songFixtures)
const playable = catalog.find((s) => isPlayable(s) && s.originalArtists.length > 0)!
const silent = catalog.find((s) => !s.video)!

function renderFeature(feature: BangerFeature) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <BangerOfTheWeek songs={catalog} feature={feature} />,
    },
  ])
  return render(<RouterProvider router={router} />)
}

describe('Banger of the Week (configuration)', () => {
  it('shows the chosen song from the catalog, with its comment and edition label', () => {
    renderFeature({ ...BANGER_OF_THE_WEEK, songId: playable.id, comment: 'A test comment.' })
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      displayTitle(playable.title),
    )
    expect(screen.getByText('A test comment.')).toBeInTheDocument()
    expect(screen.getByText('The Weekly Drop / 001')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Listen to this banger: / })).toBeInTheDocument()
  })

  it('shows nothing, not a stand-in song, when the chosen song is not in the catalog', () => {
    const { container } = renderFeature({ ...BANGER_OF_THE_WEEK, songId: 'missing' })
    expect(container).toBeEmptyDOMElement()
  })

  it('offers no Listen action for a song without a video', () => {
    renderFeature({ ...BANGER_OF_THE_WEEK, songId: silent.id })
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(displayTitle(silent.title))
    expect(screen.queryByRole('button')).toBeNull()
  })
})
