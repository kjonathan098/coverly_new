export type TagType = 'genre' | 'subGenre' | 'performanceStyle' | 'mood'

export type Tag = {
  id: string
  name: string
  type: TagType
}

export type ArtistRef = {
  id: string
  name: string
  imageUrl?: string
}

export type RecordingKind = 'original' | 'cover'

export type RecordingSource = {
  platform: 'youtube'
  videoId: string
  startSeconds?: number
}

export type Recording = {
  id: string
  kind: RecordingKind
  /** The only link between a cover and its original. Never inferred from other fields. */
  originalRecordingId: string | null
  title: string
  artists: ArtistRef[]
  year?: number
  genres: Tag[]
  performanceStyles: Tag[]
  moods: Tag[]
  source: RecordingSource | null
}

export type Page<T> = {
  items: T[]
  nextCursor: string | null
}

export type Exploration = {
  recording: Recording
  original: Recording | null
  covers: Page<Recording>
}
