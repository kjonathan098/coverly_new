import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useSession } from '../auth/session'
import {
  createPlaylist,
  deletePlaylist,
  fetchOfficialPlaylists,
  fetchPlaylists,
  publishPlaylist,
  setPlaylistSong,
  unpublishPlaylist,
  updatePlaylist,
  type Playlist,
  type PlaylistKind,
} from './api'
import { playlistKeys } from './keys'

/**
 * The logged-in user's own playlists, newest first: one cached query shared by the Library, playlist
 * pages and the add-to-playlist modal, so they always agree. Guests have none (no request).
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

/** Coverly's playlists, newest first. Public: the same for everyone, guests included. */
export function useOfficialPlaylists() {
  const query = useQuery({
    queryKey: playlistKeys.official,
    queryFn: fetchOfficialPlaylists,
    staleTime: 5 * 60_000,
  })
  return { playlists: query.data, query }
}

/** The cache a kind of playlist lives in. */
function useKey(kind: PlaylistKind) {
  const { data: user } = useSession()
  return kind === 'official' ? playlistKeys.official : playlistKeys.of(user?.id ?? '')
}

/**
 * Overlapping changes are safe: only the last one to finish re-reads the lists, so an older answer
 * never overwrites a newer change, and the caches always end on what the server holds.
 */
function settle(queryClient: QueryClient, ...keys: (readonly unknown[])[]) {
  if (queryClient.isMutating({ mutationKey: playlistKeys.change }) === 1) {
    return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  }
}

const replace = (playlists: Playlist[] | undefined, updated: Playlist) =>
  playlists?.map((playlist) => (playlist.id === updated.id ? updated : playlist))

/**
 * Adds or removes one song, optimistically. Changes to the same song in the same playlist reach the
 * server one at a time, in click order (mutation `scope`); a failure re-reads the list.
 */
export function usePlaylistSong(playlistId: string, songId: string, kind: PlaylistKind = 'mine') {
  const queryClient = useQueryClient()
  const key = useKey(kind)
  return useMutation({
    mutationKey: playlistKeys.change,
    scope: { id: `playlist:${playlistId}:${songId}` },
    mutationFn: (inPlaylist: boolean) => setPlaylistSong(playlistId, songId, inPlaylist, kind),
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
export function useCreatePlaylist(kind: PlaylistKind = 'mine') {
  const queryClient = useQueryClient()
  const key = useKey(kind)
  return useMutation({
    mutationKey: playlistKeys.change,
    mutationFn: ({ name, songId }: { name: string; songId?: string }) =>
      createPlaylist(name, songId, kind),
    onSuccess: (created) =>
      queryClient.setQueryData<Playlist[]>(key, (playlists) =>
        playlists ? [created, ...playlists.filter((p) => p.id !== created.id)] : playlists,
      ),
    onSettled: () => settle(queryClient, key),
  })
}

/** Renames (and for a Coverly playlist, describes) a playlist. */
export function useUpdatePlaylist(playlistId: string, kind: PlaylistKind = 'mine') {
  const queryClient = useQueryClient()
  const key = useKey(kind)
  return useMutation({
    mutationKey: playlistKeys.change,
    scope: { id: `playlist:${playlistId}` },
    mutationFn: (changes: { name?: string; description?: string }) =>
      updatePlaylist(playlistId, changes, kind),
    onSuccess: (updated) =>
      queryClient.setQueryData<Playlist[]>(key, (playlists) => replace(playlists, updated)),
    onSettled: () => settle(queryClient, key),
  })
}

export function useDeletePlaylist(playlistId: string, kind: PlaylistKind = 'mine') {
  const queryClient = useQueryClient()
  const key = useKey(kind)
  return useMutation({
    mutationKey: playlistKeys.change,
    scope: { id: `playlist:${playlistId}` },
    mutationFn: () => deletePlaylist(playlistId, kind),
    onSuccess: () =>
      queryClient.setQueryData<Playlist[]>(key, (playlists) =>
        playlists?.filter((playlist) => playlist.id !== playlistId),
      ),
    onSettled: () => settle(queryClient, key),
  })
}

/**
 * Publish (admin, owner: one of my playlists becomes a Coverly playlist) or unpublish (admin: back to
 * its creator's Library). It moves between the two lists at once; both are then re-read.
 */
export function usePublishPlaylist(playlistId: string, publish: boolean) {
  const queryClient = useQueryClient()
  const mine = useKey('mine')
  const official = playlistKeys.official
  return useMutation({
    mutationKey: playlistKeys.change,
    scope: { id: `playlist:${playlistId}` },
    mutationFn: () => (publish ? publishPlaylist(playlistId) : unpublishPlaylist(playlistId)),
    onSuccess: (moved) => {
      const [from, to] = publish ? [mine, official] : [official, mine]
      queryClient.setQueryData<Playlist[]>(from, (playlists) =>
        playlists?.filter((playlist) => playlist.id !== moved.id),
      )
      queryClient.setQueryData<Playlist[]>(to, (playlists) =>
        playlists ? [moved, ...playlists.filter((p) => p.id !== moved.id)] : playlists,
      )
    },
    onSettled: () => settle(queryClient, mine, official),
  })
}
