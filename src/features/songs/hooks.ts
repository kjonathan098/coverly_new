import { useQuery } from '@tanstack/react-query'
import { fetchCoverSongs } from './api'

export const songKeys = { all: ['songs'] as const }

export function useCoverSongs() {
  return useQuery({ queryKey: songKeys.all, queryFn: fetchCoverSongs, staleTime: 5 * 60_000 })
}
