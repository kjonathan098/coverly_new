import { useId, useMemo, useState } from 'react'
import { Button, CloseIcon, Container } from '../../ui'
import {
  NO_FILTERS,
  filterSongs,
  hasFilters,
  selectedCount,
  sortSongs,
  type Filters,
  type SortKey,
} from '../songs/discover'
import { plural } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { FilterBar, FilterSheet } from './FilterControls'
import { FILTER_GROUPS, LINK_ONLY, toggleValue } from './groups'
import { SearchBox } from './SearchBox'
import { SongRow } from './SongRow'

const PAGE = 30

type Change = (filters: Filters, options?: { replace?: boolean }) => void

type DiscoverProps = {
  songs: CoverSong[]
  filters: Filters
  sort: SortKey
  onChange: Change
  onSort: (sort: SortKey) => void
}

/** Every active filter as a removable chip, named by its group so roles never blur together. */
function ActiveFilters({ filters, onChange }: { filters: Filters; onChange: Change }) {
  const chips = [...FILTER_GROUPS, ...LINK_ONLY].flatMap((group) =>
    filters[group.key].map((value) => ({ group, value })),
  )
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
      {chips.map(({ group, value }) => (
        <button
          key={`${group.key}:${value}`}
          type="button"
          aria-label={`Remove ${group.title}: ${group.label(value)}`}
          onClick={() => onChange(toggleValue(filters, group.key, value))}
          className="type-chip inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-pill bg-[color-mix(in_srgb,var(--color-pink)_18%,transparent)] py-1 pr-2 pl-3 text-fg shadow-[inset_0_0_0_1.5px_var(--color-pink)] hover:bg-pink hover:text-ink"
        >
          <span className="font-normal opacity-80">{group.title}:</span>
          {group.label(value)}
          <CloseIcon className="size-3.5" />
        </button>
      ))}
      <Button variant="quiet" onClick={() => onChange({ ...NO_FILTERS, q: filters.q })}>
        Clear all
      </Button>
    </div>
  )
}

/** Search, filters and results. State that must survive a reload lives in the URL, not here. */
export function Discover({ songs, filters, sort, onChange, onSort }: DiscoverProps) {
  const [limit, setLimit] = useState(PAGE)
  const results = useMemo(
    () => sortSongs(filterSongs(songs, filters), sort),
    [songs, filters, sort],
  )
  const sortId = useId()
  const filtered = hasFilters(filters)

  const change: Change = (next, options) => {
    setLimit(PAGE)
    onChange(next, options)
  }

  return (
    <>
      {/*
        A full-width band. z-[8] keeps it under the page's grain overlay (z 9), so one texture
        covers both, yet above the rows scrolling beneath it.
      */}
      <div className="sticky top-14 z-[8] bg-surface py-3">
        <Container>
          <div className="flex items-center gap-2">
            <SearchBox songs={songs} filters={filters} onChange={change} />
            <div className="tablet:hidden">
              <FilterSheet songs={songs} filters={filters} onChange={change} />
            </div>
          </div>
          <div className="mt-3 hidden tablet:block">
            <FilterBar songs={songs} filters={filters} onChange={change} />
          </div>
        </Container>
      </div>

      <Container>
        <div className="mt-3 grid gap-3">
          <ActiveFilters filters={filters} onChange={change} />
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b-[1.5px] border-line pb-2">
            <p aria-live="polite" className="type-label m-0">
              {filtered
                ? `${plural(results.length, 'cover')} match`
                : `All ${plural(songs.length, 'cover')}`}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor={sortId} className="type-meta text-fg-soft">
                Sort by
              </label>
              <select
                id={sortId}
                value={sort}
                onChange={(event) => onSort(event.target.value as SortKey)}
                className="min-h-10 cursor-pointer rounded-control border-0 bg-raised px-3 text-label font-medium text-fg shadow-[inset_0_0_0_1.5px_var(--surface-line)]"
              >
                <option value="catalog">Catalog order</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="mt-6 grid justify-items-start gap-4 rounded-panel bg-raised p-6">
            <p className="type-card m-0">
              {filters.q.trim() ? `No covers match “${filters.q.trim()}”` : 'No covers match'}
              {selectedCount(filters) > 0 && ' with these filters'}.
            </p>
            <p className="m-0 max-w-[52ch] text-fg-soft">
              Search looks at song titles, original artists and cover artists. Each extra filter
              narrows the list; remove one, or start again from the whole catalog.
            </p>
            <div className="flex flex-wrap gap-3">
              {filters.q.trim() && (
                <Button variant="secondary" onClick={() => change({ ...filters, q: '' })}>
                  Clear search
                </Button>
              )}
              <Button onClick={() => change({ ...NO_FILTERS })}>Clear everything</Button>
            </div>
          </div>
        ) : (
          <>
            {/* A size container: rows lay themselves out by the room they have, which shrinks when the
                player docks beside the page (layout B), not by the window's width. */}
            <ol aria-label="Results" className="@container m-0 mt-2 grid list-none gap-1 p-0">
              {results.slice(0, limit).map((song) => (
                <SongRow key={song.id} song={song} filters={filters} />
              ))}
            </ol>
            {results.length > limit && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" onClick={() => setLimit(limit + PAGE)}>
                  Show {Math.min(PAGE, results.length - limit)} more of {results.length - limit}{' '}
                  left
                </Button>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  )
}
