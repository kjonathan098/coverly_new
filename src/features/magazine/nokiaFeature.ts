import artwork from '../../assets/nokia-boo-i-miss-you.png'

/**
 * The Nokia love-song surprise in Magazine. The song comes from the catalog, found by its YouTube
 * video id (Chris Holsten's cover of "Dilemma"); nothing here duplicates catalog data. If no
 * catalog recording has this video, the feature doesn't show.
 */
export const NOKIA_FEATURE = {
  videoId: 'l9tS2xVjmqM',
  artwork: {
    src: artwork,
    alt: 'A red Nokia phone in a denim pocket. Its screen shows a text: “Boo I miss you! xOxO”.',
    width: 1205,
    height: 1306,
  },
  /** The caption, one line each. */
  copy: ['Some texts never go out of style.', 'Neither do some love songs.'],
}
