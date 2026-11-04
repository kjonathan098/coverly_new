import type { TagType } from '../recordings/types'
import type { FacetKey, Filters } from '../songs/discover'
import { displayName, tagLabel } from '../songs/format'

export type FilterGroup = {
  key: FacetKey
  /** The group's name everywhere it appears: filter button, panel, active chip, song details. */
  title: string
  /** Plural, for "All 45 original artists" and the panel's search placeholder. */
  noun: string
  /** How a stored value reads. */
  label: (value: string) => string
  /** For labels: which tag shape they print in. Artists are names, not tags. */
  tagType?: TagType
}

/**
 * Discover's six filter groups, in the order a listener thinks of them: who, then what it sounds
 * like, then how it feels. Each pair that could be confused carries its role in its name:
 * original artist vs cover artist, cover genre vs subgenre, performance style vs mood.
 */
export const FILTER_GROUPS: readonly FilterGroup[] = [
  { key: 'songBy', title: 'Original artist', noun: 'original artists', label: displayName },
  { key: 'artist', title: 'Cover artist', noun: 'cover artists', label: displayName },
  { key: 'genre', title: 'Cover genre', noun: 'cover genres', label: tagLabel, tagType: 'genre' },
  { key: 'sub', title: 'Subgenre', noun: 'subgenres', label: tagLabel, tagType: 'subGenre' },
  {
    key: 'style',
    title: 'Performance style',
    noun: 'performance styles',
    label: tagLabel,
    tagType: 'performanceStyle',
  },
  { key: 'mood', title: 'Mood', noun: 'moods', label: tagLabel, tagType: 'mood' },
]

/** Filters that only arrive from links (homepage collections), shown as chips when on. */
export const LINK_ONLY = [
  { key: 'from', title: 'Originally released as', label: tagLabel },
] as const satisfies readonly { key: keyof Filters; title: string; label: (v: string) => string }[]

/** Adds or removes one value of one group. */
export function toggleValue(filters: Filters, key: FacetKey | 'from', value: string): Filters {
  const current = filters[key]
  return {
    ...filters,
    [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
  }
}
