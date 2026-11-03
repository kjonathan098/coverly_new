import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MOCK_GROUPS, parseMockGroups, selectHandlers, type HandlerRegistry } from './groups'

describe('parseMockGroups', () => {
  it('defaults to recordings when the variable is absent', () => {
    expect(parseMockGroups(undefined)).toEqual(['recordings'])
  })

  it('disables mocking when the variable is empty', () => {
    expect(parseMockGroups('')).toEqual([])
    expect(parseMockGroups(' , ')).toEqual([])
  })

  it('parses a comma-separated list, trimming and de-duplicating', () => {
    expect(parseMockGroups(' recordings, tags ,recordings')).toEqual(['recordings', 'tags'])
  })

  it('expands "all" to every group', () => {
    expect(parseMockGroups('all')).toEqual([...MOCK_GROUPS])
  })

  it('rejects unknown group names', () => {
    expect(() => parseMockGroups('recordings,recording')).toThrow(/recording\b/)
  })
})

describe('selectHandlers', () => {
  it('returns only the handlers of the selected groups', () => {
    const recordings = http.get('http://api.test/r', () => HttpResponse.json({}))
    const tags = http.get('http://api.test/t', () => HttpResponse.json({}))
    const registry: HandlerRegistry = {
      recordings: [recordings],
      auth: [],
      artists: [],
      tags: [tags],
    }

    expect(selectHandlers(['recordings'], registry)).toEqual([recordings])
    expect(selectHandlers(['recordings', 'tags'], registry)).toEqual([recordings, tags])
    expect(selectHandlers([], registry)).toEqual([])
  })
})
