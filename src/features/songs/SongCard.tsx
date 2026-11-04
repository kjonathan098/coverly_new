import { PlayIcon, StopIcon, Tag, cx } from '../../ui'
import { artistList, displayTitle, tagLabel } from './format'
import type { CoverSong } from './types'
import { CoverArt } from './CoverArt'

type SongCardProps = {
  song: CoverSong
  playing: boolean
  onToggle: () => void
  className?: string
}

export function SongCard({ song, playing, onToggle, className }: SongCardProps) {
  const title = displayTitle(song.title)
  const by = artistList(song.artists)
  const labels = [
    song.genres[0] && { type: 'genre' as const, name: song.genres[0].name },
    song.moods[0] && { type: 'mood' as const, name: song.moods[0].name },
    song.styles[0] && { type: 'performanceStyle' as const, name: song.styles[0].name },
  ].filter(Boolean) as { type: 'genre' | 'mood' | 'performanceStyle'; name: string }[]

  return (
    <article className={cx('group grid content-start gap-3', className)}>
      <CoverArt song={song} playing={playing} className="rounded-card" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="type-row m-0 text-[1.25rem] [overflow-wrap:anywhere]">{title}</h3>
          <p className="text-[0.9375rem] text-fg-soft">by {by}</p>
        </div>
        {song.video ? (
          <button
            type="button"
            aria-pressed={playing}
            aria-label={`${playing ? 'Stop' : 'Play'} ${title} by ${by}`}
            onClick={onToggle}
            className={cx(
              'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill transition-colors duration-(--duration-fast) *:size-5',
              playing
                ? 'bg-pink text-ink'
                : 'text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] hover:bg-pink hover:text-ink hover:shadow-none',
            )}
          >
            {playing ? <StopIcon /> : <PlayIcon />}
          </button>
        ) : (
          <p className="type-meta pt-1 text-fg-soft">No video yet</p>
        )}
        {labels.length > 0 && (
          <ul aria-label="Labels" className="col-span-2 m-0 flex list-none flex-wrap gap-1.5 p-0">
            {labels.map((label) => (
              <li key={label.type} className="flex">
                <Tag type={label.type}>{tagLabel(label.name)}</Tag>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
