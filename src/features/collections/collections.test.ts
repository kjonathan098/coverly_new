import { describe, expect, it } from 'vitest'
import { songFixtures } from '../../mocks/fixtures/songs'
import { parseSongs } from '../songs/contract'
import { NO_FILTERS, filterSongs } from '../songs/discover'
import { COLLECTIONS, MIN_COLLECTION_SIZE, resolveCollections } from './collections'

const songs = parseSongs(songFixtures)

describe('resolveCollections', () => {
  const definitions = [
    {
      id: 'pop',
      kind: 'Genre',
      title: 'Pop',
      description: 'Pop covers.',
      filters: { genre: ['pop'] },
    },
    {
      id: 'mara',
      kind: 'Artist',
      title: 'Mara Quill',
      description: 'Covers by Mara Quill.',
      filters: { artist: ['Mara Quill'] },
    },
    {
      id: 'jazz',
      kind: 'Genre',
      title: 'Jazz',
      description: 'None in the fixtures.',
      filters: { genre: ['jazz'] },
    },
  ]

  it('fills each collection with exactly what Discover shows for its filters', () => {
    const [pop] = resolveCollections(songs, definitions, 1)
    const discover = filterSongs(songs, { ...NO_FILTERS, genre: ['pop'] })
    expect(pop!.filters).toEqual({ ...NO_FILTERS, genre: ['pop'] })
    expect(pop!.songs).toEqual(discover)
    expect(pop!.songs.map((s) => s.title)).toEqual(['glass houses', 'night bus', 'no link yet'])
  })

  it('counts distinct cover artists, and keeps only playable songs for artwork and play', () => {
    const [, mara] = resolveCollections(songs, definitions, 1)
    // paper lanterns, Low Tide (with Ofelia Ruiz) and the song without a link.
    expect(mara!.songs).toHaveLength(3)
    expect(mara!.artistCount).toBe(2)
    expect(mara!.playable.map((s) => s.title)).toEqual(['paper lanterns', 'Low Tide'])
  })

  it('leaves out collections the catalog can’t fill', () => {
    expect(resolveCollections(songs, definitions, 1).map((c) => c.id)).toEqual(['pop', 'mara'])
    expect(resolveCollections(songs, definitions, 4)).toEqual([])
    expect(resolveCollections(songs)).toEqual([])
  })
})

describe('COLLECTIONS', () => {
  it('uses only filters Discover understands, and has unique ids', () => {
    const keys = Object.keys(NO_FILTERS)
    for (const collection of COLLECTIONS)
      for (const key of Object.keys(collection.filters)) expect(keys).toContain(key)
    expect(new Set(COLLECTIONS.map((c) => c.id)).size).toBe(COLLECTIONS.length)
  })

  it('keeps counts out of the copy, since they are live', () => {
    for (const collection of COLLECTIONS) expect(collection.description).not.toMatch(/\d/)
    expect(MIN_COLLECTION_SIZE).toBeGreaterThan(1)
  })
})
