import { expect, it } from 'vitest'
import { PLACEHOLDER_IDS, placeholderRecordings } from './recordings'

it('is clearly placeholder data with no invented playback sources', () => {
  for (const recording of placeholderRecordings) {
    expect(recording.id).toMatch(/^placeholder-/)
    expect(recording.title).toMatch(/^Placeholder /)
    expect(recording.artists.every((a) => a.name.startsWith('Placeholder '))).toBe(true)
    expect(recording.source).toBeNull()
  }
})

it('provides every recording named in PLACEHOLDER_IDS exactly once', () => {
  const ids = placeholderRecordings.map((recording) => recording.id)
  expect(new Set(ids).size).toBe(ids.length)
  expect(ids).toEqual(expect.arrayContaining(Object.values(PLACEHOLDER_IDS)))
})
