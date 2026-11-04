import type { CoverArtist, CoverSong, Facet, Video } from './types'

/*
 * Parses the backend's GET /api/songs/all-songs payload (populated Song documents).
 * The catalog is real and hand-entered, so one malformed song must not take the homepage down:
 * invalid songs are dropped (and reported in development), invalid labels are skipped.
 */

type Raw = Record<string, unknown>

const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

function facets(value: unknown): Facet[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isObject(item)) return []
    const id = text(item._id)
    const name = text(item.name)
    return id && name ? [{ id, name: name.toLowerCase() }] : []
  })
}

function artists(value: unknown): CoverArtist[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isObject(item)) return []
    const id = text(item._id)
    const name = text(item.name)
    return id && name ? [{ id, name }] : []
  })
}

const VIDEO_ID = /^[\w-]{11}$/

/** The YouTube video id in a watch, short, embed or youtu.be URL, or null. */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = parsed.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, kind, value] = parsed.pathname.split('/')
    id =
      kind === 'watch'
        ? parsed.searchParams.get('v')
        : ['embed', 'shorts', 'live'].includes(kind ?? '')
          ? (value ?? null)
          : null
  }
  return id && VIDEO_ID.test(id) ? id : null
}

function video(value: unknown): Video | null {
  if (!Array.isArray(value)) return null
  for (const link of value) {
    if (!isObject(link) || link.platform !== 'youtube') continue
    const url = text(link.url)
    const videoId = url ? youtubeVideoId(url) : null
    if (videoId) {
      const start =
        typeof link.timeStamp === 'number' && link.timeStamp > 0 ? Math.floor(link.timeStamp) : 0
      return { videoId, startSeconds: start }
    }
  }
  return null
}

export function parseSong(value: unknown): CoverSong | null {
  if (!isObject(value)) return null
  const id = text(value._id)
  const title = text(value.title)
  const artist = isObject(value.artist) ? value.artist : {}
  const genres = isObject(value.genres) ? value.genres : {}
  const credits = artists(artist.coverArtist)
  if (!id || !title || credits.length === 0) return null
  return {
    id,
    title,
    artists: credits,
    genres: facets(genres.cover),
    subGenres: facets(value.subGenre),
    moods: facets(value.mood),
    styles: facets(value.performanceStyle),
    originalArtists: artists(artist.original),
    originalGenres: facets(genres.original),
    video: video(value.links),
    addedAt: text(value.createdAt),
  }
}

export function parseSongs(value: unknown): CoverSong[] {
  if (!Array.isArray(value)) return []
  const songs: CoverSong[] = []
  value.forEach((item, index) => {
    const song = parseSong(item)
    if (song) songs.push(song)
    else if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
      console.warn(`[songs] Skipped song ${index}: missing id, title or cover artist`, item)
    }
  })
  return songs
}
