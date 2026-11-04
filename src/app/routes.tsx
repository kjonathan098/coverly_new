import type { RouteObject } from 'react-router'
import { DiscoverPage } from '../features/discover/DiscoverPage'
import { HomePage } from '../features/home/HomePage'
import { SiteLayout } from './SiteLayout'

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

export const routes: RouteObject[] = [
  {
    element: <SiteLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/discover', element: <DiscoverPage /> },
    ],
  },
  ...developmentRoutes,
]
