import type { Matchup } from '../matchups/api'
import { artistList } from '../songs/format'
import type { CoverSong } from '../songs/types'

/** What the showdown (Showdown.tsx) receives from the section (WhoCoveredItBetter.tsx). */
export type ShowdownProps = {
  pair: readonly [CoverSong, CoverSong]
  matchup: Matchup
  guest: boolean
  /** The session is loading or a vote is on its way: clicks wait. */
  busy: boolean
  onVote: (song: CoverSong) => void
  /** The song a guest chose before logging in, if any. */
  pendingSong: CoverSong | undefined
  onCancelPending: () => void
}

export const names = (song: CoverSong) => artistList(song.artists)
