import type { CSSProperties } from 'react'
import type { Recording } from '../features/recordings/types'
import { Button } from './Button'
import { cx } from './cx'
import { PauseIcon, PlayIcon } from './Icons'
import { Sleeve } from './Sleeve'
import { TagList } from './Tag'

type RecordingTileProps = {
  recording: Recording
  /** The version's color: ORIGINAL_COLOR for originals, versionColor() for covers. */
  color: string
  /** row: one line in a list of versions. feature: the anchor panel, usually the original. */
  variant?: 'row' | 'feature'
  /** How this version differs, in a few words. Falls back to the recording's title. */
  note?: string
  /** Called when the reader presses play. Without it, no play button is shown. */
  onPlay?: (recording: Recording) => void
  playing?: boolean
  className?: string
}

const artistNames = (recording: Recording) => recording.artists.map((a) => a.name).join(', ')

function roleLabel(recording: Recording) {
  if (recording.kind === 'original') return 'The original'
  return recording.originalRecordingId ? 'Cover' : 'Cover, original not linked yet'
}

function youtubeUrl({ videoId, startSeconds }: NonNullable<Recording['source']>) {
  const url = new URL('https://www.youtube.com/watch')
  url.searchParams.set('v', videoId)
  if (startSeconds) url.searchParams.set('t', `${startSeconds}s`)
  return url.toString()
}

/**
 * What a reader can do to hear this recording. Never shows a control that cannot work:
 * no source means a plain note, a source without a player means an outbound link.
 */
function Listen({
  recording,
  variant,
  onPlay,
  playing = false,
}: Pick<RecordingTileProps, 'recording' | 'variant' | 'onPlay' | 'playing'>) {
  const name = `${recording.title} by ${artistNames(recording)}`

  if (!recording.source) {
    return <p className="type-meta text-fg-soft">No playable source yet</p>
  }

  if (!onPlay) {
    return (
      <a
        href={youtubeUrl(recording.source)}
        target="_blank"
        rel="noopener noreferrer"
        className="type-meta font-semibold text-fg underline decoration-2 underline-offset-[0.3em]"
      >
        Watch on YouTube<span className="sr-only"> (opens a new tab): {name}</span>
      </a>
    )
  }

  if (variant === 'feature') {
    return (
      <Button
        size="lg"
        icon={playing ? <PauseIcon /> : <PlayIcon />}
        aria-pressed={playing}
        onClick={() => onPlay(recording)}
        className="w-full justify-start"
      >
        {playing ? 'Pause' : 'Play'}{' '}
        {recording.kind === 'original' ? 'the original' : 'this version'}
      </Button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={playing}
      aria-label={`${playing ? 'Pause' : 'Play'} ${name}`}
      onClick={() => onPlay(recording)}
      className={cx(
        'grid size-11 cursor-pointer place-items-center rounded-pill transition-colors duration-(--duration-fast) *:size-5',
        playing
          ? 'bg-pink text-ink'
          : 'text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] hover:bg-pink hover:text-ink hover:shadow-none',
      )}
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
    </button>
  )
}

export function RecordingTile({
  recording,
  color,
  variant = 'row',
  note,
  onPlay,
  playing = false,
  className,
}: RecordingTileProps) {
  const tags = [...recording.genres, ...recording.performanceStyles, ...recording.moods]
  const yearLabel = recording.year ? String(recording.year).slice(-2) : undefined

  if (variant === 'feature') {
    return (
      <article
        style={{ '--version': color } as CSSProperties}
        className={cx(
          'grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 rounded-panel bg-raised p-4 shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--version)_55%,transparent)] tablet:grid-cols-[8.5rem_minmax(0,1fr)]',
          className,
        )}
      >
        <Sleeve color={color} label={yearLabel} size="lg" />
        <div className="grid min-w-0 gap-1.5">
          <p className="type-meta font-semibold text-accent">{roleLabel(recording)}</p>
          <h3 className="type-card m-0 text-[clamp(1.5rem,2vw,2.1rem)] [overflow-wrap:anywhere]">
            {recording.title}
          </h3>
          <p className="text-fg-soft">
            {artistNames(recording)}
            {recording.year && `, ${recording.year}`}
          </p>
          <TagList tags={tags} className="mt-1" />
        </div>
        <div className="col-span-2">
          <Listen recording={recording} variant="feature" onPlay={onPlay} playing={playing} />
        </div>
      </article>
    )
  }

  const canPlay = Boolean(recording.source && onPlay)
  const year = recording.year ?? (
    <>
      <span aria-hidden="true">–</span>
      <span className="sr-only">Year unknown</span>
    </>
  )

  return (
    <article
      style={{ '--version': color } as CSSProperties}
      className={cx(
        'grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 rounded-card px-2.5 py-3 transition-colors duration-(--duration-fast) tablet:grid-cols-[3.4rem_3.25rem_minmax(0,1fr)_auto] tablet:gap-x-4',
        playing
          ? 'bg-raised shadow-[inset_4px_0_0_var(--version)]'
          : 'hover:bg-[color-mix(in_srgb,var(--surface-fg)_6%,transparent)]',
        className,
      )}
    >
      <p className="type-row hidden pt-2 text-[1.4rem] tablet:block">{year}</p>
      <Sleeve color={color} label={yearLabel} />
      <div className="grid min-w-0 gap-0.5">
        <p className="type-meta text-fg-soft tablet:hidden">
          {recording.year
            ? `${recording.year}, ${roleLabel(recording).toLowerCase()}`
            : roleLabel(recording)}
        </p>
        <h3 className="type-row m-0 [overflow-wrap:anywhere]">{artistNames(recording)}</h3>
        <p className="text-[0.9375rem] text-fg-soft">{note ?? recording.title}</p>
        <TagList tags={tags} className="mt-1.5" />
        {/* Notes and links read as text, so they stay in the text column; only a real button sits at the side */}
        {!canPlay && (
          <div className="mt-1.5">
            <Listen recording={recording} variant="row" />
          </div>
        )}
      </div>
      {canPlay && (
        <div className="self-center">
          <Listen recording={recording} variant="row" onPlay={onPlay} playing={playing} />
        </div>
      )}
    </article>
  )
}
