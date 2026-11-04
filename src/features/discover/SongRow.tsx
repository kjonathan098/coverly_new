import { Fragment, useId, useState } from 'react'
import { ChevronIcon, PlayIcon, StopIcon, Tag, ToggleTag, cx } from '../../ui'
import type { FacetKey, Filters } from '../songs/discover'
import { CoverArt } from '../songs/CoverArt'
import { artistList, displayName, displayTitle, tagLabel } from '../songs/format'
import type { CoverArtist, CoverSong, Facet } from '../songs/types'
import { FILTER_GROUPS } from './groups'

type SongRowProps = {
  song: CoverSong
  playing: boolean
  onPlay: () => void
  filters: Filters
  /**
   * Narrow Discover by one value. Artist names add their filter (never remove it); the tags in
   * Details toggle theirs, and show whether it's on.
   */
  onFilter: (key: FacetKey, value: string, mode: 'add' | 'toggle') => void
}

/** Names that each narrow Discover to that artist, in the role they're listed under. */
function ArtistLinks({
  artists,
  role,
  onFilter,
}: {
  artists: CoverArtist[]
  role: 'artist' | 'songBy'
  onFilter: SongRowProps['onFilter']
}) {
  const what = role === 'artist' ? 'cover artist' : 'original artist'
  return artists.map((artist, i) => (
    <Fragment key={artist.id}>
      {i > 0 && (i === artists.length - 1 ? ' and ' : ', ')}
      <button
        type="button"
        onClick={() => onFilter(role, artist.name, 'add')}
        aria-label={`Show covers with ${what} ${displayName(artist.name)}`}
        className="inline cursor-pointer text-left underline-offset-[0.2em] hover:text-fg hover:underline"
      >
        {displayName(artist.name)}
      </button>
    </Fragment>
  ))
}

const DETAIL_GROUPS = FILTER_GROUPS.filter((g) => g.tagType) as (typeof FILTER_GROUPS)[number][]

function valuesOf(song: CoverSong, key: FacetKey): Facet[] {
  switch (key) {
    case 'genre':
      return song.genres
    case 'sub':
      return song.subGenres
    case 'style':
      return song.styles
    case 'mood':
      return song.moods
    default:
      return []
  }
}

/**
 * One cover in the results. Always visible: artwork, title, cover artist, original artist and
 * play; on wider screens also the cover genres with their subgenres. Details opens every label.
 * Nothing is inferred or filled in: a missing value is said to be missing, or left out.
 */
