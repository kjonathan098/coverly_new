import type { CoverSong, Facet } from './types'

/**
 * The groups a reader can filter by, each with counts. Values are stored names: lowercase for
 * labels, as entered for artists. `artist` is who recorded the cover; `songBy` is who first
 * released the song. They are different filters and must never be merged.
 */
export type FacetKey = 'genre' | 'sub' | 'mood' | 'style' | 'artist' | 'songBy'

export type Filters = {
  /** Cover genres. */
  genre: string[]
  /** Subgenres. */
  sub: string[]
  mood: string[]
  style: string[]
  /** Cover artist names, exactly as stored. */
  artist: string[]
  /** Original artist names ("Covers of The Beatles"). For finding covers, never for comparing. */
  songBy: string[]
  /** Original genres, for genre-crossover collections ("Pop songs, turned rock"). Chip only. */
  from: string[]
  q: string
}

export const NO_FILTERS: Filters = {
  genre: [],
  sub: [],
  mood: [],
  style: [],
  artist: [],
  songBy: [],
  from: [],
  q: '',
}

const FACET_KEYS = [
  'genre',
  'sub',
  'mood',
  'style',
  'artist',
  'songBy',
] as const satisfies readonly FacetKey[]

const facetsOf = (song: CoverSong, key: FacetKey): Facet[] => {
  switch (key) {
    case 'artist':
      return song.artists
    case 'songBy':
      return song.originalArtists
    case 'genre':
      return song.genres
    case 'sub':
      return song.subGenres
    case 'mood':
      return song.moods
    case 'style':
      return song.styles
  }
}

export const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** How many values are selected, search excluded. */
export const selectedCount = (f: Filters) =>
  FACET_KEYS.reduce((sum, key) => sum + f[key].length, 0) + f.from.length

export const hasFilters = (f: Filters) => selectedCount(f) > 0 || f.q.trim() !== ''

/** Within a group any selected value matches (OR); across groups every group must match (AND). */
export function filterSongs(
  songs: readonly CoverSong[],
  f: Filters,
  except?: FacetKey,
): CoverSong[] {
  const query = fold(f.q.trim())
  return songs.filter((song) => {
    for (const key of FACET_KEYS) {
      if (key === except || f[key].length === 0) continue
      if (!facetsOf(song, key).some((facet) => f[key].includes(facet.name))) return false
    }
    if (f.from.length && !song.originalGenres.some((g) => f.from.includes(g.name))) return false
    if (query) {
      // Title, cover artists and original artists: "beatles" finds every cover of their songs.
      const names = [...song.artists, ...song.originalArtists].map((artist) => artist.name)
      const haystack = fold([song.title, ...names].join(' '))
      if (!query.split(/\s+/).every((word) => haystack.includes(word))) return false
    }
    return true
  })
}

export type FacetCount = { name: string; count: number }

/**
 * How many songs each value of a group would match alongside the other active filters,
 * so a reader never picks a combination that returns nothing without seeing it coming.
 * Every value in the catalog is listed, most common first; currently selected values are kept.
 */
export function facetCounts(songs: readonly CoverSong[], f: Filters, key: FacetKey): FacetCount[] {
  const catalog = new Map<string, number>()
  for (const song of songs)
    for (const facet of facetsOf(song, key))
      catalog.set(facet.name, (catalog.get(facet.name) ?? 0) + 1)
  const scoped = new Map<string, number>()
  for (const song of filterSongs(songs, f, key))
    for (const facet of facetsOf(song, key))
      scoped.set(facet.name, (scoped.get(facet.name) ?? 0) + 1)
  return [...catalog.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => ({ name, count: scoped.get(name) ?? 0 }))
}

/** The same pick for everyone for a week, then the next one. Only songs that can be played. */
export function featuredSong(songs: readonly CoverSong[], now: Date): CoverSong | null {
  const playable = songs.filter((song) => song.video).sort((a, b) => a.id.localeCompare(b.id))
  if (playable.length === 0) return null
  const week = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))
  return playable[week % playable.length]!
}

export type ArtistSummary = { name: string; count: number; songs: CoverSong[] }

/** Cover artists with several covers in the catalog, most first. */
export function recurringArtists(
  songs: readonly CoverSong[],
  minimum = 2,
  limit = 8,
): ArtistSummary[] {
  const byName = new Map<string, CoverSong[]>()
  for (const song of songs)
    for (const artist of song.artists)
      byName.set(artist.name, [...(byName.get(artist.name) ?? []), song])
  return [...byName.entries()]
    .filter(([, list]) => list.length >= minimum)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, list]) => ({ name, count: list.length, songs: list }))
}

/** Songs that carry a label, for curated shelves and mood previews. */
export const songsWith = (songs: readonly CoverSong[], key: FacetKey, name: string) =>
  songs.filter((song) => facetsOf(song, key).some((facet) => facet.name === name))

/**
 * Distinct credited artists, by id: a duet counts both artists, a repeat artist once.
 * Cover artists by default; `songBy` counts original artists.
 */
export const countArtists = (songs: readonly CoverSong[], role: 'artist' | 'songBy' = 'artist') =>
  new Set(
    songs.flatMap((song) =>
      (role === 'artist' ? song.artists : song.originalArtists).map((artist) => artist.id),
    ),
  ).size

const PARAMS = ['genre', 'sub', 'mood', 'style', 'artist', 'songBy', 'from'] as const

export function filtersFromParams(params: URLSearchParams): Filters {
  const f: Filters = { ...NO_FILTERS, q: params.get('q') ?? '' }
  for (const key of PARAMS) f[key] = params.getAll(key)
  return f
}

export function filtersToParams(f: Filters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of PARAMS) for (const value of f[key]) params.append(key, value)
  if (f.q.trim()) params.set('q', f.q)
  return params
}

export type SortKey = 'catalog' | 'title'

export const parseSort = (value: string | null): SortKey =>
  value === 'title' ? 'title' : 'catalog'

/** Catalog order is the order the backend returns; title order ignores case and accents. */
export function sortSongs(songs: readonly CoverSong[], sort: SortKey): CoverSong[] {
  if (sort === 'catalog') return [...songs]
  return [...songs].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true }),
  )
}

export type Suggestion = {
  /** What picking it does: filter by an artist in one role, or search for a title. */
  kind: 'songBy' | 'artist' | 'title'
  name: string
  /** Covers it would show alongside the other active filters. */
  count: number
}

const matches = (name: string, words: string[]) => {
  const folded = fold(name)
  return words.every((word) => folded.includes(word))
}

/**
 * Autocomplete for the search box: artists by role and song titles that match the text, counted
 * against the other active filters, so a suggestion never leads to an empty result.
 */
export function suggest(
  songs: readonly CoverSong[],
  f: Filters,
  text: string,
  limit = 4,
): Suggestion[] {
  const words = fold(text.trim()).split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.join('').length < 2) return []
  const base = { ...f, q: '' }
  const roles = (['songBy', 'artist'] as const).flatMap((kind) =>
    facetCounts(songs, base, kind)
      .filter(({ name, count }) => count > 0 && !f[kind].includes(name) && matches(name, words))
      .slice(0, limit)
      .map(({ name, count }) => ({ kind, name, count })),
  )
  const titles = new Map<string, number>()
  for (const song of filterSongs(songs, base))
    if (matches(song.title, words)) titles.set(song.title, (titles.get(song.title) ?? 0) + 1)
  return [
    ...roles,
    ...[...titles]
      .slice(0, limit)
      .map(([name, count]) => ({ kind: 'title' as const, name, count })),
  ]
}
