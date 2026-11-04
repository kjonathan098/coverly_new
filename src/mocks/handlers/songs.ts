import { http, HttpResponse, type AnyHandler } from 'msw'
import { apiUrl } from '../../lib/api'
import { malformedSong, songFixtures } from '../fixtures/songs'

// Mirrors the real backend: every song, populated, inside the { success, message } envelope.
export const songsHandlers: AnyHandler[] = [
  http.get(apiUrl('/api/songs/all-songs'), () =>
    HttpResponse.json({ success: true, message: [...songFixtures, malformedSong] }),
  ),
]
