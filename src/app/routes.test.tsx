import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { expect, it } from 'vitest'
import { Providers } from './providers'
import { routes } from './routes'

it('serves the living design system at /design in development', async () => {
  const router = createMemoryRouter(routes, { initialEntries: ['/design'] })
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  )
  expect(await screen.findByRole('heading', { name: 'Recording tiles' })).toBeInTheDocument()
  expect(screen.getByText('Development only. Not part of production builds.')).toBeInTheDocument()
})
