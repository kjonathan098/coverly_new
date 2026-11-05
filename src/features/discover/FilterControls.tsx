import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ChevronIcon, CloseIcon, cx } from '../../ui'
import { NO_FILTERS, filterSongs, selectedCount, type Filters } from '../songs/discover'
import { plural } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { FacetOptions } from './FacetOptions'
import { FILTER_GROUPS, type FilterGroup } from './groups'

type ControlsProps = {
  songs: readonly CoverSong[]
  filters: Filters
  onChange: (filters: Filters) => void
}

const triggerClasses = (on: boolean) =>
  cx(
    'type-chip inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill px-4 whitespace-nowrap transition-colors duration-(--duration-fast)',
    on
      ? 'bg-pink text-ink'
      : 'text-fg shadow-[inset_0_0_0_1.5px_var(--surface-line)] hover:bg-[color-mix(in_srgb,var(--surface-fg)_12%,transparent)]',
  )

/**
 * One group as a button that opens its options underneath. A panel, not a modal: Escape or a
 * click elsewhere closes it, and focus returns to its button.
 */
function FilterMenu({
  group,
  open,
  onOpen,
  onClose,
  ...rest
}: ControlsProps & { group: FilterGroup; open: boolean; onOpen: () => void; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const [alignEnd, setAlignEnd] = useState(false)
  const count = rest.filters[group.key].length

  useEffect(() => {
    if (!open) return
    const rect = root.current?.getBoundingClientRect()
    if (rect) setAlignEnd(rect.left + 352 > window.innerWidth)
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onClose()
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={open ? onClose : onOpen}
        className={triggerClasses(count > 0)}
      >
        {group.title}
        {count > 0 && (
          <span className="tabular-nums">
            {' '}
            · {count}
            <span className="sr-only"> selected</span>
          </span>
        )}
        <ChevronIcon className={cx('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          id={panelId}
          className={cx(
            'absolute top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-panel bg-raised p-3 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.6),inset_0_0_0_1px_var(--surface-line)]',
            alignEnd ? 'right-0' : 'left-0',
          )}
        >
          {/* Never taller than the room above a floating player (--player-inset), so it doesn't slide under it. */}
          <FacetOptions
            group={group}
            {...rest}
            className="max-h-[min(20rem,max(6rem,calc(100dvh_-_var(--player-inset,0px)_-_24rem)))] overflow-y-auto"
          />
          <div className="mt-2 flex items-center justify-between border-t-[1.5px] border-line pt-2">
            <Button
              variant="quiet"
              disabled={count === 0}
              onClick={() => rest.onChange({ ...rest.filters, [group.key]: [] })}
            >
              Clear {group.title.toLowerCase()}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onClose()
                trigger.current?.focus()
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Tablet and desktop: every group one click away, in a row. */
export function FilterBar(props: ControlsProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  return (
    <div role="group" aria-label="Filters" className="flex flex-wrap gap-2">
      {FILTER_GROUPS.map((group) => (
        <FilterMenu
          key={group.key}
          group={group}
          open={openKey === group.key}
          onOpen={() => setOpenKey(group.key)}
          onClose={() => setOpenKey((key) => (key === group.key ? null : key))}
          {...props}
        />
      ))}
    </div>
  )
}

/**
 * Phones: one Filters button opens every group in a sheet that fills the screen above the player.
 * Results update underneath as you choose.
 *
 * Not a modal <dialog>: a modal's backdrop would sit in front of a playing video (YouTube forbids
 * anything over the player) and block its controls. Instead the sheet is a non-modal dialog, and
 * the rest of the page (header, content, footer) is made inert while it's open, so it still
 * behaves like a modal for the page, while the player stays visible and usable. Escape closes it
 * and focus returns to the Filters button.
 */
export function FilterSheet({ songs, filters, onChange }: ControlsProps) {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const count = selectedCount(filters)
  const results = filterSongs(songs, filters).length

  useEffect(() => {
    const el = dialog.current
    if (!open || !el) return
    // The app shell marks its header, content and footer; the player is deliberately not marked.
    const page = [...document.querySelectorAll('[data-shell="page"]')]
    for (const node of page) node.setAttribute('inert', '')
    if (typeof el.show === 'function') el.show()
    else el.setAttribute('open', '')
    el.querySelector<HTMLElement>('button, summary')?.focus()
    const opener = trigger.current
    return () => {
      for (const node of page) node.removeAttribute('inert')
      opener?.focus()
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={triggerClasses(count > 0)}
      >
        Filters
        {count > 0 && (
          <span className="tabular-nums">
            {' '}
            · {count}
            <span className="sr-only"> selected</span>
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            aria-labelledby="filter-sheet-title"
            aria-modal="false"
            onClose={close}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              event.preventDefault()
              close()
            }}
            // Fills the screen above the player (--player-inset), so a playing video is never covered.
            className="fixed inset-x-0 top-0 z-50 m-0 h-[calc(100dvh_-_var(--player-inset,0px))] max-h-none w-full max-w-none bg-ink p-0 text-fg"
            data-surface="ink"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b-[1.5px] border-line px-margin py-2">
                <h2 id="filter-sheet-title" className="type-row m-0">
                  Filters
                </h2>
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={close}
                  className="grid size-11 cursor-pointer place-items-center rounded-pill hover:bg-raised"
                >
                  <CloseIcon className="size-5" />
                </button>
              </div>
              <div className="relative flex-1 overflow-y-auto px-margin py-2">
                {FILTER_GROUPS.map((group) => {
                  const n = filters[group.key].length
                  return (
                    <details key={group.key} className="border-b-[1.5px] border-line">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-bold [&::-webkit-details-marker]:hidden">
                        <span>
                          {group.title}
                          {n > 0 && <span className="text-pink tabular-nums"> · {n}</span>}
                        </span>
                        <ChevronIcon className="size-4" />
                      </summary>
                      <FacetOptions
                        group={group}
                        songs={songs}
                        filters={filters}
                        onChange={onChange}
                        className="pb-3"
                      />
                    </details>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-3 border-t-[1.5px] border-line px-margin py-3">
                <Button
                  variant="quiet"
                  disabled={count === 0}
                  onClick={() => onChange({ ...NO_FILTERS, q: filters.q })}
                >
                  Clear all
                </Button>
                <Button onClick={close}>Show {plural(results, 'cover')}</Button>
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  )
}
