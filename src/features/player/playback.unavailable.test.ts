import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { songFixtures } from '../../mocks/fixtures/songs'
import { uninstallFakeYouTube } from '../../test/fakeYouTube'
import { parseSongs } from '../songs/contract'
import { attachPlayer, play, usePlayback } from './playback'
import { resetYouTubeApiLoader } from './youtubeApi'

afterEach(() => {
  vi.restoreAllMocks()
  resetYouTubeApiLoader()
})

it('says the player could not load instead of pretending to play', async () => {
  // No YouTube API on the page, and its script fails to arrive (offline, blocked by an extension).
  uninstallFakeYouTube()
  const append = document.head.appendChild.bind(document.head)
  vi.spyOn(document.head, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
    if (node instanceof HTMLScriptElement && node.src.includes('youtube.com/iframe_api')) {
      queueMicrotask(() => node.onerror?.(new Event('error')))
      return node
    }
    return append(node)
  })

  const song = parseSongs(songFixtures).find((s) => s.title === 'night bus')!
  attachPlayer(document.createElement('div'))
  const playback = renderHook(() => usePlayback()).result
  await act(async () => play(song))
  await waitFor(() =>
    expect(playback.current).toMatchObject({ status: 'unavailable', problem: 'not-loaded' }),
  )
})
