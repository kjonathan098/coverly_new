/** Favorites query keys. Per user, so one account never sees another's cached favorites. */
export const favoriteKeys = {
  all: ['favorites'] as const,
  of: (userId: string) => ['favorites', userId] as const,
  toggle: ['favorites', 'toggle'] as const,
}
