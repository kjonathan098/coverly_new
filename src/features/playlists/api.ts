import { ApiError, ContractError, apiRequest, type ApiPath } from '../../lib/api'

/** One of the user's playlists. Songs are ids, in the order they were added. */
export type Playlist = { id: string; name: string; songIds: string[] }

/** Matches the backend's limits (playlists.route.js). */
export const MAX_PLAYLIST_NAME = 100

const PLAYLISTS: ApiPath = '/api/playlists'

function parsePlaylist(path: ApiPath, data: unknown): Playlist {
  const { _id, name, songs } = (data ?? {}) as { _id?: unknown; name?: unknown; songs?: unknown }
  if (
    typeof _id !== 'string' ||
    typeof name !== 'string' ||
    !Array.isArray(songs) ||
    !songs.every((id) => typeof id === 'string')
  ) {
    throw new ContractError(`${path}: expected a playlist`)
  }
  // Never twice (the backend guarantees it; older data is tolerated).
  return { id: _id, name, songIds: [...new Set(songs as string[])] }
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const data = await apiRequest(PLAYLISTS)
  if (!Array.isArray(data)) throw new ContractError(`${PLAYLISTS}: expected a list of playlists`)
  return data.map((item) => parsePlaylist(PLAYLISTS, item))
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export async function createPlaylist(name: string, songId?: string): Promise<Playlist> {
  return parsePlaylist(PLAYLISTS, await apiRequest(PLAYLISTS, json('POST', { name, songId })))
}

export async function renamePlaylist(id: string, name: string): Promise<Playlist> {
  const path: ApiPath = `${PLAYLISTS}/${encodeURIComponent(id)}`
  return parsePlaylist(path, await apiRequest(path, json('PATCH', { name })))
}

export async function deletePlaylist(id: string): Promise<void> {
  await apiRequest(`${PLAYLISTS}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** Adds (PUT) or removes (DELETE) one song; returns the updated playlist. Both are idempotent. */
export async function setPlaylistSong(id: string, songId: string, inPlaylist: boolean) {
  const path: ApiPath = `${PLAYLISTS}/${encodeURIComponent(id)}/songs/${encodeURIComponent(songId)}`
  return parsePlaylist(path, await apiRequest(path, { method: inPlaylist ? 'PUT' : 'DELETE' }))
}

/** A short, readable reason for a failed playlist change. */
export function playlistErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // The backend's own words for limits ("You can have up to 200 playlists").
    if (error.status === 409) return error.message.slice(error.message.indexOf(': ') + 2)
    if (error.status === 400) return `Names are 1 to ${MAX_PLAYLIST_NAME} characters.`
    if (error.status === 404) return 'That playlist or song no longer exists.'
  }
  return 'Couldn’t save. Try again.'
}
