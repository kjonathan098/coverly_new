import { ContractError, apiRequest, type ApiPath } from '../../lib/api'

const FAVORITES: ApiPath = '/api/user/favorites'

/** The backend answers every favorites call with the user's favorite song ids, oldest first. */
function parseIds(path: ApiPath, data: unknown): string[] {
  if (!Array.isArray(data) || !data.every((id) => typeof id === 'string')) {
    throw new ContractError(`${path}: expected a list of song ids`)
  }
  return data
}

export async function fetchFavorites(): Promise<string[]> {
  return parseIds(FAVORITES, await apiRequest(FAVORITES))
}

/** Adds (PUT) or removes (DELETE) one favorite; returns the updated list. Both are idempotent. */
export async function setFavorite(songId: string, favorite: boolean): Promise<string[]> {
  const path: ApiPath = `${FAVORITES}/${encodeURIComponent(songId)}`
  return parseIds(path, await apiRequest(path, { method: favorite ? 'PUT' : 'DELETE' }))
}
