import { http, HttpResponse, type AnyHandler } from 'msw'
import { assertValidRecordings } from '../../features/recordings/integrity'
import type { Exploration, Recording } from '../../features/recordings/types'
import { apiUrl } from '../../lib/api'
import { placeholderRecordings } from '../fixtures/recordings'

assertValidRecordings(placeholderRecordings)

const byId = new Map(placeholderRecordings.map((recording) => [recording.id, recording]))

function resolveExploration(recording: Recording): Exploration {
  const originalId = recording.kind === 'original' ? recording.id : recording.originalRecordingId
  const original = originalId === null ? null : (byId.get(originalId) ?? null)
  const covers = original
    ? placeholderRecordings.filter(
        (r) => r.kind === 'cover' && r.originalRecordingId === original.id,
      )
    : []
  return { recording, original, covers: { items: covers, nextCursor: null } }
}

const ok = (message: unknown) => HttpResponse.json({ success: true, message })

const notFound = (id: string) =>
  HttpResponse.json({ success: false, message: `Recording "${id}" not found` }, { status: 404 })

export const recordingsHandlers: AnyHandler[] = [
  http.get<{ id: string }>(apiUrl('/api/recordings/:id'), ({ params }) => {
    const recording = byId.get(params.id)
    return recording ? ok(recording) : notFound(params.id)
  }),
  http.get<{ id: string }>(apiUrl('/api/recordings/:id/exploration'), ({ params }) => {
    const recording = byId.get(params.id)
    return recording ? ok(resolveExploration(recording)) : notFound(params.id)
  }),
]
