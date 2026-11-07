import { describe, expect, it } from 'vitest'
import type { CoverArtist, CoverSong } from '../songs/types'
import { artistProfile } from './profile'

const MARA: CoverArtist = { id: 'mara', name: 'Mara Quill' }
const OFELIA: CoverArtist = { id: 'ofelia', name: 'Ofelia Ruiz' }
const BEATLES: CoverArtist = { id: 'beatles', name: 'The Beatles' }
const DUO: CoverArtist = { id: 'duo', name: 'Mara Quill & Ofelia Ruiz' }

function song(id: string, title: string, artists: CoverArtist[], originalArtists: CoverArtist[]) {
  return { id, title, artists, originalArtists } as unknown as CoverSong
}

const CATALOG = [
  song('1', 'yesterday', [MARA], [BEATLES]),
  song('2', 'yesterday', [OFELIA], [BEATLES]),
  song('3', 'Let It Be', [MARA, OFELIA], [BEATLES]),
  song('4', 'night bus', [OFELIA], [MARA]),
  song('5', 'Harbour', [DUO], [BEATLES]),
]
const ids = (songs: CoverSong[]) => songs.map((s) => s.id)

describe('artistProfile', () => {
  it('an artist with both roles: their covers, and covers of their songs, apart', () => {
    const profile = artistProfile(CATALOG, 'mara')!
    expect(profile.name).toBe('Mara Quill')
    expect(ids(profile.covers)).toEqual(['3', '1']) // by title: Let It Be, Yesterday
    expect(ids(profile.coversOfTheirSongs)).toEqual(['4'])
  })

  it('a song with several covering artists is on each of their profiles', () => {
    expect(ids(artistProfile(CATALOG, 'ofelia')!.covers)).toEqual(['3', '4', '2'])
    expect(ids(artistProfile(CATALOG, 'mara')!.covers)).toContain('3')
  })

  it('counts cover performances, not distinct songs: two covers of one song are two entries', () => {
    const profile = artistProfile(CATALOG, 'beatles')!
    expect(profile.covers).toEqual([])
    expect(ids(profile.coversOfTheirSongs)).toEqual(['5', '3', '1', '2'])
  })

  it('works with a single cover', () => {
    const profile = artistProfile([song('9', 'solo', [OFELIA], [BEATLES])], 'ofelia')!
    expect(ids(profile.covers)).toEqual(['9'])
    expect(profile.coversOfTheirSongs).toEqual([])
  })

  it('matches by id only: a duo record is its own artist', () => {
    expect(ids(artistProfile(CATALOG, 'duo')!.covers)).toEqual(['5'])
    expect(ids(artistProfile(CATALOG, 'mara')!.covers)).not.toContain('5')
  })

  it('is null for an unknown id, or an artist no song credits', () => {
    expect(artistProfile(CATALOG, 'nobody')).toBeNull()
    expect(artistProfile([], 'mara')).toBeNull()
  })
})
