import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { resetPlayback } from '../features/player/playback'
import { API_BASE_URL } from '../lib/api'
import { server } from '../mocks/server'
import { installFakeYouTube, uninstallFakeYouTube } from './fakeYouTube'

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

// Every test gets a fake YouTube and a fresh player: nothing reaches youtube.com, and playback
// state (which lives outside React, like a page session) never leaks from one test to the next.
beforeEach(() => installFakeYouTube())

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetPlayback()
  uninstallFakeYouTube()
})

afterAll(() => server.close())
