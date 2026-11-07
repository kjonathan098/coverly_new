import { displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'

/** An artist as the catalog knows them: their name and the cover recordings they're part of. */
export type ArtistProfile = {
  id: string
  name: string
  /** Cover recordings they perform (alone or with others). Counted as performances. */
  covers: CoverSong[]
  /**
   * Cover recordings of songs they originally performed, by anyone. Counted as cover performances,
   * not as distinct songs: five covers of one song are five entries.
   */
  coversOfTheirSongs: CoverSong[]
}

const byTitle = (a: CoverSong, b: CoverSong) =>
  displayTitle(a.title).localeCompare(displayTitle(b.title)) || a.id.localeCompare(b.id)

/**
 * Builds an artist's profile from the catalog, by artist id: never by name, so two artists with
 * similar names stay apart and a duo record stays its own artist. Null when no song in the catalog
 * credits them (unknown ids and artists without songs alike).
 */
export function artistProfile(songs: readonly CoverSong[], id: string): ArtistProfile | null {
  let name: string | null = null
  const covers: CoverSong[] = []
  const coversOfTheirSongs: CoverSong[] = []
  for (const song of songs) {
    const asCover = song.artists.find((artist) => artist.id === id)
    const asOriginal = song.originalArtists.find((artist) => artist.id === id)
    if (asCover) covers.push(song)
    if (asOriginal) coversOfTheirSongs.push(song)
    name ??= asCover?.name ?? asOriginal?.name ?? null
  }
  if (name === null) return null
  return {
    id,
    name,
    covers: covers.sort(byTitle),
    coversOfTheirSongs: coversOfTheirSongs.sort(byTitle),
  }
}
