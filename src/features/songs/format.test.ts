import { describe, expect, it } from 'vitest'
import { artistList, displayTitle, plural, tagLabel } from './format'

describe('displayTitle', () => {
  it('title-cases a title stored in lowercase, keeping small words low mid-title', () => {
    expect(displayTitle('the girl from the north country')).toBe('The Girl From the North Country')
    expect(displayTitle('what a wonderful world')).toBe('What a Wonderful World')
    expect(displayTitle('stand by me')).toBe('Stand by Me')
    expect(displayTitle('to be loved by')).toBe('To Be Loved By')
  })

  it('capitalizes after leading punctuation and keeps accents', () => {
    expect(displayTitle('(you make me feel like) a natural woman')).toBe(
      '(You Make Me Feel Like) a Natural Woman',
    )
    expect(displayTitle('éclair')).toBe('Éclair')
  })

  it('leaves a title that has its own capitalization alone', () => {
    expect(displayTitle('Dna.')).toBe('Dna.')
    expect(displayTitle('good 4 u')).toBe('Good 4 U')
    expect(displayTitle('NIKI')).toBe('NIKI')
    expect(displayTitle('Señales')).toBe('Señales')
  })
})

describe('tagLabel', () => {
  it('uses readable names for stored labels', () => {
    expect(tagLabel('r&b/soul')).toBe('R&B and soul')
    expect(tagLabel('strong-vocals')).toBe('Strong vocals')
    expect(tagLabel('electronic/dance (edm)')).toBe('Electronic')
  })

  it('otherwise uses sentence case', () => {
    expect(tagLabel('melancholic')).toBe('Melancholic')
    expect(tagLabel('stripped-down')).toBe('Stripped-down')
  })
})

describe('artistList', () => {
  it('joins names as a sentence', () => {
    expect(artistList([])).toBe('')
    expect(artistList([{ name: 'the tidewater choir' }])).toBe('The Tidewater Choir')
    expect(artistList([{ name: 'A' }, { name: 'B' }])).toBe('A and B')
    expect(artistList([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe('A, B and C')
  })
})

it('pluralizes counts', () => {
  expect(plural(1, 'cover')).toBe('1 cover')
  expect(plural(0, 'cover')).toBe('0 covers')
  expect(plural(2, 'story', 'stories')).toBe('2 stories')
})
