/** A label from the catalog. `name` is the stored value (lowercase); use tagLabel() to display it. */
export type Facet = { id: string; name: string }

export type CoverArtist = { id: string; name: string }

export type Video = { videoId: string; startSeconds: number }

/**
 * A cover song as Coverly shows it. Coverly 2.0 is about discovering covers, not comparing them:
 * the original artist and original genres are carried only so themed collections can filter on
 * them ("Covers of The Beatles", "Pop songs, turned rock"). Never build comparison UI on them.
 */
export type CoverSong = {
  id: string
  title: string
  artists: CoverArtist[]
  genres: Facet[]
  subGenres: Facet[]
  moods: Facet[]
  styles: Facet[]
  /** Who first released the song. For filtering only. */
  originalArtists: CoverArtist[]
  /** The genres of the first release. For filtering only. */
  originalGenres: Facet[]
  video: Video | null
  addedAt: string | null
}
