import { ContractError, apiRequest } from '../../lib/api'
import { parseSongs } from './contract'
import type { CoverSong } from './types'

export async function fetchCoverSongs(): Promise<CoverSong[]> {
  const data = await apiRequest('/api/songs/all-songs')
  if (!Array.isArray(data))
    throw new ContractError('/api/songs/all-songs: expected a list of songs')
  return parseSongs(data)
}
