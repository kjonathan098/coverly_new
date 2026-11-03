import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { API_BASE_URL } from '../lib/api'
import { server } from '../mocks/server'

const apiOrigin = new URL(API_BASE_URL).origin

beforeAll(() => {
  server.listen({
    // Unmocked calls to the API origin fail the test; other origins (local test servers) pass through.
    onUnhandledFrame({ frame, defaults }) {
      if (frame.protocol !== 'http') return
      const { request } = frame.data as { request: Request }
      if (new URL(request.url).origin === apiOrigin) defaults.error()
    },
  })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
