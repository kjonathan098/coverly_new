import { describe, expect, it } from 'vitest'
import { ContractError } from '../../lib/api'
import { PLACEHOLDER_IDS, placeholderRecordings } from '../../mocks/fixtures/recordings'
import { parseExplorationResponse, parseRecordingResponse } from './contract'
import type { Exploration, Recording } from './types'

function fixture(id: string): Recording {
  const found = placeholderRecordings.find((recording) => recording.id === id)
  if (!found) throw new Error(`No fixture ${id}`)
  return structuredClone(found)
}

const originalA = fixture(PLACEHOLDER_IDS.originalWithCovers)
const coverA1 = fixture(PLACEHOLDER_IDS.linkedCover)
const coverA2 = fixture(PLACEHOLDER_IDS.secondLinkedCover)
const originalB = fixture(PLACEHOLDER_IDS.originalWithoutCovers)
const unlinked = fixture(PLACEHOLDER_IDS.unlinkedCover)

function exploration(
  recording: Recording,
  original: Recording | null,
  covers: Recording[],
  nextCursor: string | null = null,
): Exploration {
  return { recording, original, covers: { items: covers, nextCursor } }
}

function expectContractError(run: () => unknown, message: RegExp) {
  expect(run).toThrow(ContractError)
  expect(run).toThrow(message)
}

describe('parseExplorationResponse: valid states', () => {
  it.each([
    ['original with covers', exploration(originalA, originalA, [coverA1, coverA2])],
    ['original without covers', exploration(originalB, originalB, [])],
    ['linked cover', exploration(coverA1, originalA, [coverA1, coverA2])],
    ['unlinked cover', exploration(unlinked, null, [])],
  ])('accepts an %s', (_, response) => {
    expect(parseExplorationResponse(structuredClone(response), response.recording.id)).toEqual(
      response,
    )
  })
})

describe('parseExplorationResponse: inconsistent responses', () => {
  it('rejects a response for a different recording than requested', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(originalB, originalB, []), originalA.id),
      /expected the requested recording "placeholder-original-a"/,
    )
  })

  it('rejects an original whose exploration uses a different original', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(originalA, originalB, []), originalA.id),
      /must use the original itself/,
    )
  })

  it('rejects a linked cover returned without its original', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(coverA1, null, []), coverA1.id),
      /expected the linked original "placeholder-original-a", got null/,
    )
  })

  it('rejects a linked cover returned with the wrong original', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(coverA1, originalB, [coverA1]), coverA1.id),
      /expected the linked original "placeholder-original-a", got "placeholder-original-b"/,
    )
  })

  it('rejects an unlinked cover that the response attaches to a lookalike original', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(unlinked, originalA, [coverA1]), unlinked.id),
      /an unlinked cover must have original: null/,
    )
  })

  it('rejects covers when there is no original', () => {
    const stray = { ...coverA1, originalRecordingId: null }
    expectContractError(
      () => parseExplorationResponse(exploration(unlinked, null, [stray]), unlinked.id),
      /must be empty when original is null/,
    )
  })

  it('rejects a cover that belongs to another original', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(originalB, originalB, [coverA1]), originalB.id),
      /items\[0\]\.originalRecordingId: expected "placeholder-original-b"/,
    )
  })

  it('rejects an original listed among the covers', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(originalA, originalA, [originalB]), originalA.id),
      /items\[0\]\.kind: expected "cover"/,
    )
  })

  it('rejects duplicate covers', () => {
    expectContractError(
      () =>
        parseExplorationResponse(
          exploration(originalA, originalA, [coverA1, coverA1]),
          originalA.id,
        ),
      /duplicate cover "placeholder-cover-a1"/,
    )
  })

  it('rejects a linked cover missing from its complete covers list', () => {
    expectContractError(
      () => parseExplorationResponse(exploration(coverA1, originalA, [coverA2]), coverA1.id),
      /requested cover "placeholder-cover-a1" is missing/,
    )
  })

  it('allows the requested cover to be absent when more pages exist', () => {
    const response = exploration(coverA1, originalA, [coverA2], 'cursor-2')
    expect(parseExplorationResponse(structuredClone(response), coverA1.id)).toEqual(response)
  })

  it('rejects a cover whose "original" is actually a cover (I3)', () => {
    const coverOfCover = { ...coverA2, id: 'c-of-c', originalRecordingId: coverA1.id }
    expectContractError(
      () => parseExplorationResponse(exploration(coverOfCover, coverA1, []), coverOfCover.id),
      /exploration\.original\.kind: expected "original" \(I3\)/,
    )
  })
})

describe('parseExplorationResponse: malformed data', () => {
  it('names the field that is missing', () => {
    const untitled = { ...originalB, title: undefined }
    expectContractError(
      () =>
        parseExplorationResponse(
          { ...exploration(originalB, originalB, []), recording: untitled },
          originalB.id,
        ),
      /exploration\.recording\.title: expected a non-empty string/,
    )
  })

  it('rejects an unknown recording kind', () => {
    const odd = { ...originalB, kind: 'remix' }
    expectContractError(
      () =>
        parseExplorationResponse(
          { ...exploration(originalB, originalB, []), recording: odd },
          originalB.id,
        ),
      /exploration\.recording\.kind: expected "original" \| "cover"/,
    )
  })

  it('rejects an original carrying an originalRecordingId (I1)', () => {
    const linkedOriginal = { ...originalB, originalRecordingId: originalA.id }
    expectContractError(
      () => parseExplorationResponse(exploration(linkedOriginal, linkedOriginal, []), originalB.id),
      /I1 violated/,
    )
  })

  it('rejects an invalid tag type', () => {
    const badTag = { ...originalB, moods: [{ id: 't', name: 'T', type: 'tempo' }] }
    expectContractError(
      () =>
        parseExplorationResponse(
          { ...exploration(originalB, originalB, []), recording: badTag },
          originalB.id,
        ),
      /exploration\.recording\.moods\[0\]\.type/,
    )
  })

  it('rejects covers that are not a page', () => {
    expectContractError(
      () =>
        parseExplorationResponse(
          { recording: originalB, original: originalB, covers: [] },
          originalB.id,
        ),
      /exploration\.covers: expected an object/,
    )
  })

  it('accepts and validates a playable source', () => {
    const playable = {
      ...originalB,
      source: { platform: 'youtube', videoId: 'abc', startSeconds: 12 },
    }
    expect(parseRecordingResponse(playable, originalB.id).source).toEqual(playable.source)
    expectContractError(
      () =>
        parseRecordingResponse(
          { ...playable, source: { platform: 'vimeo', videoId: 'x' } },
          originalB.id,
        ),
      /recording\.source\.platform/,
    )
  })
})

describe('parseRecordingResponse', () => {
  it('returns the requested recording', () => {
    expect(parseRecordingResponse(structuredClone(coverA1), coverA1.id)).toEqual(coverA1)
  })

  it('rejects a different recording than requested', () => {
    expectContractError(
      () => parseRecordingResponse(coverA1, coverA2.id),
      /expected the requested recording "placeholder-cover-a2"/,
    )
  })

  it('rejects data that is not a recording', () => {
    expectContractError(
      () => parseRecordingResponse('nope', coverA1.id),
      /recording: expected an object/,
    )
  })
})
