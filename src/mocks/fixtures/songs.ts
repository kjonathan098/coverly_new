// PLACEHOLDER DATA in the backend's GET /api/songs/all-songs shape (populated Song documents).
// Fictional songs and artists; the videos are made-up ids that only need to look like YouTube ones.

let next = 0
const id = () => `fixture${String(++next).padStart(16, '0')}`
const tag = (name: string, type: string) => ({ _id: id(), name, type, __v: 0 })
const artist = (name: string, roles = [2]) => ({
  _id: id(),
  name,
  roles,
  profileImage: '',
  bio: '',
})

const pop = tag('pop', 'coverGenre')
const folk = tag('folk', 'coverGenre')
const soul = tag('r&b/soul', 'coverGenre')
const acoustic = tag('acoustic', 'subGenre')
const lofi = tag('lo-fi', 'subGenre')
const soulful = tag('soulful', 'mood')
const dreamy = tag('dreamy', 'mood')
const nostalgic = tag('nostalgic', 'mood')
const strongVocals = tag('strong-vocals', 'performanceStyle')
const strippedDown = tag('stripped-down', 'performanceStyle')
const live = tag('live', 'performanceStyle')
// The same word as the subgenre above, in a different group: Discover must keep them apart.
const acousticStyle = tag('acoustic', 'performanceStyle')

const mara = artist('Mara Quill')
const tidewater = artist('the tidewater choir')
const ofelia = artist('Ofelia Ruiz')
// Original artists. Mara Quill is also a cover artist, as some real artists are both.
const lamplighters = artist('The Lamplighters', [1])
const faroles = artist('Los Faroles', [1])

const song = (
  title: string,
  coverArtist: object[],
  cover: object[],
  extra: {
    subGenre?: object[]
    mood?: object[]
    performanceStyle?: object[]
    url?: string
    timeStamp?: number
    original?: object
  },
) => ({
  _id: id(),
  title,
  artist: { original: [extra.original ?? lamplighters], coverArtist },
  genres: { original: [pop], cover },
  subGenre: extra.subGenre ?? [],
  performanceStyle: extra.performanceStyle ?? [],
  mood: extra.mood ?? [],
  links:
    extra.url === ''
      ? []
      : [
          {
            url: extra.url ?? `https://www.youtube.com/watch?v=fixture${next}xx`.slice(0, 43),
            platform: 'youtube',
            timeStamp: extra.timeStamp ?? 0,
          },
        ],
  approved: false,
  createdAt: `2026-10-${String(10 + next).padStart(2, '0')}T12:00:00.000Z`,
})

export const songFixtures = [
  song('paper lanterns', [mara], [folk], {
    subGenre: [acoustic],
    mood: [dreamy, nostalgic],
    performanceStyle: [strippedDown],
    url: 'https://www.youtube.com/watch?v=AAAAAAAAAA1&list=PL123',
  }),
  song('Low Tide', [mara, ofelia], [soul], {
    mood: [soulful],
    performanceStyle: [strongVocals, live],
    url: 'https://youtu.be/BBBBBBBBBB2',
    timeStamp: 30,
  }),
  song('glass houses', [tidewater], [pop, soul], {
    subGenre: [lofi],
    mood: [soulful, dreamy],
    performanceStyle: [strongVocals],
    url: 'https://www.youtube.com/watch?v=CCCCCCCCCC3',
  }),
  song('Señales', [ofelia], [folk], {
    subGenre: [acoustic],
    mood: [nostalgic],
    performanceStyle: [strippedDown, live],
    url: 'https://www.youtube.com/watch?v=DDDDDDDDDD4',
    original: faroles,
  }),
  song('night bus', [tidewater], [pop], {
    mood: [dreamy],
    performanceStyle: [strippedDown, acousticStyle],
    url: 'https://www.youtube.com/watch?v=EEEEEEEEEE5',
    original: mara,
  }),
  song('no link yet', [mara], [pop], { mood: [soulful], url: '', original: faroles }),
]

/** One malformed entry, to prove a bad song is skipped instead of breaking the page. */
export const malformedSong = { _id: id(), title: '', artist: { coverArtist: [] } }
