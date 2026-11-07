import { useId, useState } from 'react'
import { Link } from 'react-router'
import { ChevronIcon, PauseIcon, PlayIcon, TagLink, cx } from '../../ui'
import { PlaybackBadge } from '../player/PlaybackBadge'
import { play, playVerb, usePlaybackOf } from '../player/playback'
import type { FacetKey, Filters } from '../songs/discover'
import { CoverArt } from '../songs/CoverArt'
import { artistList, displayTitle, tagLabel } from '../songs/format'
import type { CoverSong, Facet } from '../songs/types'
import { ArtistLinks } from './ArtistLinks'
import { FILTER_GROUPS } from './groups'
import { discoverOne } from './useFilters'
import { FavoriteButton } from '../favorites/FavoriteButton'

type SongRowProps = {
  song: CoverSong
  /** The active filters, so a tag that's already on can show it. */
  filters: Filters
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
export function SongRow({ song, filters }: SongRowProps) {
  // This row's recording in the shared player, if it's the one loaded there.
  const status = usePlaybackOf(song.id)
  const current = status !== null
  const verb = playVerb(status)
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const title = displayTitle(song.title)
  const by = artistList(song.artists)

  return (
    <li
      className={cx(
        'group relative rounded-card transition-colors duration-(--duration-fast)',
        current ? 'bg-raised' : 'hover:bg-[color-mix(in_srgb,var(--surface-fg)_6%,transparent)]',
      )}
    >
      {current && (
        <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-pill bg-pink" />
      )}
      <article
        aria-label={`${title}, covered by ${by}`}
        aria-current={current ? 'true' : undefined}
        className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-2 py-2.5 tablet:grid-cols-[7rem_minmax(0,1fr)_auto] @min-[45rem]:grid-cols-[auto_6rem_minmax(0,1.6fr)_minmax(0,1fr)_auto_auto] @min-[45rem]:gap-x-4 @min-[45rem]:px-3 @min-[60rem]:grid-cols-[auto_7rem_minmax(0,2fr)_minmax(0,1.25fr)_minmax(0,1.6fr)_auto_auto] @min-[60rem]:gap-x-5 @min-[60rem]:px-3"
      >
        <div className="col-start-3 row-start-1 @min-[45rem]:col-start-1">
          {song.video ? (
            <button
              type="button"
              aria-label={`${verb} ${title} by ${by}`}
              onClick={() => play(song)}
              className={cx(
                'grid size-11 cursor-pointer place-items-center rounded-pill transition-colors duration-(--duration-fast) *:size-5',
                current
                  ? 'bg-pink text-ink'
                  : 'text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] group-hover:bg-pink group-hover:text-ink group-hover:shadow-none',
              )}
            >
              {verb === 'Pause' ? <PauseIcon /> : <PlayIcon />}
            </button>
          ) : (
            <span className="type-meta block w-11 text-center leading-tight text-fg-soft">
              No video
            </span>
          )}
        </div>

        <CoverArt
          song={song}
          className="col-start-1 row-span-2 row-start-1 self-start rounded-control @min-[45rem]:col-start-2 @min-[45rem]:row-span-1 @min-[45rem]:self-center"
        />

        <div className="col-start-2 row-start-1 min-w-0 @min-[45rem]:col-start-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3
              className={cx(
                'type-row m-0 line-clamp-2 min-w-0 text-[1.0625rem] tablet:text-[1.1875rem] @min-[60rem]:line-clamp-1',
                current && 'text-pink',
              )}
            >
              {title}
            </h3>
            {status && <PlaybackBadge status={status} />}
          </div>
          <p className="m-0 text-label font-medium text-fg @min-[60rem]:truncate">
            <span className="sr-only">Cover artist: </span>
            <ArtistLinks artists={song.artists} role="artist" />
          </p>
          <p className="m-0 text-meta text-fg-soft @min-[45rem]:hidden">
            <span className="font-semibold">Original</span>
            <span className="sr-only"> artist:</span> · <OriginalArtists song={song} />
          </p>
        </div>

        <div className="hidden min-w-0 @min-[45rem]:col-start-4 @min-[45rem]:row-start-1 @min-[45rem]:block">
          <p className="type-meta m-0 font-semibold text-fg-soft">Original artist</p>
          <p className="m-0 truncate text-label text-fg-soft">
            <OriginalArtists song={song} />
          </p>
        </div>

        {/* Middle width: a second line under the title and original artist. Full width: its own column. */}
        <div className="hidden min-w-0 @min-[45rem]:col-span-2 @min-[45rem]:col-start-3 @min-[45rem]:row-start-2 @min-[45rem]:flex @min-[45rem]:flex-wrap @min-[45rem]:items-center @min-[45rem]:gap-x-2 @min-[45rem]:gap-y-1 @min-[60rem]:col-span-1 @min-[60rem]:col-start-5 @min-[60rem]:row-start-1 @min-[60rem]:block">
          {song.genres.length > 0 ? (
            <ul aria-label="Cover genres" className="m-0 flex list-none flex-wrap gap-1 p-0">
              {song.genres.map((genre) => (
                <li key={genre.id} className="flex">
                  <TagLink
                    type="genre"
                    label="Cover genre"
                    to={discoverOne('genre', genre.name)}
                    current={filters.genre.includes(genre.name)}
                  >
                    {tagLabel(genre.name)}
                  </TagLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="type-meta m-0 text-fg-soft">Cover genre not listed</p>
          )}
          {song.subGenres.length > 0 && (
            <p className="type-meta m-0 min-w-0 truncate text-fg-soft @min-[60rem]:mt-1">
              {song.subGenres.map((sub, i) => (
                <span key={sub.id}>
                  {i > 0 && ' · '}
                  <Link
                    to={discoverOne('sub', sub.name)}
                    aria-label={`Subgenre: ${tagLabel(sub.name)}`}
                    className="no-underline decoration-2 underline-offset-[0.2em] hover:text-fg hover:underline"
                  >
                    {tagLabel(sub.name)}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Phones: under the play button. Wider: just before Details. */}
        <FavoriteButton
          song={song}
          className="col-start-3 row-start-2 @min-[45rem]:col-start-5 @min-[45rem]:row-start-1 @min-[60rem]:col-start-6"
        />

        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen(!open)}
          className="type-meta col-start-2 row-start-2 inline-flex min-h-9 cursor-pointer items-center gap-1 justify-self-start font-semibold text-fg-soft hover:text-fg @min-[45rem]:col-start-6 @min-[45rem]:row-start-1 @min-[45rem]:min-h-11 @min-[45rem]:justify-self-end @min-[60rem]:col-start-7 @min-[60rem]:justify-self-end"
        >
          Details
          <span className="sr-only"> for {title}</span>
          <ChevronIcon className={cx('size-4 transition-transform', open && 'rotate-180')} />
        </button>
      </article>

      <div
        id={detailsId}
        hidden={!open}
        className="px-2 pb-4 tablet:pl-[calc(7rem+1.25rem)] @min-[45rem]:pl-[calc(2.75rem+6rem+2rem+0.75rem)] @min-[60rem]:pl-[calc(2.75rem+7rem+2.5rem+0.75rem)]"
      >
        <dl className="m-0 grid gap-3 tablet:grid-cols-2 @min-[60rem]:grid-cols-4">
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
                          <TagLink
                            type={group.tagType!}
                            label={group.title}
                            to={discoverOne(group.key, value.name)}
                            current={filters[group.key].includes(value.name)}
                            className="min-h-9 px-3"
                          >
                            {tagLabel(value.name)}
                          </TagLink>
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

function OriginalArtists({ song }: { song: CoverSong }) {
  if (song.originalArtists.length === 0) return <span>Not listed</span>
  return <ArtistLinks artists={song.originalArtists} role="songBy" />
}
