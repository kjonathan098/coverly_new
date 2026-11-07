import { ApiError, ContractError, apiRequest, type ApiPath } from '../../lib/api'

/**
 * A playlist. `official`: a Coverly playlist (public, changed only by admins). Otherwise one of the
 * user's own (private). Songs are ids, in the order they were added.
 */
export type Playlist = {
  id: string
  name: string
  description: string
  official: boolean
  songIds: string[]
}

/** Which set of playlists a call is about: the user's own, or Coverly's. */
export type PlaylistKind = 'mine' | 'official'

/** Matches the backend's limits (playlists.route.js). */
export const MAX_PLAYLIST_NAME = 100
export const MAX_PLAYLIST_DESCRIPTION = 200

const BASE: Record<PlaylistKind, ApiPath> = {
  mine: '/api/playlists',
  official: '/api/official-playlists',
}

function parsePlaylist(path: ApiPath, data: unknown): Playlist {
  const { _id, name, songs, description, type } = (data ?? {}) as Record<string, unknown>
  if (
    typeof _id !== 'string' ||
    typeof name !== 'string' ||
    !Array.isArray(songs) ||
    !songs.every((id) => typeof id === 'string')
  ) {
    throw new ContractError(`${path}: expected a playlist`)
  }
  return {
    id: _id,
    name,
    description: typeof description === 'string' ? description : '',
    official: type === 'official',
    // Never twice (the backend guarantees it; older data is tolerated).
    songIds: [...new Set(songs as string[])],
  }
}

async function fetchList(kind: PlaylistKind): Promise<Playlist[]> {
  const path = BASE[kind]
  const data = await apiRequest(path)
  if (!Array.isArray(data)) throw new ContractError(`${path}: expected a list of playlists`)
  return data.map((item) => parsePlaylist(path, item))
}

export const fetchPlaylists = () => fetchList('mine')
/** Coverly's playlists: public, no login needed. */
export const fetchOfficialPlaylists = () => fetchList('official')

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const one = (kind: PlaylistKind, id: string): ApiPath => `${BASE[kind]}/${encodeURIComponent(id)}`

export async function createPlaylist(name: string, songId?: string, kind: PlaylistKind = 'mine') {
  return parsePlaylist(BASE[kind], await apiRequest(BASE[kind], json('POST', { name, songId })))
}

/** Renames, and for a Coverly playlist can also set its description. */
export async function updatePlaylist(
  id: string,
  changes: { name?: string; description?: string },
  kind: PlaylistKind = 'mine',
) {
  const path = one(kind, id)
  return parsePlaylist(path, await apiRequest(path, json('PATCH', changes)))
}

export async function deletePlaylist(id: string, kind: PlaylistKind = 'mine'): Promise<void> {
  await apiRequest(one(kind, id), { method: 'DELETE' })
}

/** Adds (PUT) or removes (DELETE) one song; returns the updated playlist. Both are idempotent. */
export async function setPlaylistSong(
  id: string,
  songId: string,
  inPlaylist: boolean,
  kind: PlaylistKind = 'mine',
) {
  const path: ApiPath = `${one(kind, id)}/songs/${encodeURIComponent(songId)}`
  return parsePlaylist(path, await apiRequest(path, { method: inPlaylist ? 'PUT' : 'DELETE' }))
}

/** Admin, owner: makes one of my playlists a Coverly playlist (same id and songs). */
export async function publishPlaylist(id: string) {
  const path: ApiPath = `${one('mine', id)}/publish`
  return parsePlaylist(path, await apiRequest(path, { method: 'POST' }))
}

/** Admin: makes a Coverly playlist personal again, in its creator's Library. */
export async function unpublishPlaylist(id: string) {
  const path: ApiPath = `${one('official', id)}/unpublish`
  return parsePlaylist(path, await apiRequest(path, { method: 'POST' }))
}

/** A short, readable reason for a failed playlist change. */
export function playlistErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // The backend's own words for limits ("You can have up to 200 playlists") and bad input.
    if (error.status === 409 || error.status === 400) {
      return error.message.slice(error.message.indexOf(': ') + 2)
    }
    if (error.status === 403) return 'Only Coverly admins can change Coverly playlists.'
    if (error.status === 404) return 'That playlist or song no longer exists.'
  }
  return 'Couldn’t save. Try again.'
}
