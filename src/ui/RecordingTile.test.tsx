import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Recording } from '../features/recordings/types'
import { PLACEHOLDER_IDS, placeholderRecordings } from '../mocks/fixtures/recordings'
import { RecordingTile } from './RecordingTile'

const fixture = (id: string) => placeholderRecordings.find((r) => r.id === id)!
const withSource = (r: Recording): Recording => ({
  ...r,
  source: { platform: 'youtube', videoId: 'abc123', startSeconds: 42 },
})

describe('RecordingTile', () => {
  it.each(['row', 'feature'] as const)(
    'shows no play control when the recording has no source (%s)',
    (variant) => {
      render(
        <RecordingTile
          recording={fixture(PLACEHOLDER_IDS.linkedCover)}
          color="var(--color-turquoise)"
          variant={variant}
          onPlay={vi.fn()}
        />,
      )
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
      expect(screen.getByText('No playable source yet')).toBeInTheDocument()
    },
  )

  it('shows a play toggle when there is a source and a player', () => {
    const onPlay = vi.fn()
    const recording = withSource(fixture(PLACEHOLDER_IDS.linkedCover))
    const { rerender } = render(
      <RecordingTile recording={recording} color="var(--color-turquoise)" onPlay={onPlay} />,
    )
    const button = screen.getByRole('button', {
      name: /^Play Placeholder Song A by Placeholder Artist 2$/,
    })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)
    expect(onPlay).toHaveBeenCalledWith(recording)

    rerender(
      <RecordingTile
        recording={recording}
        color="var(--color-turquoise)"
        onPlay={onPlay}
        playing
      />,
    )
    expect(screen.getByRole('button', { name: /^Pause/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('links out to the source instead of faking a player when there is no handler', () => {
    render(
      <RecordingTile
        recording={withSource(fixture(PLACEHOLDER_IDS.linkedCover))}
        color="var(--color-turquoise)"
      />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Watch on YouTube/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abc123&t=42s',
    )
  })

  it('names the role from explicit links only', () => {
    render(
      <>
        <RecordingTile
          recording={fixture(PLACEHOLDER_IDS.originalWithCovers)}
          color="pink"
          variant="feature"
        />
        <RecordingTile recording={fixture(PLACEHOLDER_IDS.unlinkedCover)} color="blue" />
      </>,
    )
    expect(screen.getByText('The original')).toBeInTheDocument()
    expect(screen.getByText(/cover, original not linked yet/i)).toBeInTheDocument()
  })
})
