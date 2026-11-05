import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { songFixtures } from '../../mocks/fixtures/songs'
import { FakePlayer, livePlayer } from '../../test/fakeYouTube'
import { parseSongs } from '../songs/contract'
import {
  YOUTUBE_HOST,
  attachPlayer,
  close,
  play,
  usePlayback,
  usePlaybackOf,
  type PlaybackStatus,
} from './playback'
import { PlayerState } from './youtubeApi'

const songs = parseSongs(songFixtures)
const byTitle = (title: string) => songs.find((s) => s.title === title)!
const lanterns = byTitle('paper lanterns') // AAAAAAAAAA1
const lowTide = byTitle('Low Tide') // BBBBBBBBBB2, starts at 30s
const nightBus = byTitle('night bus') // EEEEEEEEEE5
const noVideo = byTitle('no link yet')

let host: HTMLElement
const status = () => renderHook(() => usePlayback()).result

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  attachPlayer(host)
  return () => host.remove()
})

/** Runs an action, then lets the fake YouTube's events arrive. */
const step = async (fn: () => void) => {
  await act(async () => {
    fn()
    await Promise.resolve()
  })
}

describe('one player for the whole app', () => {
  it('creates a single privacy-enhanced YouTube player in the shell’s element', async () => {
    const playback = status()
    await step(() => play(lowTide))
    await waitFor(() => expect(playback.current.status).toBe('playing'))

    const player = livePlayer()
    expect(player.options).toMatchObject({
      host: YOUTUBE_HOST,
      videoId: 'BBBBBBBBBB2',
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, start: 30 },
    })
    expect(host.querySelector('iframe')).toBe(player.iframe)
    expect(player.iframe.title).toBe('Low Tide, playing from YouTube')
    expect(playback.current.song?.id).toBe(lowTide.id)
  })

  it('replaces the recording in the same player instead of making another', async () => {
    const playback = status()
    await step(() => play(lanterns))
    await waitFor(() => expect(playback.current.status).toBe('playing'))
    const first = livePlayer()

    await step(() => play(lowTide))
    await waitFor(() => expect(playback.current.song?.id).toBe(lowTide.id))
    expect(FakePlayer.instances).toHaveLength(1)
    expect(livePlayer()).toBe(first)
    expect(host.querySelectorAll('iframe')).toHaveLength(1)
    expect(first.calls).toEqual(['load BBBBBBBBBB2 @30'])
    expect(first.iframe.title).toBe('Low Tide, playing from YouTube')
  })

  it('keeps only the latest pick when several arrive while YouTube is starting', async () => {
    const playback = status()
    play(lanterns)
    play(nightBus)
    await waitFor(() => expect(playback.current.status).toBe('playing'))
    expect(FakePlayer.instances).toHaveLength(1)
    expect(livePlayer().videoId).toBe('EEEEEEEEEE5')
  })

  it('ignores a recording without a video', async () => {
    await step(() => play(noVideo))
    expect(FakePlayer.instances).toHaveLength(0)
    expect(status().current.status).toBe('idle')
  })
})

describe('pause, resume, replay', () => {
  it('pauses and resumes the current recording', async () => {
    const playback = status()
    await step(() => play(nightBus))
    await waitFor(() => expect(playback.current.status).toBe('playing'))

    await step(() => play(nightBus))
    expect(playback.current.status).toBe('paused')
    await step(() => play(nightBus))
    expect(playback.current.status).toBe('playing')
    expect(livePlayer().calls).toEqual(['pause', 'play'])
  })

  it('follows YouTube’s own controls', async () => {
    const playback = status()
    await step(() => play(nightBus))
    await step(() => livePlayer().emit(PlayerState.PAUSED))
    expect(playback.current.status).toBe('paused')
    await step(() => livePlayer().emit(PlayerState.PLAYING))
    expect(playback.current.status).toBe('playing')
  })

  it('stays on an ended recording, and replays it from its start', async () => {
    const playback = status()
    await step(() => play(lowTide))
    await step(() => livePlayer().emit(PlayerState.ENDED))
    expect(playback.current.status).toBe('ended')
    expect(host.querySelector('iframe')).not.toBeNull()

    await step(() => play(lowTide))
    expect(livePlayer().calls).toEqual(['seek 30', 'play'])
    expect(playback.current.status).toBe('playing')
  })
})

describe('when a recording can’t play', () => {
  it.each([
    [100, 'removed'],
    [101, 'not-embeddable'],
    [150, 'not-embeddable'],
    [5, 'other'],
  ])('reports YouTube error %i as %s', async (code, problem) => {
    const playback = status()
    await step(() => play(nightBus))
    await step(() => livePlayer().fail(code))
    expect(playback.current).toMatchObject({ status: 'unavailable', problem })
  })

  it('retries when the same recording is picked again', async () => {
    const playback = status()
    await step(() => play(nightBus))
    await step(() => livePlayer().fail(150))
    await step(() => play(nightBus))
    expect(livePlayer().calls).toEqual(['load EEEEEEEEEE5'])
    expect(playback.current.status).toBe('playing')
  })

  it('waits, paused, when the browser blocks autoplay', async () => {
    const playback = status()
    await step(() => play(nightBus))
    await step(() => livePlayer().blockAutoplay())
    expect(playback.current.status).toBe('paused')
  })
})

describe('close', () => {
  it('destroys the player and removes it from the page', async () => {
    const playback = status()
    await step(() => play(nightBus))
    const player = livePlayer()
    await step(() => close())
    expect(player.destroyed).toBe(true)
    expect(host.childElementCount).toBe(0)
    expect(playback.current).toEqual({ song: null, status: 'idle', problem: null })
  })

  it('starts a fresh player on the next play, never two at once', async () => {
    await step(() => play(nightBus))
    await step(() => close())
    await step(() => play(lanterns))
    await waitFor(() => expect(FakePlayer.instances).toHaveLength(2))
    expect(livePlayer().videoId).toBe('AAAAAAAAAA1')
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('creates nothing if closed while YouTube is still loading', async () => {
    play(nightBus)
    close()
    await act(() => Promise.resolve())
    expect(FakePlayer.instances).toHaveLength(0)
  })
})

describe('usePlaybackOf', () => {
  it('answers only for the current recording', async () => {
    const renders = vi.fn()
    const mine = renderHook(() => {
      renders()
      return usePlaybackOf(nightBus.id)
    }).result
    const other = renderHook(() => usePlaybackOf(lanterns.id)).result
    renders.mockClear()

    await step(() => play(nightBus))
    await waitFor(() => expect(mine.current).toBe<PlaybackStatus>('playing'))
    expect(other.current).toBeNull()

    await step(() => play(lanterns))
    expect(mine.current).toBeNull()
    expect(other.current).not.toBeNull()
  })

  it('doesn’t re-render rows whose answer didn’t change', async () => {
    const renders = vi.fn()
    renderHook(() => {
      renders()
      return usePlaybackOf(lanterns.id)
    })
    renders.mockClear()
    await step(() => play(nightBus))
    await step(() => livePlayer().emit(PlayerState.PAUSED))
    expect(renders).not.toHaveBeenCalled()
  })
})

it('waits for the shell before creating a player', async () => {
  host.remove()
  const detach = attachPlayer(document.createElement('div'))
  detach()
  await step(() => play(nightBus))
  expect(FakePlayer.instances).toHaveLength(0)

  const shell = document.createElement('div')
  await step(() => attachPlayer(shell))
  await waitFor(() => expect(shell.querySelector('iframe')).not.toBeNull())
})
