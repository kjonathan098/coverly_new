import type { RouteObject } from 'react-router'
import { DiscoverPage } from '../features/discover/DiscoverPage'
import { HomePage } from '../features/home/HomePage'
import { AppShell } from './AppShell'
import { RouteError } from './RouteError'

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
