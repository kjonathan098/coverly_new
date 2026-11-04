const TINTS = [
  'var(--color-pink)',
  'var(--color-turquoise)',
  'var(--color-blue)',
  'var(--color-cover-3)',
]

/** A stable ink for a song's artwork, from its first genre, so a genre always prints the same color. */
export function tintFor(key: string | undefined): string {
  if (!key) return TINTS[0]!
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return TINTS[hash % TINTS.length]!
}
