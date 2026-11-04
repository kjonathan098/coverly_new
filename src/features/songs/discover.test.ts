import { describe, expect, it } from 'vitest'
import { songFixtures } from '../../mocks/fixtures/songs'
import { parseSongs } from './contract'
import {
  NO_FILTERS,
  countArtists,
  sortSongs,
  suggest,
  facetCounts,
  featuredSong,
  filterSongs,
  filtersFromParams,
  filtersToParams,
  hasFilters,
  recurringArtists,
  songsWith,
  type Filters,
} from './discover'

const songs = parseSongs(songFixtures)
const titles = (list: { title: string }[]) => list.map((song) => song.title)
const f = (partial: Partial<Filters>): Filters => ({ ...NO_FILTERS, ...partial })

describe('filterSongs', () => {
  it('returns everything without filters', () => {
    expect(filterSongs(songs, NO_FILTERS)).toHaveLength(songs.length)
  })

  it('matches any selected value within a group', () => {
    expect(titles(filterSongs(songs, f({ mood: ['dreamy'] })))).toEqual([
      'paper lanterns',
      'glass houses',
      'night bus',
    ])
    expect(titles(filterSongs(songs, f({ mood: ['dreamy', 'nostalgic'] })))).toEqual([
      'paper lanterns',
      'glass houses',
      'Señales',
      'night bus',
    ])
  })

  it('requires every group to match', () => {
    expect(titles(filterSongs(songs, f({ mood: ['dreamy'], genre: ['folk'] })))).toEqual([
      'paper lanterns',
    ])
    expect(filterSongs(songs, f({ mood: ['soulful'], style: ['stripped-down'] }))).toEqual([])
  })

  it('filters by cover artist, including shared credits', () => {
    expect(titles(filterSongs(songs, f({ artist: ['Ofelia Ruiz'] })))).toEqual([
      'Low Tide',
      'Señales',
    ])
  })

  it('filters by subgenre', () => {
    expect(titles(filterSongs(songs, f({ sub: ['lo-fi'] })))).toEqual(['glass houses'])
  })

  it('filters by original artist and original genre, for collections', () => {
    expect(titles(filterSongs(songs, f({ songBy: ['The Lamplighters'] })))).toEqual([
      'paper lanterns',
      'Low Tide',
      'glass houses',
    ])
    expect(filterSongs(songs, f({ songBy: ['Someone Else'] }))).toEqual([])
    expect(titles(filterSongs(songs, f({ from: ['pop'], genre: ['r&b/soul'] })))).toEqual([
      'Low Tide',
      'glass houses',
    ])
    expect(filterSongs(songs, f({ from: ['rock'] }))).toEqual([])
  })

  it('searches titles and artist names, ignoring case and accents, word by word', () => {
    expect(titles(filterSongs(songs, f({ q: 'senales' })))).toEqual(['Señales'])
    expect(titles(filterSongs(songs, f({ q: '  TIDEWATER bus ' })))).toEqual(['night bus'])
    expect(filterSongs(songs, f({ q: 'nothing like this' }))).toEqual([])
  })
})

describe('artist roles', () => {
  it('keeps cover artist and original artist apart, even for the same person', () => {
    // Mara Quill records three covers, and wrote the song "night bus" covers.
    expect(titles(filterSongs(songs, f({ artist: ['Mara Quill'] })))).toEqual([
      'paper lanterns',
      'Low Tide',
      'no link yet',
    ])
    expect(titles(filterSongs(songs, f({ songBy: ['Mara Quill'] })))).toEqual(['night bus'])
    expect(filterSongs(songs, f({ artist: ['Mara Quill'], songBy: ['Mara Quill'] }))).toEqual([])
  })

  it('searches original artists too, so plain text finds both roles', () => {
    expect(titles(filterSongs(songs, f({ q: 'mara' })))).toEqual([
      'paper lanterns',
      'Low Tide',
      'night bus',
      'no link yet',
    ])
    expect(titles(filterSongs(songs, f({ q: 'faroles' })))).toEqual(['Señales', 'no link yet'])
  })

  it('counts each role as its own group', () => {
    expect(facetCounts(songs, NO_FILTERS, 'songBy')).toEqual([
      { name: 'The Lamplighters', count: 3 },
      { name: 'Los Faroles', count: 2 },
      { name: 'Mara Quill', count: 1 },
    ])
    expect(facetCounts(songs, f({ songBy: ['Los Faroles'] }), 'artist')).toEqual([
      { name: 'Mara Quill', count: 1 },
      { name: 'Ofelia Ruiz', count: 1 },
      { name: 'the tidewater choir', count: 0 },
    ])
    expect(countArtists(songs, 'songBy')).toBe(3)
  })
})

it('keeps a subgenre and a performance style with the same name apart', () => {
  expect(titles(filterSongs(songs, f({ sub: ['acoustic'] })))).toEqual([
    'paper lanterns',
    'Señales',
  ])
  expect(titles(filterSongs(songs, f({ style: ['acoustic'] })))).toEqual(['night bus'])
  expect(filterSongs(songs, f({ sub: ['acoustic'], style: ['acoustic'] }))).toEqual([])
})

