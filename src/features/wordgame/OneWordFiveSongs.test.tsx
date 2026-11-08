import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl } from '../../lib/api'
import { createQueryClient } from '../../lib/queryClient'
import { server } from '../../mocks/server'
import { wordChallengeHandlers, type MockWordChallenge } from '../../mocks/handlers/wordChallenges'
import { OneWordFiveSongs } from './OneWordFiveSongs'

// Mirrors the backend's configured challenge (simulated with MSW: these tests don't reach it).
const CHALLENGE: MockWordChallenge = {
  id: 'somebody-001',
  word: 'somebody',
  points: { base: 100, hinted: 60 },
  answers: [
    {
      id: 'answer-1',
      position: 1,
      title: 'Somebody to Love',
      artist: 'Queen',
      phrases: ['Somebody to love'],
    },
    {
      id: 'answer-2',
      position: 2,
      title: 'Use Somebody',
      artist: 'Kings of Leon',
      phrases: ['You know that I could use somebody'],
    },
    {
      id: 'answer-3',
      position: 3,
      title: 'Somebody That I Used to Know',
      artist: 'Gotye',
      phrases: ['Somebody that I used to know'],
    },
    {
      id: 'answer-4',
      position: 4,
      title: 'All Star',
      artist: 'Smash Mouth',
      phrases: ['Somebody once told me', 'Once told me the world'],
    },
    {
      id: 'answer-5',
      position: 5,
      title: 'I Wanna Dance with Somebody',
      artist: 'Whitney Houston',
      phrases: ['I wanna dance with somebody'],
    },
  ],
}

let failing = false
let guesses = 0
function setUp() {
  failing = false
  guesses = 0
  server.use(...wordChallengeHandlers(CHALLENGE, () => failing))
  server.events.removeAllListeners('request:start')
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && request.url.includes('/guesses')) guesses++
  })
  render(
    <QueryClientProvider client={createQueryClient()}>
      <OneWordFiveSongs />
    </QueryClientProvider>,
  )
}

const input = () => screen.getByRole('textbox', { name: 'Lyric phrase' })
const status = () => screen.getByRole('status')
const rows = () => within(screen.getByRole('list', { name: 'Answers' })).getAllByRole('listitem')
/** The two tallies, as read: "Songs found 1 / 5 · Score 100 / 500". */
const totals = () =>
  ['Songs found', 'Score']
    .map((label) => `${label} ${screen.getByText(label).nextElementSibling!.textContent}`)
    .join(' · ')
/** Waits for the board (the input appears once the challenge has loaded). */
const ready = () => screen.findByRole('textbox', { name: 'Lyric phrase' })
/** A found entry's stamp, once it shows. */
const stamp = (row: number, points: number) => within(rows()[row]!).findByText(`✓ +${points}`)
/** Types a phrase and presses Enter. */
function enter(phrase: string) {
  fireEvent.change(input(), { target: { value: phrase } })
  fireEvent.submit(input().closest('form')!)
}

