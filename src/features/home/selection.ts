import { fold } from '../songs/discover'
import type { CoverSong } from '../songs/types'

/*
 * What the home page shows, chosen from the catalog with plain rules: no popularity, trends or
 * personalization (Coverly has no such data). Everything is derived from the one cached
 * GET /api/songs/all-songs response, so the page makes no requests of its own.
 */

/** Small, stable string hash (FNV-1a). */
function hash(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

const dayOf = (date: Date) => date.toISOString().slice(0, 10)

/**
 * A selection of playable covers that changes once a day and is the same for everyone that day.
 * Not a ranking: an even shuffle of the catalog, so every cover gets its turn.
 */
export function dailySelection(songs: readonly CoverSong[], count: number, now: Date): CoverSong[] {
  const day = dayOf(now)
  return songs
    .filter((song) => song.video)
    .map((song) => ({ song, order: hash(`${day}:${song.id}`) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, count)
    .map(({ song }) => song)
}

export type SameSong = {
  key: string
  /** Title as entered on the first recording. */
  title: string
  originalArtists: CoverSong['originalArtists']
  covers: [CoverSong, CoverSong]
}

const normalTitle = (title: string) =>
  fold(title)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
const ids = (artists: { id: string }[]) =>
  artists
    .map((a) => a.id)
    .sort()
    .join(',')

/**
 * Songs covered more than once: recordings grouped by normalized title AND the same original
 * artists (by id), never by title alone. Each pair is two playable recordings by different cover
 * artists, so it is two voices, not a duplicate entry. Ordered by title.
 */
export function sameSongPairs(songs: readonly CoverSong[]): SameSong[] {
  const groups = new Map<string, CoverSong[]>()
  for (const song of songs) {
    if (!song.video || song.originalArtists.length === 0) continue
    const key = `${normalTitle(song.title)}|${ids(song.originalArtists)}`
    groups.set(key, [...(groups.get(key) ?? []), song])
  }
  const pairs: SameSong[] = []
  for (const [key, recordings] of groups) {
    const [first, ...rest] = recordings
    const second = rest.find((other) => ids(other.artists) !== ids(first!.artists))
    if (!first || !second) continue
    pairs.push({
      key,
      title: first.title,
      originalArtists: first.originalArtists,
      covers: [first, second],
    })
  }
  return pairs.sort((a, b) => normalTitle(a.title).localeCompare(normalTitle(b.title)))
}

/**
 * Any other playable cover, at random ("Surprise me"). Avoids the one shown when there's a choice.
 * `random` is injectable for tests.
 */
export function randomOther(
  songs: readonly CoverSong[],
  currentId: string | undefined,
  random: () => number = Math.random,
): CoverSong | undefined {
  const playable = songs.filter((song) => song.video)
  const others = playable.filter((song) => song.id !== currentId)
  const pool = others.length > 0 ? others : playable
  return pool[Math.floor(random() * pool.length)]
}
