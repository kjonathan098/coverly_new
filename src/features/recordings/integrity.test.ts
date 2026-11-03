import { describe, expect, it } from 'vitest'
import { placeholderRecordings } from '../../mocks/fixtures/recordings'
import { assertValidRecordings, validateRecordings } from './integrity'
import type { Recording } from './types'

function recording(overrides: Partial<Recording> & Pick<Recording, 'id' | 'kind'>): Recording {
  return {
    originalRecordingId: null,
    title: 'Test Recording',
    artists: [],
    genres: [],
    performanceStyles: [],
    moods: [],
    source: null,
    ...overrides,
  }
}

const original = recording({ id: 'o1', kind: 'original' })

describe('validateRecordings', () => {
  it('accepts the placeholder fixtures', () => {
    expect(validateRecordings(placeholderRecordings)).toEqual([])
  })

  it('accepts standalone originals and unlinked covers', () => {
    expect(
      validateRecordings([
        original,
        recording({ id: 'c1', kind: 'cover', originalRecordingId: null }),
      ]),
    ).toEqual([])
  })

  it('accepts a cover linked to an existing original', () => {
    expect(
      validateRecordings([
        original,
        recording({ id: 'c1', kind: 'cover', originalRecordingId: 'o1' }),
      ]),
    ).toEqual([])
  })

  it('I1: rejects an original with a non-null originalRecordingId', () => {
    const invalid = recording({ id: 'o2', kind: 'original', originalRecordingId: 'o1' })
    expect(validateRecordings([original, invalid])).toEqual([
      expect.objectContaining({ rule: 'I1', recordingId: 'o2' }),
    ])
  })

  it('I2: rejects a cover whose originalRecordingId is neither a non-empty string nor null', () => {
    const empty = recording({ id: 'c1', kind: 'cover', originalRecordingId: '' })
    const numeric = recording({
      id: 'c2',
      kind: 'cover',
      originalRecordingId: 42 as unknown as string,
    })
    expect(validateRecordings([original, empty, numeric])).toEqual([
      expect.objectContaining({ rule: 'I2', recordingId: 'c1' }),
      expect.objectContaining({ rule: 'I2', recordingId: 'c2' }),
    ])
  })

  it('I3: rejects a cover that references another cover, including itself', () => {
    const cover = recording({ id: 'c1', kind: 'cover', originalRecordingId: 'o1' })
    const coverOfCover = recording({ id: 'c2', kind: 'cover', originalRecordingId: 'c1' })
    const selfReference = recording({ id: 'c3', kind: 'cover', originalRecordingId: 'c3' })
    expect(validateRecordings([original, cover, coverOfCover, selfReference])).toEqual([
      expect.objectContaining({ rule: 'I3', recordingId: 'c2' }),
      expect.objectContaining({ rule: 'I3', recordingId: 'c3' }),
    ])
  })

  it('I4: rejects a cover that references a recording that does not exist', () => {
    const dangling = recording({ id: 'c1', kind: 'cover', originalRecordingId: 'missing' })
    expect(validateRecordings([original, dangling])).toEqual([
      expect.objectContaining({ rule: 'I4', recordingId: 'c1' }),
    ])
  })

  it('never links recordings that only share a title and artists', () => {
    const shared = { title: 'Same Song', artists: [{ id: 'a1', name: 'Same Artist' }] }
    const lookalikeOriginal = recording({ id: 'o9', kind: 'original', ...shared })
    const lookalikeCover = recording({ id: 'c9', kind: 'cover', ...shared })
    const recordings = [lookalikeOriginal, lookalikeCover]

    expect(validateRecordings(recordings)).toEqual([])
    expect(lookalikeCover.originalRecordingId).toBeNull()
  })
})

describe('assertValidRecordings', () => {
  it('throws listing every violation', () => {
    const invalid = [
      recording({ id: 'o2', kind: 'original', originalRecordingId: 'o1' }),
      recording({ id: 'c1', kind: 'cover', originalRecordingId: 'missing' }),
    ]
    expect(() => assertValidRecordings([original, ...invalid])).toThrow(/I1 \(o2\)[\s\S]*I4 \(c1\)/)
  })

  it('does not throw for valid recordings', () => {
    expect(() => assertValidRecordings(placeholderRecordings)).not.toThrow()
  })
})