describe('One Word, Five Songs', () => {
  it('shows the word, five hidden songs with hints, and no answers', async () => {
    setUp()
    await ready()
    expect(screen.getByText(/^The word:/).parentElement).toHaveTextContent('The word: somebody')
    expect(screen.getByText('5 songs waiting to be discovered')).toBeInTheDocument()
    expect(rows()).toHaveLength(5)
    for (const row of rows()) expect(row).toHaveTextContent(/Hidden song/)
    expect(screen.getAllByRole('button', { name: /^Show the artist of song/ })).toHaveLength(5)
    expect(document.body).not.toHaveTextContent(/All Star|Smash Mouth|Queen|Gotye/)
    expect(totals()).toBe('Songs found 0 / 5 · Score 0 / 500')
  })

  it('finds song #4 first with Enter, revealing only that row, and clears the box', async () => {
    setUp()
    await ready()
    enter('  SOMEBODY, ONCE   TOLD ME!  ')
    await stamp(3, 100)
    expect(rows()[3]).toHaveTextContent('“All Star”Smash Mouth✓ +100')
    expect(screen.getByText('4 songs waiting to be discovered')).toBeInTheDocument()
    expect(status()).toHaveTextContent('Found #4: “All Star” by Smash Mouth. +100 points.')
    for (const i of [0, 1, 2, 4]) expect(rows()[i]).toHaveTextContent('Hidden song')
    expect(input()).toHaveValue('')
    expect(totals()).toBe('Songs found 1 / 5 · Score 100 / 500')
  })

  it('says a duplicate is already found, without adding points', async () => {
    setUp()
    await ready()
    enter('Somebody once told me')
    await stamp(3, 100)
    enter('once told me the world')
    expect(
      await screen.findByText(/You already found #4, “All Star”\. No extra points\./),
    ).toBeInTheDocument()
    expect(totals()).toBe('Songs found 1 / 5 · Score 100 / 500')
  })

  it('does not reject an unrecognized phrase as wrong, and keeps it to edit', async () => {
    setUp()
    await ready()
    for (const phrase of ['All Star', 'Smash Mouth', 'somebody']) {
      enter(phrase)
      await waitFor(() =>
        expect(status()).toHaveTextContent(
          'We didn’t recognize that phrase. It may be a real lyric we haven’t added yet. Try another phrase.',
        ),
      )
      expect(input()).toHaveValue(phrase)
    }
    expect(totals()).toBe('Songs found 0 / 5 · Score 0 / 500')
  })

  it('ignores an empty submission (no request)', async () => {
    setUp()
    await ready()
    enter('   ')
    enter('')
    expect(guesses).toBe(0)
    expect(status()).toHaveTextContent('')
  })

  it('reveals the hinted artist for that song only, then scores it 60', async () => {
    setUp()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: /^Show the artist of song 4/ }))
    expect(await within(rows()[3]!).findByText('Smash Mouth')).toBeInTheDocument()
    expect(rows()[3]).toHaveTextContent('Artist: Smash Mouth')
    expect(rows()[3]).toHaveTextContent('Worth 100 60')
    expect(status()).toHaveTextContent(
      'Hint for #4: the artist is Smash Mouth. It’s now worth 60 points.',
    )
    expect(within(rows()[3]!).queryByRole('button')).toBeNull()
    expect(rows()[3]).not.toHaveTextContent('All Star')
    expect(screen.getAllByRole('button', { name: /^Show the artist of song/ })).toHaveLength(4)
    enter('Somebody once told me')
    await stamp(3, 60)
    expect(rows()[3]).toHaveTextContent('“All Star”Smash Mouth✓ +60')
    enter('Somebody to love')
    await stamp(0, 100)
    expect(totals()).toBe('Songs found 2 / 5 · Score 160 / 500')
  })

  it('completes after all five, then restarts from nothing', async () => {
    setUp()
    await ready()
    fireEvent.click(screen.getByRole('button', { name: /^Show the artist of song 2/ }))
    await within(rows()[1]!).findByText('Kings of Leon')
    for (const [i, phrase] of [
      [4, 'I wanna dance with somebody'],
      [0, 'Somebody to love'],
      [3, 'Once told me the world'],
      [2, 'Somebody that I used to know'],
      [1, 'You know that I could use somebody'],
    ] as const) {
      enter(phrase)
      await stamp(i, i === 1 ? 60 : 100)
    }
    expect(status()).toHaveTextContent('You found all 5 songs! Final score: 460 / 500.')
    // The input gives way to the result; the board stays, with every answer.
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('All 5 found!')).toBeInTheDocument()
    expect(screen.getByText('Final score 460 / 500')).toBeInTheDocument()
    expect(screen.getByText('All 5 songs discovered')).toBeInTheDocument()
    expect(rows()[1]).toHaveTextContent('“Use Somebody”Kings of Leon✓ +60')

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(totals()).toBe('Songs found 0 / 5 · Score 0 / 500')
    for (const row of rows()) expect(row).toHaveTextContent('Hidden song')
    expect(screen.getAllByRole('button', { name: /^Show the artist of song/ })).toHaveLength(5)
    expect(status()).toHaveTextContent('')
    expect(input()).toHaveValue('')
  })

  it('keeps progress and the phrase when the check fails', async () => {
    setUp()
    await ready()
    enter('Somebody to love')
    await stamp(0, 100)
    failing = true
    enter('Somebody once told me')
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Couldn’t check your phrase. Check your connection and try again.',
      ),
    )
    expect(input()).toHaveValue('Somebody once told me')
    expect(totals()).toBe('Songs found 1 / 5 · Score 100 / 500')
    fireEvent.click(screen.getByRole('button', { name: /^Show the artist of song 4/ }))
    await waitFor(() => expect(status()).toHaveTextContent('Couldn’t load the hint. Try again.'))
    expect(rows()[3]).toHaveTextContent('Hidden song')
  })

  it('sends one request at a time', async () => {
    setUp()
    await ready()
    enter('Somebody to love')
    enter('Somebody to love')
    enter('Somebody to love')
    await stamp(0, 100)
    expect(guesses).toBe(1)
  })

  it('shows nothing when there is no current challenge', async () => {
    server.use(
      http.get(apiUrl('/api/word-challenges/:id'), () =>
        HttpResponse.json({ success: false, message: 'Challenge not found' }, { status: 404 }),
      ),
    )
    const { container } = render(
      <QueryClientProvider client={createQueryClient()}>
        <OneWordFiveSongs />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
