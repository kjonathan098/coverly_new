import { PauseIcon, PlayIcon, TagLink, cx } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { discoverOne } from '../discover/useFilters'
import { FavoriteButton } from '../favorites/FavoriteButton'
import { play, playVerb, usePlaybackOf } from '../player/playback'
import { artistList, displayTitle, tagLabel } from './format'
import type { CoverSong } from './types'
import { CoverArt } from './CoverArt'

type SongCardProps = {
  song: CoverSong
  /** Also show the original artist (off by default, so existing uses stay as they are). */
  showOriginal?: boolean
  className?: string
}

/** A cover as a card. Its button drives the app shell's player; the artwork shows when it's loaded. */
export function SongCard({ song, showOriginal = false, className }: SongCardProps) {
  const status = usePlaybackOf(song.id)
  const current = status !== null
  const verb = playVerb(status)
  const title = displayTitle(song.title)
  const by = artistList(song.artists)
  // Each label opens a fresh Discover for it, in its own group.
  const labels = [
    song.genres[0] && {
      type: 'genre' as const,
      key: 'genre' as const,
      group: 'Cover genre',
      name: song.genres[0].name,
    },
    song.moods[0] && {
      type: 'mood' as const,
      key: 'mood' as const,
      group: 'Mood',
      name: song.moods[0].name,
    },
    song.styles[0] && {
      type: 'performanceStyle' as const,
      key: 'style' as const,
      group: 'Performance style',
      name: song.styles[0].name,
    },
  ].filter((label) => Boolean(label)) as {
    type: 'genre' | 'mood' | 'performanceStyle'
    key: 'genre' | 'mood' | 'style'
    group: string
    name: string
  }[]

  return (
    <article className={cx('group grid content-start gap-3', className)}>
      <CoverArt song={song} status={status} className="rounded-card" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="type-row m-0 text-[1.25rem] [overflow-wrap:anywhere]">{title}</h3>
          <p className="text-[0.9375rem] text-fg-soft">
            by <ArtistLinks artists={song.artists} role="artist" />
          </p>
          {showOriginal && song.originalArtists.length > 0 && (
            <p className="type-meta mt-0.5 text-fg-soft">
              <span className="font-semibold">Original</span>{' '}
              <ArtistLinks artists={song.originalArtists} role="songBy" />
            </p>
          )}
        </div>
        <div className="flex items-start">
          <FavoriteButton song={song} />
          {song.video ? (
            <button
              type="button"
              aria-label={`${verb} ${title} by ${by}`}
              onClick={() => play(song)}
              className={cx(
                'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill transition-colors duration-(--duration-fast) *:size-5',
                current
                  ? 'bg-pink text-ink'
                  : 'text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] hover:bg-pink hover:text-ink hover:shadow-none',
              )}
            >
              {verb === 'Pause' ? <PauseIcon /> : <PlayIcon />}
            </button>
          ) : (
            <p className="type-meta pt-1 text-fg-soft">No video yet</p>
          )}
        </div>
        {labels.length > 0 && (
          <ul aria-label="Labels" className="col-span-2 m-0 flex list-none flex-wrap gap-1.5 p-0">
            {labels.map((label) => (
              <li key={label.type} className="flex">
                <TagLink
                  type={label.type}
                  label={label.group}
                  to={discoverOne(label.key, label.name)}
                >
                  {tagLabel(label.name)}
                </TagLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
