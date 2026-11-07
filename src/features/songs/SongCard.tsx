import { TagLink, cx } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { discoverOne } from '../discover/useFilters'
import { displayTitle, tagLabel } from './format'
import type { CoverSong } from './types'
import { PlayableCoverArt } from './PlayableCoverArt'

type SongCardProps = {
  song: CoverSong
  /** Also show the original artist (off by default, so existing uses stay as they are). */
  showOriginal?: boolean
  className?: string
}

/** A cover as a card. Its artwork is the Play/Pause button (PlayableCoverArt). */
export function SongCard({ song, showOriginal = false, className }: SongCardProps) {
  const title = displayTitle(song.title)
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
      <PlayableCoverArt song={song} artClassName="rounded-card" />
      <div className="grid gap-y-2">
        <div className="min-w-0">
          {/* At most two lines; words break only if one alone is wider than the card. */}
          <h3 className="type-row m-0 line-clamp-2 text-[1.25rem] break-words" title={title}>
            {title}
          </h3>
          <p className="m-0 truncate text-[0.9375rem] text-fg-soft">
            by <ArtistLinks artists={song.artists} role="artist" />
          </p>
          {showOriginal && song.originalArtists.length > 0 && (
            <p className="type-meta m-0 mt-0.5 truncate text-fg-soft">
              <span className="font-semibold">Original</span>{' '}
              <ArtistLinks artists={song.originalArtists} role="songBy" />
            </p>
          )}
        </div>
        {labels.length > 0 && (
          <ul aria-label="Labels" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
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
