import { useId, useMemo, useState } from 'react'
import { cx } from '../../ui'
import { facetCounts, fold, type Filters } from '../songs/discover'
import type { CoverSong } from '../songs/types'
import { toggleValue, type FilterGroup } from './groups'

// Long lists (45 original artists, 79 cover artists, 57 subgenres) get their own find field.
const SEARCHABLE = 12

type FacetOptionsProps = {
  group: FilterGroup
  songs: readonly CoverSong[]
  filters: Filters
  onChange: (filters: Filters) => void
  className?: string
}

/**
 * One group's values as checkboxes, each with the number of covers it would leave alongside the
 * other groups (picking more in the same group widens the result). Selected values come first;
 * a value that would leave nothing is disabled instead of leading to an empty page.
 */
export function FacetOptions({ group, songs, filters, onChange, className }: FacetOptionsProps) {
  const [find, setFind] = useState('')
  const findId = useId()
  const counts = useMemo(() => facetCounts(songs, filters, group.key), [songs, filters, group.key])
  const selected = filters[group.key]
  const query = fold(find.trim())
  const shown = counts
    .filter(({ name }) => !query || fold(group.label(name)).includes(query))
    .sort((a, b) => Number(selected.includes(b.name)) - Number(selected.includes(a.name)))

  return (
    <fieldset className={cx('m-0 min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{group.title}</legend>
      {counts.length > SEARCHABLE && (
        <>
          <label htmlFor={findId} className="sr-only">
            Find {group.noun}
          </label>
          <input
            id={findId}
            type="search"
            value={find}
            onChange={(event) => setFind(event.target.value)}
            placeholder={`Find ${group.noun}`}
            className="mb-2 min-h-11 w-full rounded-control border-0 bg-surface px-3 text-label text-fg shadow-[inset_0_0_0_1.5px_var(--surface-line)] placeholder:text-fg-soft focus-visible:shadow-[inset_0_0_0_2px_var(--color-pink)]"
          />
        </>
      )}
      {/* relative: keeps the visually hidden text inside when a panel scrolls this list. */}
      <ul className="relative m-0 list-none p-0">
        {shown.map(({ name, count }) => {
          const checked = selected.includes(name)
          const disabled = count === 0 && !checked
          return (
            <li key={name}>
              <label
                className={cx(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 text-label hover:bg-[color-mix(in_srgb,var(--surface-fg)_10%,transparent)]',
                  disabled && 'cursor-default opacity-40 hover:bg-transparent',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(toggleValue(filters, group.key, name))}
                  className="size-[1.125rem] shrink-0 accent-pink"
                />
                <span className="min-w-0 flex-1 truncate font-medium">{group.label(name)}</span>{' '}
                <span className="text-meta text-fg-soft tabular-nums">
                  {count} <span className="sr-only">{count === 1 ? 'cover' : 'covers'}</span>
                </span>
              </label>
            </li>
          )
        })}
        {shown.length === 0 && (
          <li className="px-2 py-3 text-label text-fg-soft">
            No {group.noun} match “{find.trim()}”.
          </li>
        )}
      </ul>
    </fieldset>
  )
}
