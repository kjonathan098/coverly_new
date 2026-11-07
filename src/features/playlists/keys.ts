/** Playlist query keys. Per user, so one account never sees another's cached playlists. */
export const playlistKeys = {
  all: ['playlists'] as const,
  of: (userId: string) => ['playlists', userId] as const,
  change: ['playlists', 'change'] as const,
}
