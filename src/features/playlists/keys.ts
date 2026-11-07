/** Playlist query keys. The user's own are per user; Coverly's are the same for everyone. */
export const playlistKeys = {
  all: ['playlists'] as const,
  of: (userId: string) => ['playlists', userId] as const,
  official: ['official-playlists'] as const,
  change: ['playlists', 'change'] as const,
}