export function SongRow({ song, playing, onPlay, filters, onFilter }: SongRowProps) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const title = displayTitle(song.title)
  const by = artistList(song.artists)

  return (
    <li
      className={cx(
        'group relative rounded-card transition-colors duration-(--duration-fast)',
        playing ? 'bg-raised' : 'hover:bg-[color-mix(in_srgb,var(--surface-fg)_6%,transparent)]',
      )}
    >
      {playing && (
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-pill bg-pink" />
      )}
      <article
        aria-label={`${title}, covered by ${by}`}
        aria-current={playing ? 'true' : undefined}
        className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-2 py-2.5 tablet:grid-cols-[7rem_minmax(0,1fr)_auto] desktop:grid-cols-[auto_7rem_minmax(0,2fr)_minmax(0,1.25fr)_minmax(0,1.6fr)_auto] desktop:gap-x-5 desktop:px-3"
      >
        <div className="col-start-3 row-start-1 desktop:col-start-1">
          {song.video ? (
            <button
              type="button"
              aria-pressed={playing}
              aria-label={`${playing ? 'Stop' : 'Play'} ${title} by ${by}`}
              onClick={onPlay}
              className={cx(
                'grid size-11 cursor-pointer place-items-center rounded-pill transition-colors duration-(--duration-fast) *:size-5',
                playing
                  ? 'bg-pink text-ink'
                  : 'text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] group-hover:bg-pink group-hover:text-ink group-hover:shadow-none',
              )}
            >
              {playing ? <StopIcon /> : <PlayIcon />}
            </button>
          ) : (
            <span className="type-meta block w-11 text-center leading-tight text-fg-soft">
              No video
            </span>
          )}
        </div>

        <CoverArt
          song={song}
          className="col-start-1 row-span-2 row-start-1 self-start rounded-control desktop:col-start-2 desktop:row-span-1 desktop:self-center"
        />

        <div className="col-start-2 row-start-1 min-w-0 desktop:col-start-3">
          <h3
            className={cx(
              'type-row m-0 line-clamp-2 text-[1.0625rem] tablet:text-[1.1875rem] desktop:line-clamp-1',
              playing && 'text-pink',
            )}
          >
            {title}
            {playing && <span className="sr-only"> (now playing)</span>}
          </h3>
          <p className="m-0 text-label font-medium text-fg desktop:truncate">
            <span className="sr-only">Cover artist: </span>
            <ArtistLinks artists={song.artists} role="artist" onFilter={onFilter} />
          </p>
          <p className="m-0 text-meta text-fg-soft desktop:hidden">
            <span className="font-semibold">Original</span>
            <span className="sr-only"> artist:</span> ·{' '}
            <OriginalArtists song={song} onFilter={onFilter} />
          </p>
        </div>

        <div className="hidden min-w-0 desktop:col-start-4 desktop:row-start-1 desktop:block">
          <p className="type-meta m-0 font-semibold text-fg-soft">Original artist</p>
          <p className="m-0 truncate text-label text-fg-soft">
            <OriginalArtists song={song} onFilter={onFilter} />
          </p>
        </div>

        <div className="hidden min-w-0 desktop:col-start-5 desktop:row-start-1 desktop:block">
          {song.genres.length > 0 ? (
            <ul aria-label="Cover genres" className="m-0 flex list-none flex-wrap gap-1 p-0">
              {song.genres.map((genre) => (
                <li key={genre.id} className="flex">
                  <Tag type="genre">{tagLabel(genre.name)}</Tag>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-meta m-0 text-fg-soft">Cover genre not listed</p>
          )}
          {song.subGenres.length > 0 && (
            <p className="type-meta m-0 mt-1 truncate text-fg-soft">
              <span className="sr-only">Subgenres: </span>
              {song.subGenres.map((s) => tagLabel(s.name)).join(' · ')}
            </p>
          )}
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen(!open)}
          className="type-meta col-start-2 row-start-2 inline-flex min-h-9 cursor-pointer items-center gap-1 justify-self-start font-semibold text-fg-soft hover:text-fg desktop:col-start-6 desktop:row-start-1 desktop:min-h-11 desktop:justify-self-end"
        >
          Details
          <span className="sr-only"> for {title}</span>
          <ChevronIcon className={cx('size-4 transition-transform', open && 'rotate-180')} />
        </button>
      </article>

      <div
        id={detailsId}
        hidden={!open}
        className="px-2 pb-4 tablet:pl-[calc(7rem+1.25rem)] desktop:pl-[calc(2.75rem+7rem+2.5rem+0.75rem)]"
      >
        <dl className="m-0 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
          {DETAIL_GROUPS.map((group) => {
            const values = valuesOf(song, group.key)
            return (
              <div key={group.key}>
                <dt className="type-meta mb-1.5 font-semibold text-fg-soft">{group.title}</dt>
                <dd className="m-0">
                  {values.length === 0 ? (
                    <span className="type-meta text-fg-soft">Not listed</span>
                  ) : (
                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                      {values.map((value) => (
                        <li key={value.id} className="flex">
                          <ToggleTag
                            type={group.tagType!}
                            pressed={filters[group.key].includes(value.name)}
                            onClick={() => onFilter(group.key, value.name, 'toggle')}
                            aria-label={`${group.title}: ${tagLabel(value.name)}`}
                            className="min-h-9 px-3"
                          >
                            {tagLabel(value.name)}
                          </ToggleTag>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </li>
  )
}

function OriginalArtists({
  song,
  onFilter,
}: {
  song: CoverSong
  onFilter: SongRowProps['onFilter']
}) {
  if (song.originalArtists.length === 0) return <span>Not listed</span>
  return <ArtistLinks artists={song.originalArtists} role="songBy" onFilter={onFilter} />
}
