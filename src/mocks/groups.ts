import type { AnyHandler } from 'msw'

export const MOCK_GROUPS = ['recordings', 'songs', 'auth', 'artists', 'tags'] as const
export type MockGroup = (typeof MOCK_GROUPS)[number]
export type HandlerRegistry = Record<MockGroup, AnyHandler[]>

const DEFAULT_MOCK_GROUPS: MockGroup[] = ['recordings']

function isMockGroup(name: string): name is MockGroup {
  return (MOCK_GROUPS as readonly string[]).includes(name)
}

export function parseMockGroups(value: string | undefined): MockGroup[] {
  if (value === undefined) return [...DEFAULT_MOCK_GROUPS]

  const names = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  if (names.includes('all')) return [...MOCK_GROUPS]

  const unknown = names.filter((name) => !isMockGroup(name))
  if (unknown.length > 0) {
    // A typo must not silently send that group's requests to the real backend.
    throw new Error(
      `Unknown VITE_MOCK_GROUPS value(s): ${unknown.join(', ')}. Use ${MOCK_GROUPS.join(', ')}, or all.`,
    )
  }
  return [...new Set(names.filter(isMockGroup))]
}

export function selectHandlers(
  groups: readonly MockGroup[],
  registry: HandlerRegistry,
): AnyHandler[] {
  return groups.flatMap((group) => registry[group])
}
