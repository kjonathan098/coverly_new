import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLoginResult, useSession } from '../auth/session'
import { fetchFavorites, setFavorite } from './api'
import { favoriteKeys } from './keys'
import { forgetPendingFavorite, takePendingFavorite } from './pending'

/**
 * The logged-in user's favorite song ids, shared by every heart and the Favorites page through one
 * cached query, so they always agree. Guests have none (and no request is made).
 */
export function useFavorites() {
  const { data: user } = useSession()
  const query = useQuery({
    queryKey: favoriteKeys.of(user?.id ?? ''),
    queryFn: fetchFavorites,
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  })
  return { user: user ?? null, ids: query.data, query }
}

/**
 * Adds or removes one song, optimistically: the heart changes at once. Overlapping clicks are safe:
 * - changes to the same song reach the server one at a time, in click order (mutation `scope`);
 * - only the last of any overlapping changes re-reads the list, so an older answer never
 *   overwrites a newer click, and the cache always ends on what the server holds.
 * A failure re-reads the list too, so the heart goes back to the truth.
 */
export function useFavoriteToggle(songId: string) {
  const queryClient = useQueryClient()
  const { data: user } = useSession()
  const key = favoriteKeys.of(user?.id ?? '')

  return useMutation({
    mutationKey: favoriteKeys.toggle,
    scope: { id: `favorite:${songId}` },
    mutationFn: (favorite: boolean) => setFavorite(songId, favorite),
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<string[]>(key, (ids) => {
        if (!ids) return ids
        const rest = ids.filter((id) => id !== songId)
        return favorite ? [...rest, songId] : rest
      })
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: favoriteKeys.toggle }) === 1) {
        return queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/**
 * Completes a guest's favorite click once they've logged in (popup or full-page login), exactly once.
 * A canceled or failed login drops it. Mounted once, in the app shell; it never touches the player.
 */
export function useCompletePendingFavorite() {
  const queryClient = useQueryClient()
  const { data: user } = useSession()
  useLoginResult(forgetPendingFavorite)

  useEffect(() => {
    if (!user) return
    const songId = takePendingFavorite()
    if (!songId) return
    const key = favoriteKeys.of(user.id)
    setFavorite(songId, true)
      .then((ids) => queryClient.setQueryData(key, ids))
      .catch(() => queryClient.invalidateQueries({ queryKey: key }))
  }, [user, queryClient])
}
