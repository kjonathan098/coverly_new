import type { ArtistRef, Recording, Tag } from '../../features/recordings/types'

// PLACEHOLDER DATA. Not real songs, artists, or videos; replace with curated data before Phase 3 review.
// Relationships come only from originalRecordingId. Shared titles/artists below are deliberate.

export const PLACEHOLDER_IDS = {
  originalWithCovers: 'placeholder-original-a',
  linkedCover: 'placeholder-cover-a1',
  secondLinkedCover: 'placeholder-cover-a2',
  originalWithoutCovers: 'placeholder-original-b',
  unlinkedCover: 'placeholder-cover-unlinked',
} as const

const artist = (n: number): ArtistRef => ({
  id: `placeholder-artist-${n}`,
  name: `Placeholder Artist ${n}`,
})

const genre: Tag = { id: 'placeholder-genre-1', name: 'Placeholder Genre 1', type: 'genre' }
const otherGenre: Tag = { id: 'placeholder-genre-2', name: 'Placeholder Genre 2', type: 'genre' }
const style: Tag = {
  id: 'placeholder-style-1',
  name: 'Placeholder Style 1',
  type: 'performanceStyle',
}
const mood: Tag = { id: 'placeholder-mood-1', name: 'Placeholder Mood 1', type: 'mood' }

export const placeholderRecordings: Recording[] = [
  {
    id: PLACEHOLDER_IDS.originalWithCovers,
    kind: 'original',
    originalRecordingId: null,
    title: 'Placeholder Song A',
    artists: [artist(1)],
    year: 1970,
    genres: [genre],
    performanceStyles: [],
    moods: [mood],
    source: null,
  },
  {
    id: PLACEHOLDER_IDS.linkedCover,
    kind: 'cover',
    originalRecordingId: PLACEHOLDER_IDS.originalWithCovers,
    title: 'Placeholder Song A',
    artists: [artist(2)],
    year: 1995,
    genres: [otherGenre],
    performanceStyles: [style],
    moods: [mood],
    source: null,
  },
  {
    id: PLACEHOLDER_IDS.secondLinkedCover,
    kind: 'cover',
    originalRecordingId: PLACEHOLDER_IDS.originalWithCovers,
    title: 'Placeholder Song A (Placeholder Version)',
    artists: [artist(3), artist(4)],
    genres: [],
    performanceStyles: [style],
    moods: [],
    source: null,
  },
  {
    id: PLACEHOLDER_IDS.originalWithoutCovers,
    kind: 'original',
    originalRecordingId: null,
    title: 'Placeholder Song B',
    artists: [artist(5)],
    year: 1984,
    genres: [genre],
    performanceStyles: [],
    moods: [],
    source: null,
  },
  {
    // Same title and artist as the original above, but no originalRecordingId: it stays unlinked.
    id: PLACEHOLDER_IDS.unlinkedCover,
    kind: 'cover',
    originalRecordingId: null,
    title: 'Placeholder Song A',
    artists: [artist(1)],
    genres: [genre],
    performanceStyles: [],
    moods: [],
    source: null,
  },
]
