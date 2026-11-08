import artwork from '../../assets/banger-street-leap.png'

/**
 * Banger of the Week: the editorial half. The song itself (title, artists, video) always comes
 * from the catalog by id; nothing here duplicates catalog data.
 */
export type BangerFeature = {
  /** The featured cover's catalog song id (not an artist id). Unknown ids show nothing. */
  songId: string
  artwork: { src: string; alt: string; width: number; height: number }
  /** The small sticker label. */
  edition?: string
  /** The headline, one entry per line. */
  headline: string[]
  /** Why Coverly picked it. */
  comment: string
}

export const BANGER_OF_THE_WEEK: BangerFeature = {
  // “Like a Prayer”, Miley Cyrus's cover of Madonna.
  songId: '6ae645d5be654669da63d45c',
  artwork: {
    src: artwork,
    alt: 'Two friends mid-jump on a city lawn at dusk; the sneaker sole facing the camera reads “Banger of the Week”.',
    width: 1054,
    height: 1492,
  },
  edition: 'The Weekly Drop / 001',
  headline: ['This one', 'hits', 'different.'],
  comment: 'Miley takes on a Madonna classic. Turn it up and hear what happens.',
}
