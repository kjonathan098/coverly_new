import { NO_FILTERS, countArtists, filterSongs, type Filters } from '../songs/discover'
import type { CoverSong } from '../songs/types'

/*
 * Collections are DYNAMIC: each one is a named Discover query, not a list of songs. Membership,
 * counts and artwork are computed from the live catalog with the same filterSongs() Discover uses,
 * so a collection always shows exactly what "Explore" opens, and grows with the catalog.
 *
 * A playlist (an explicit, ordered song selection) is a different thing: a Discover query can't
 * express "these songs in this order". Users' own playlists live in Your Library
 * (src/features/playlists, GET /api/playlists, private to their owner).
 */

export type CollectionDefinition = {
  id: string
  /** What rule picks the songs, said plainly: the slide's kicker. */
  kind: string
  title: string
  /** One or two sentences, true for any song the rule matches. No counts: those are live. */
  description: string
  filters: Partial<Filters>
}

export const COLLECTIONS: readonly CollectionDefinition[] = [
  {
    id: 'beatles',
    kind: 'Songs by one artist',
    title: 'Covers of The Beatles',
    description:
      'Songs The Beatles first released, in the hands of the artists who cover them now.',
    filters: { songBy: ['The Beatles'] },
  },
  {
    id: 'nostalgic',
    kind: 'Mood',
    title: 'Nostalgic',
    description: 'Covers tagged nostalgic: familiar songs played as if looking back at them.',
    filters: { mood: ['nostalgic'] },
  },
  {
    id: 'acoustic-stripped',
    kind: 'Sound',
    title: 'Acoustic & stripped down',
    description: 'Acoustic covers with the arrangement taken down to a voice and very little else.',
    filters: { sub: ['acoustic'], style: ['stripped-down'] },
  },
  {
    id: 'pop-to-rock',
    kind: 'Genre crossover',
    title: 'Pop songs, turned rock',
    description: 'Songs first released as pop, covered as rock.',
    filters: { genre: ['rock'], from: ['pop'] },
  },
  {
    id: 'madonna',
    kind: 'Songs by one artist',
    title: 'Covering Madonna',
    description: 'Madonna’s songs, taken somewhere new by the artists who cover them.',
    filters: { songBy: ['Madonna'] },
  },
  {
    id: 'soulful',
    kind: 'Mood',
    title: 'Soulful interpretations',
    description: 'Covers tagged soulful, from the whole catalog.',
    filters: { mood: ['soulful'] },
  },
]

/** A collection with too few covers reads as an accident, so it isn't shown until the catalog grows. */
export const MIN_COLLECTION_SIZE = 6

export type Collection = Omit<CollectionDefinition, 'filters'> & {
  filters: Filters
  /** Every match, in Discover's order. */
  songs: CoverSong[]
  artistCount: number
  /** The matches that can play, in the same order: the artwork and the one-click play come from these. */
  playable: CoverSong[]
}

export function resolveCollections(
  songs: readonly CoverSong[],
  definitions: readonly CollectionDefinition[] = COLLECTIONS,
  minimum = MIN_COLLECTION_SIZE,
): Collection[] {
  return definitions.flatMap((definition) => {
    const filters = { ...NO_FILTERS, ...definition.filters }
    const matches = filterSongs(songs, filters)
    if (matches.length < minimum) return []
    return [
      {
        ...definition,
        filters,
        songs: matches,
        artistCount: countArtists(matches),
        playable: matches.filter((song) => song.video),
      },
    ]
  })
}
