import { describe, expect, it } from 'vitest'
import { songFixtures } from '../../mocks/fixtures/songs'
import { parseSongs } from '../songs/contract'
import type { CoverSong } from '../songs/types'
import { dailySelection, randomOther, sameSongPairs } from './selection'

const songs = parseSongs(songFixtures)
const nightBus = songs.find((s) => s.title === 'night bus')! // original: Mara Quill
const artist = (id: string, name: string) => ({ id, name })
const variant = (over: Partial<CoverSong>): CoverSong => ({ ...nightBus, ...over })

describe('dailySelection', () => {
  it('picks playable covers only, the same all day, different the next', () => {
    const day = new Date('2026-11-06T09:00:00Z')
    const picks = dailySelection(songs, 3, day)
    expect(picks).toHaveLength(3)
    expect(picks.every((s) => s.video)).toBe(true)
    expect(dailySelection(songs, 3, new Date('2026-11-06T22:00:00Z'))).toEqual(picks)
    const week = Array.from({ length: 7 }, (_, i) =>
      dailySelection(songs, 3, new Date(Date.UTC(2026, 10, 7 + i)))
        .map((s) => s.id)
        .join(),
    )
    expect(new Set(week).size).toBeGreaterThan(1)
  })
})

describe('sameSongPairs', () => {
  it('finds none when every song is covered once', () => {
    expect(sameSongPairs(songs)).toEqual([])
  })

  it('pairs recordings of the same title and original artists, by different cover artists', () => {
    const second = variant({
      id: 'night-bus-2',
      title: 'Night Bus!',
      artists: [artist('x1', 'Someone Else')],
    })
    const [pair, ...rest] = sameSongPairs([...songs, second])
    expect(rest).toEqual([])
    expect(pair!.covers.map((s) => s.id)).toEqual([nightBus.id, 'night-bus-2'])
    expect(pair!.originalArtists.map((a) => a.name)).toEqual(['Mara Quill'])
  })

  it('never pairs by title alone, or a repeat by the same cover artist, or a song without video', () => {
    const otherOriginal = variant({
      id: 'other-original',
      originalArtists: [artist('o9', 'Another Writer')],
      artists: [artist('x2', 'Someone Else')],
    })
    const sameVoice = variant({ id: 'same-voice' })
    const silent = variant({ id: 'silent', artists: [artist('x3', 'Quiet One')], video: null })
    expect(sameSongPairs([...songs, otherOriginal, sameVoice, silent])).toEqual([])
  })
})

describe('randomOther', () => {
  it('picks another playable cover, never the current one when there is a choice', () => {
    const current = songs.find((s) => s.video)!
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const next = randomOther(songs, current.id, () => r)!
      expect(next.id).not.toBe(current.id)
      expect(next.video).not.toBeNull()
    }
    expect(randomOther([current], current.id, () => 0)).toBe(current)
    expect(randomOther([], undefined)).toBeUndefined()
  })
})
