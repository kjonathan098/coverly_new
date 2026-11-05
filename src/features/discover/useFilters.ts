import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  NO_FILTERS,
  filtersFromParams,
  filtersToParams,
  parseSort,
  type FacetKey,
  type Filters,
  type SortKey,
} from '../songs/discover'

export const DISCOVER_PATH = '/discover'

type Options = { replace?: boolean }

/**
 * Discover's state lives in the URL, so a view can be linked, bookmarked, refreshed and walked
 * with Back and Forward. Picking or clearing a filter adds a history entry, so Back undoes it;
 * typing a search replaces the current entry, so Back doesn't replay every keystroke.
 * The sort order rides along with every change and is not a filter.
 */
export function useFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const sort = parseSort(params.get('sort'))

  const write = useCallback(
    (next: Filters, nextSort: SortKey, { replace = false }: Options = {}) => {
      const out = filtersToParams(next)
      if (nextSort !== 'catalog') out.set('sort', nextSort)
      setParams(out, { replace, preventScrollReset: true })
    },
    [setParams],
  )

  const update = useCallback(
    (next: Filters, options?: Options) => write(next, sort, options),
    [write, sort],
  )
  const setSort = useCallback(
    (next: SortKey) => write(filters, next, { replace: true }),
    [write, filters],
  )

  return { filters, sort, update, setSort }
}

/** The Discover URL for a set of filters. */
export function discoverHref(filters: Filters): string {
  const query = filtersToParams(filters).toString()
  return query ? `${DISCOVER_PATH}?${query}` : DISCOVER_PATH
}

/**
 * A fresh discovery for one value: Discover with only this filter on. Used by every clickable
 * artist name and tag, so following one never mixes with whatever was filtered before.
 * Each group keeps its own parameter (sub=acoustic and style=acoustic are different filters).
 */
export const discoverOne = (key: FacetKey, value: string) =>
  discoverHref({ ...NO_FILTERS, [key]: [value] })
