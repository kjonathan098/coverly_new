import { ContractError } from '../../lib/api'
import type {
  ArtistRef,
  Exploration,
  Page,
  Recording,
  RecordingKind,
  RecordingSource,
  Tag,
  TagType,
} from './types'

type Parser<T> = (value: unknown, path: string) => T

const TAG_TYPES: readonly TagType[] = ['genre', 'subGenre', 'performanceStyle', 'mood']
const RECORDING_KINDS: readonly RecordingKind[] = ['original', 'cover']

function fail(path: string, expected: string): never {
  throw new ContractError(`${path}: expected ${expected}`)
}

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new ContractError(message)
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'an object')
  return value as Record<string, unknown>
}

const string: Parser<string> = (value, path) => {
  if (typeof value !== 'string' || value === '') fail(path, 'a non-empty string')
  return value
}

const number: Parser<number> = (value, path) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'a number')
  return value
}

function nullable<T>(parse: Parser<T>): Parser<T | null> {
  return (value, path) => (value === null ? null : parse(value, path))
}

function array<T>(parse: Parser<T>): Parser<T[]> {
  return (value, path) => {
    if (!Array.isArray(value)) fail(path, 'an array')
    return value.map((item, index) => parse(item, `${path}[${index}]`))
  }
}

function oneOf<T extends string>(options: readonly T[]): Parser<T> {
  return (value, path) => {
    if (!options.includes(value as T)) fail(path, options.map((o) => `"${o}"`).join(' | '))
    return value as T
  }
}

const tag: Parser<Tag> = (value, path) => {
  const raw = object(value, path)
  return {
    id: string(raw.id, `${path}.id`),
    name: string(raw.name, `${path}.name`),
    type: oneOf(TAG_TYPES)(raw.type, `${path}.type`),
  }
}

const artist: Parser<ArtistRef> = (value, path) => {
  const raw = object(value, path)
  const parsed: ArtistRef = {
    id: string(raw.id, `${path}.id`),
    name: string(raw.name, `${path}.name`),
  }
  if (raw.imageUrl !== undefined) parsed.imageUrl = string(raw.imageUrl, `${path}.imageUrl`)
  return parsed
}

const source: Parser<RecordingSource> = (value, path) => {
  const raw = object(value, path)
  const parsed: RecordingSource = {
    platform: oneOf(['youtube'] as const)(raw.platform, `${path}.platform`),
    videoId: string(raw.videoId, `${path}.videoId`),
  }
  if (raw.startSeconds !== undefined) {
    parsed.startSeconds = number(raw.startSeconds, `${path}.startSeconds`)
  }
  return parsed
}

export const parseRecording: Parser<Recording> = (value, path) => {
  const raw = object(value, path)
  const parsed: Recording = {
    id: string(raw.id, `${path}.id`),
    kind: oneOf(RECORDING_KINDS)(raw.kind, `${path}.kind`),
    originalRecordingId: nullable(string)(raw.originalRecordingId, `${path}.originalRecordingId`),
    title: string(raw.title, `${path}.title`),
    artists: array(artist)(raw.artists, `${path}.artists`),
    genres: array(tag)(raw.genres, `${path}.genres`),
    performanceStyles: array(tag)(raw.performanceStyles, `${path}.performanceStyles`),
    moods: array(tag)(raw.moods, `${path}.moods`),
    source: nullable(source)(raw.source, `${path}.source`),
  }
  if (raw.year !== undefined) parsed.year = number(raw.year, `${path}.year`)

  check(
    parsed.kind === 'cover' || parsed.originalRecordingId === null,
    `${path}: I1 violated, an original must have originalRecordingId: null`,
  )
  return parsed
}

function page<T>(parseItem: Parser<T>): Parser<Page<T>> {
  return (value, path) => {
    const raw = object(value, path)
    return {
      items: array(parseItem)(raw.items, `${path}.items`),
      nextCursor: nullable(string)(raw.nextCursor, `${path}.nextCursor`),
    }
  }
}

export function parseRecordingResponse(value: unknown, requestedId: string): Recording {
  const recording = parseRecording(value, 'recording')
  check(
    recording.id === requestedId,
    `recording.id: expected the requested recording "${requestedId}", got "${recording.id}"`,
  )
  return recording
}

export function parseExplorationResponse(value: unknown, requestedId: string): Exploration {
  const raw = object(value, 'exploration')
  const exploration: Exploration = {
    recording: parseRecording(raw.recording, 'exploration.recording'),
    original: nullable(parseRecording)(raw.original, 'exploration.original'),
    covers: page(parseRecording)(raw.covers, 'exploration.covers'),
  }
  checkExplorationConsistency(exploration, requestedId)
  return exploration
}

function checkExplorationConsistency(
  { recording, original, covers }: Exploration,
  requestedId: string,
): void {
  check(
    recording.id === requestedId,
    `exploration.recording.id: expected the requested recording "${requestedId}", got "${recording.id}"`,
  )

  if (original) {
    check(original.kind === 'original', 'exploration.original.kind: expected "original" (I3)')
  }

  if (recording.kind === 'original') {
    check(
      original?.id === recording.id,
      `exploration.original: an original's exploration must use the original itself ("${recording.id}")`,
    )
  } else if (recording.originalRecordingId === null) {
    check(original === null, 'exploration.original: an unlinked cover must have original: null')
  } else {
    check(
      original?.id === recording.originalRecordingId,
      `exploration.original: expected the linked original "${recording.originalRecordingId}", got ${original ? `"${original.id}"` : 'null'}`,
    )
  }

  if (original === null) {
    check(covers.items.length === 0, 'exploration.covers: must be empty when original is null')
    return
  }

  const seen = new Set<string>()
  covers.items.forEach((cover, index) => {
    const path = `exploration.covers.items[${index}]`
    check(cover.kind === 'cover', `${path}.kind: expected "cover"`)
    check(
      cover.originalRecordingId === original.id,
      `${path}.originalRecordingId: expected "${original.id}", got ${cover.originalRecordingId === null ? 'null' : `"${cover.originalRecordingId}"`}`,
    )
    check(!seen.has(cover.id), `${path}.id: duplicate cover "${cover.id}"`)
    seen.add(cover.id)
  })

  // With pagination the requested cover could sit on a later page, so only a complete list is checked.
  if (recording.kind === 'cover' && covers.nextCursor === null) {
    check(
      seen.has(recording.id),
      `exploration.covers: the requested cover "${recording.id}" is missing from its original's covers`,
    )
  }
}
