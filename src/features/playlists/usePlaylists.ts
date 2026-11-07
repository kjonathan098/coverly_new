import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useSession } from '../auth/session'
import {
  createPlaylist,
  deletePlaylist,
  fetchPlaylists,
  renamePlaylist,
  setPlaylistSong,
  type Playlist,
} from './api'
import { playlistKeys } from './keys'

/**
 * The logged-in user's playlists, newest first: one cached query shared by the Library, playlist
 * pages and every add-to-playlist picker, so they always agree. Guests have none (no request).
 */
export function usePlaylists() {
  const { data: user } = useSession()
  const query = useQuery({
    queryKey: playlistKeys.of(user?.id ?? ''),
    queryFn: fetchPlaylists,
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  })
  return { user: user ?? null, playlists: query.data, query }
}

function useKey() {
  const { data: user } = useSession()
  return playlistKeys.of(user?.id ?? '')
}

/**
 * Overlapping changes are safe: only the last one to finish re-reads the list, so an older answer
 * never overwrites a newer change, and the cache always ends on what the server holds.
 */
function settle(queryClient: QueryClient, key: readonly unknown[]) {
  if (queryClient.isMutating({ mutationKey: playlistKeys.change }) === 1) {
    return queryClient.invalidateQueries({ queryKey: key })
  }
}

const replace = (playlists: Playlist[] | undefined, updated: Playlist) =>
  playlists?.map((playlist) => (playlist.id === updated.id ? updated : playlist))

/**
 * Adds or removes one song, optimistically. Changes to the same song in the same playlist reach the
 * server one at a time, in click order (mutation `scope`); a failure re-reads the list.
 */
export function usePlaylistSong(playlistId: string, songId: string) {
  const queryClient = useQueryClient()
  const key = useKey()
  return useMutation({
    mutationKey: playlistKeys.change,
    scope: { id: `playlist:${playlistId}:${songId}` },
    mutationFn: (inPlaylist: boolean) => setPlaylistSong(playlistId, songId, inPlaylist),
    onMutate: async (inPlaylist) => {
      await queryClient.cancelQueries({ queryKey: key })
      queryClient.setQueryData<Playlist[]>(key, (playlists) =>
        playlists?.map((playlist) => {
          if (playlist.id !== playlistId) return playlist
          const rest = playlist.songIds.filter((id) => id !== songId)
          return { ...playlist, songIds: inPlaylist ? [...rest, songId] : rest }
        }),
      )
    },
    onSettled: () => settle(queryClient, key),
  })
}

/** Creates a playlist, optionally with a first song. Waits for the server (it assigns the id). */
export function useCreatePlaylist() {
  const queryClient = useQueryClient()
  const key = useKey()
  return useMutation({
    mutationKey: playlistKeys.change,
    mutationFn: ({ name, songId }: { name: string; songId?: string }) =>
      createPlaylist(name, songId),
    onSuccess: (created) =>
      queryClient.setQueryData<Playlist[]>(key, (playlists) =>
        playlists ? [created, ...playlists.filter((p) => p.id !== created.id)] : playlists,
      ),
    onSettled: () => settle(queryClient, key),
  })
}

export function useRenamePlaylist(playlistId: string) {
  const queryClient = useQueryClient()
  const key = useKey()
  return useMutation({
    mutationKey: playlistKeys.change,
    scope: { id: `playlist:${playlistId}` },
    mutationFn: (name: string) => renamePlaylist(playlistId, name),
    onSuccess: (renamed) =>
      queryClient.setQueryData<Playlist[]>(key, (playlists) => replace(playlists, renamed)),
    onSettled: () => settle(queryClient, key),
  })
}

export function useDeletePlaylist(playlistId: string) {
  const queryClient = useQueryClient()
  const key = useKey()
  return useMutation({
    mutationKey: playlistKeys.change,
    scope: { id: `playlist:${playlistId}` },
    mutationFn: () => deletePlaylist(playlistId),
    onSuccess: () =>
      queryClient.setQueryData<Playlist[]>(key, (playlists) =>
        playlists?.filter((playlist) => playlist.id !== playlistId),
      ),
    onSettled: () => settle(queryClient, key),
  })
}
