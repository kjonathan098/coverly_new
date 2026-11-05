import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CloseIcon, SearchIcon, cx } from '../../ui'
import { suggest, type Filters, type Suggestion } from '../songs/discover'
import { displayName, displayTitle, plural } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { toggleValue } from './groups'

type Change = (filters: Filters, options?: { replace?: boolean }) => void

const KINDS: { kind: Suggestion['kind']; title: string }[] = [
  { kind: 'songBy', title: 'Original artist' },
  { kind: 'artist', title: 'Cover artist' },
  { kind: 'title', title: 'Song' },
]

/**
 * Search filters as you type: titles, cover artists and original artists. Suggestions are an aid,
 * not a requirement. Picking an artist turns the text into a filter for that exact artist in that
 * exact role, which matters for artists who are both (Taylor Swift covers and is covered).
 * Follows the WAI-ARIA combobox pattern with a listbox popup.
 */
export function SearchBox({
  songs,
  filters,
  onChange,
}: {
  songs: readonly CoverSong[]
  filters: Filters
  onChange: Change
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const listId = `${id}-list`
  const optionId = (index: number) => `${id}-option-${index}`

  const suggestions = useMemo(
    () => (open ? suggest(songs, filters, filters.q) : []),
    [open, songs, filters],
  )
  const expanded = open && suggestions.length > 0

  const pick = (suggestion: Suggestion) => {
    if (suggestion.kind === 'title') onChange({ ...filters, q: suggestion.name })
    else onChange(toggleValue({ ...filters, q: '' }, suggestion.kind, suggestion.name))
    setOpen(false)
    setActive(-1)
    input.current?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const chosen = expanded ? suggestions[active] : undefined
      if (chosen) pick(chosen)
      else setOpen(false)
    } else if (event.key === 'Escape') {
      if (expanded) setOpen(false)
      else if (filters.q) onChange({ ...filters, q: '' }, { replace: true })
      setActive(-1)
    }
  }

  return (
    <form
      role="search"
      onSubmit={(event) => event.preventDefault()}
      className="relative min-w-0 flex-1"
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        Search songs, original artists and cover artists
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-fg-soft" />
      <input
        ref={input}
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        value={filters.q}
        onChange={(event) => {
          onChange({ ...filters, q: event.target.value }, { replace: true })
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Songs or artists"
        className="min-h-12 w-full rounded-pill border-0 bg-raised pr-12 pl-11 text-body text-fg shadow-[inset_0_0_0_1.5px_var(--surface-line)] placeholder:text-fg-soft focus-visible:shadow-[inset_0_0_0_2px_var(--color-pink)] [&::-webkit-search-cancel-button]:hidden"
      />
      {filters.q && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange({ ...filters, q: '' })
            input.current?.focus()
          }}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-pill text-fg-soft hover:bg-surface hover:text-fg"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-30 m-0 mt-2 max-h-[max(10rem,calc(100dvh_-_var(--player-inset,0px)_-_14rem))] list-none overflow-y-auto rounded-panel bg-raised p-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.6),inset_0_0_0_1px_var(--surface-line)]"
      >
        {KINDS.map(({ kind, title }) => {
          const items = suggestions.filter((s) => s.kind === kind)
          if (items.length === 0) return null
          return (
            <li key={kind} role="presentation">
              <p
                id={`${id}-${kind}`}
                className="type-meta m-0 px-2 pt-2 pb-1 font-semibold text-fg-soft"
              >
                {title}
              </p>
              <ul role="group" aria-labelledby={`${id}-${kind}`} className="m-0 list-none p-0">
                {items.map((suggestion) => {
                  // suggest() returns the groups in this order, so the position is the flat index.
                  const i = suggestions.indexOf(suggestion)
                  return (
                    <li
                      key={suggestion.name}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === active}
                      // Keep focus in the input, so picking doesn't blur and close the list first.
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(suggestion)}
                      className={cx(
                        'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-control px-2',
                        i === active ? 'bg-pink text-ink' : 'hover:bg-surface',
                      )}
                    >
                      <span className="min-w-0 truncate font-medium">
                        {kind === 'title'
                          ? displayTitle(suggestion.name)
                          : displayName(suggestion.name)}
                      </span>{' '}
                      <span className="text-meta tabular-nums opacity-75">
                        {plural(suggestion.count, 'cover')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </form>
  )
}
