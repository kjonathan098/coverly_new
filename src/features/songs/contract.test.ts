import { describe, expect, it } from 'vitest'
import { malformedSong, songFixtures } from '../../mocks/fixtures/songs'
import { parseSong, parseSongs, youtubeVideoId } from './contract'

describe('youtubeVideoId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=AAAAAAAAAA1&list=PL123', 'AAAAAAAAAA1'],
    ['https://m.youtube.com/watch?v=AAAAAAAAAA1', 'AAAAAAAAAA1'],
    ['https://youtu.be/BBBBBBBBBB2?t=30', 'BBBBBBBBBB2'],
    ['https://www.youtube.com/embed/CCCCCCCCCC3', 'CCCCCCCCCC3'],
    ['https://www.youtube.com/shorts/DDDDDDDDDD4', 'DDDDDDDDDD4'],
    ['https://www.youtube.com/live/EEEEEEEEEE5', 'EEEEEEEEEE5'],
    ['https://www.youtube-nocookie.com/embed/FFFFFFFFFF6', 'FFFFFFFFFF6'],
  ])('reads %s', (url, id) => {
    expect(youtubeVideoId(url)).toBe(id)
  })

  it.each([
    'not a url',
    'https://vimeo.com/123456789',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx',
    'https://youtu.be/',
  ])('rejects %s', (url) => {
    expect(youtubeVideoId(url)).toBeNull()
  })
})

describe('parseSong', () => {
  const [first, second] = songFixtures

  it('maps a populated backend song to a cover song, with labels lowercased', () => {
    const song = parseSong({ ...first, mood: [{ _id: 'm1', name: 'Dreamy' }] })
    expect(song).toMatchObject({
      title: 'paper lanterns',
      artists: [{ name: 'Mara Quill' }],
      genres: [{ name: 'folk' }],
      subGenres: [{ name: 'acoustic' }],
      moods: [{ id: 'm1', name: 'dreamy' }],
      styles: [{ name: 'stripped-down' }],
      video: { videoId: 'AAAAAAAAAA1', startSeconds: 0 },
    })
  })

  it('keeps the start time of a link', () => {
    expect(parseSong(second)?.video).toEqual({ videoId: 'BBBBBBBBBB2', startSeconds: 30 })
  })

  it('has no video when the song has no usable YouTube link', () => {
    expect(parseSong({ ...first, links: [] })?.video).toBeNull()
    expect(
      parseSong({ ...first, links: [{ url: 'https://vimeo.com/1', platform: 'vimeo' }] })?.video,
    ).toBeNull()
    expect(
      parseSong({ ...first, links: [{ url: 'nonsense', platform: 'youtube' }] })?.video,
    ).toBeNull()
  })

  it('carries the original artist and genres, for collection filters only', () => {
    expect(parseSong(first)).toMatchObject({
      originalArtists: [{ name: 'The Lamplighters' }],
      originalGenres: [{ name: 'pop' }],
    })
    expect(
      parseSong({ ...first, artist: { coverArtist: first!.artist.coverArtist } }),
    ).toMatchObject({ originalArtists: [], originalGenres: [{ name: 'pop' }] })
  })

  it('skips malformed labels and credits without rejecting the song', () => {
    const song = parseSong({
      ...first,
      mood: [null, { _id: 'm1' }, { name: 'no id' }, { _id: 'm2', name: ' warm ' }],
      artist: { coverArtist: [{ _id: 'a1', name: 'Mara Quill' }, 'not an object'] },
    })
    expect(song?.moods).toEqual([{ id: 'm2', name: 'warm' }])
    expect(song?.artists).toEqual([{ id: 'a1', name: 'Mara Quill' }])
  })

  it('rejects a song without an id, a title or a cover artist', () => {
    expect(parseSong(malformedSong)).toBeNull()
    expect(parseSong({ ...first, _id: undefined })).toBeNull()
    expect(parseSong({ ...first, title: '  ' })).toBeNull()
    expect(parseSong({ ...first, artist: { coverArtist: [] } })).toBeNull()
    expect(parseSong('a string')).toBeNull()
  })
})

describe('parseSongs', () => {
  it('drops invalid songs and keeps the rest', () => {
    const songs = parseSongs([...songFixtures, malformedSong, null])
    expect(songs).toHaveLength(songFixtures.length)
  })

  it('returns nothing for a payload that is not a list', () => {
    expect(parseSongs({ songs: [] })).toEqual([])
  })
})
