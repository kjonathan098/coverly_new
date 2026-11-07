import { Navigate, type RouteObject } from 'react-router'
import { DiscoverPage } from '../features/discover/DiscoverPage'
import { HomePage } from '../features/home/HomePage'
import { MagazinePage } from '../features/magazine/MagazinePage'
import { AppShell } from './AppShell'
import { RouteError } from './RouteError'
import { FavoritesPage } from '../features/favorites/FavoritesPage'
import { LibraryPage } from '../features/library/LibraryPage'
import { PlaylistPage } from '../features/library/PlaylistPage'

// The living design system. Registered only in development: in production builds this branch is
// dead code, so the page and its fixtures are never bundled.
const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/design',
        lazy: { Component: async () => (await import('../design/DesignPage')).DesignPage },
      },
    ]
  : []

/**
 * One root layout, AppShell, around every page, so in-app navigation never unmounts it (or the
 * player it holds). Errors and unknown paths are caught one level down, inside the shell.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/discover', element: <DiscoverPage /> },
          { path: '/magazine', element: <MagazinePage /> },
          { path: '/library', element: <LibraryPage /> },
          { path: '/library/favorites', element: <FavoritesPage /> },
          { path: '/library/playlists/:id', element: <PlaylistPage /> },
          // Favorites moved into Your Library.
          { path: '/favorites', element: <Navigate to="/library/favorites" replace /> },
          ...developmentRoutes,
          // Any path Coverly doesn't have: a 404, shown by RouteError inside the shell.
          {
            path: '*',
            loader: () => {
              throw new Response('Not found', { status: 404 })
            },
          },
        ],
      },
    ],
  },
]