describe('suggest', () => {
  it('offers each artist once per role, with the covers picking it would show', () => {
    expect(suggest(songs, NO_FILTERS, 'mara')).toEqual([
      { kind: 'songBy', name: 'Mara Quill', count: 1 },
      { kind: 'artist', name: 'Mara Quill', count: 3 },
    ])
  })

  it('suggests titles, respects other filters, and skips what is already picked', () => {
    expect(suggest(songs, NO_FILTERS, 'la')).toEqual([
      { kind: 'songBy', name: 'The Lamplighters', count: 3 },
      { kind: 'title', name: 'paper lanterns', count: 1 },
      { kind: 'title', name: 'glass houses', count: 1 },
    ])
    expect(suggest(songs, f({ genre: ['folk'] }), 'la')).toEqual([
      { kind: 'songBy', name: 'The Lamplighters', count: 1 },
      { kind: 'title', name: 'paper lanterns', count: 1 },
    ])
    expect(suggest(songs, f({ songBy: ['The Lamplighters'] }), 'lamp')).toEqual([])
    expect(suggest(songs, NO_FILTERS, 'l')).toEqual([])
  })
})

it('sorts by title ignoring case and accents, or keeps catalog order', () => {
  expect(titles(sortSongs(songs, 'title'))).toEqual([
    'glass houses',
    'Low Tide',
    'night bus',
    'no link yet',
    'paper lanterns',
    'Señales',
  ])
  expect(sortSongs(songs, 'catalog')).toEqual(songs)
})

describe('facetCounts', () => {
  it('lists every value in the catalog, most common first', () => {
    expect(facetCounts(songs, NO_FILTERS, 'mood')).toEqual([
      { name: 'dreamy', count: 3 },
      { name: 'soulful', count: 3 },
      { name: 'nostalgic', count: 2 },
    ])
  })

  it('counts what each value would match alongside the other groups', () => {
    expect(facetCounts(songs, f({ genre: ['folk'] }), 'mood')).toEqual([
      { name: 'dreamy', count: 1 },
      { name: 'soulful', count: 0 },
      { name: 'nostalgic', count: 2 },
    ])
  })

  it('ignores its own group, so picking a second value can only widen the result', () => {
    expect(facetCounts(songs, f({ mood: ['dreamy'] }), 'mood')).toEqual(
      facetCounts(songs, NO_FILTERS, 'mood'),
    )
  })
})

describe('featuredSong', () => {
  const week = 7 * 24 * 60 * 60 * 1000

  it('picks the same playable song all week and moves on the next week', () => {
    const monday = new Date(week * 3000)
    const pick = featuredSong(songs, monday)
    expect(pick?.video).not.toBeNull()
    expect(featuredSong(songs, new Date(monday.getTime() + week - 1))).toBe(pick)
    expect(featuredSong(songs, new Date(monday.getTime() + week))).not.toBe(pick)
  })

  it('does not depend on catalog order', () => {
    const now = new Date('2026-11-04T12:00:00Z')
    expect(featuredSong([...songs].reverse(), now)?.id).toBe(featuredSong(songs, now)?.id)
  })

  it('never features a song that cannot play', () => {
    const silent = songs.filter((song) => !song.video)
    expect(featuredSong(silent, new Date())).toBeNull()
    expect(featuredSong([], new Date())).toBeNull()
  })
})

describe('countArtists', () => {
  it('counts each credited cover artist once, including both halves of a duet', () => {
    expect(countArtists(songs)).toBe(3)
    const lowTide = songs.filter((song) => song.title === 'Low Tide')
    expect(countArtists(lowTide)).toBe(2)
    expect(countArtists([])).toBe(0)
  })
})

describe('recurringArtists', () => {
  it('lists cover artists with several covers, most first', () => {
    expect(recurringArtists(songs).map(({ name, count }) => [name, count])).toEqual([
      ['Mara Quill', 3],
      ['Ofelia Ruiz', 2],
      ['the tidewater choir', 2],
    ])
    expect(recurringArtists(songs, 3)).toHaveLength(1)
    expect(recurringArtists(songs, 2, 1)).toHaveLength(1)
  })
})

it('finds songs with a label', () => {
  expect(titles(songsWith(songs, 'style', 'stripped-down'))).toEqual([
    'paper lanterns',
    'Señales',
    'night bus',
  ])
})

describe('filters in the URL', () => {
  it('round-trips through search params', () => {
    const filters = f({
      mood: ['dreamy', 'nostalgic'],
      genre: ['r&b/soul'],
      sub: ['lo-fi'],
      artist: ['Ofelia Ruiz'],
      songBy: ['The Beatles'],
      from: ['pop'],
      q: 'low tide',
    })
    const params = filtersToParams(filters)
    expect(params.toString()).toBe(
      'genre=r%26b%2Fsoul&sub=lo-fi&mood=dreamy&mood=nostalgic&artist=Ofelia+Ruiz&songBy=The+Beatles&from=pop&q=low+tide',
    )
    expect(filtersFromParams(new URLSearchParams(params.toString()))).toEqual(filters)
  })

  it('leaves out an empty search', () => {
    expect(filtersToParams(f({ q: '   ' })).toString()).toBe('')
    expect(filtersFromParams(new URLSearchParams())).toEqual(NO_FILTERS)
  })

  it('knows when any filter is on', () => {
    expect(hasFilters(NO_FILTERS)).toBe(false)
    expect(hasFilters(f({ q: ' ' }))).toBe(false)
    expect(hasFilters(f({ artist: ['Mara Quill'] }))).toBe(true)
  })
})
