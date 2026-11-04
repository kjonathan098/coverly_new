const SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'vs',
  'with',
])

/**
 * The catalog stores many titles and names in lowercase. Title-case those for display;
 * anything entered with its own capitalization is shown as entered.
 */
export function displayTitle(raw: string): string {
  if (raw !== raw.toLowerCase()) return raw
  const words = raw.split(' ')
  return words
    .map((word, index) => {
      const bare = word.replace(/^[^\p{L}\p{N}]+/u, '')
      const isEdge = index === 0 || index === words.length - 1
      if (!isEdge && SMALL_WORDS.has(bare)) return word
      return word.replace(/\p{L}/u, (letter) => letter.toUpperCase())
    })
    .join(' ')
}

export const displayName = displayTitle

const LABELS: Record<string, string> = {
  'r&b/soul': 'R&B and soul',
  'hip-hop/rap': 'Hip-hop',
  'electronic/dance (edm)': 'Electronic',
  'strong-vocals': 'Strong vocals',
  'raw-emotions': 'Raw emotion',
  'vocal-harmony': 'Vocal harmony',
  edm: 'EDM',
}

/** Labels are stored lowercase ("strong-vocals"); show them in sentence case ("Strong vocals"). */
export function tagLabel(name: string): string {
  const label = LABELS[name]
  if (label) return label
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function artistList(artists: { name: string }[]): string {
  const names = artists.map((a) => displayName(a.name))
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`
