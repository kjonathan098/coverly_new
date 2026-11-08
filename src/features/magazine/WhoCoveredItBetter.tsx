import { useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { percentages, type Matchup } from '../matchups/api'
import { useMatchup, usePendingVote, useVote } from '../matchups/useMatchup'
import { isPlayable } from '../player/playback'
import type { CoverSong } from '../songs/types'
import { Showdown } from './Showdown'
import { names, type ShowdownProps } from './showdownTypes'

/*
 * "Who Covered It Better?": two covers of the same song face off, and logged-in readers vote. The
 * backend holds the matchup, the votes and the counts (and any sample counts, kept apart); results
 * stay hidden until the reader has voted. This section owns the data, the voting, a guest's login
 * and the screen-reader announcements; Showdown.tsx draws it. Both thumbnails play in the shell's
 * one player; voting never touches it. Shows nothing without a current matchup whose two songs are
 * in the catalog and have videos.
 */

export function WhoCoveredItBetter({ songs }: { songs: CoverSong[] }) {
  const { pathname, search } = useLocation()
  const { user, sessionPending, matchup } = useMatchup()
  const vote = useVote()
  const [announcement, setAnnouncement] = useState('')

  const pair = useMemo(() => {
    if (!matchup) return null
    const found = matchup.songs.map((id) => songs.find((s) => s.id === id))
    const [a, b] = found
    return a && b && isPlayable(a) && isPlayable(b) ? ([a, b] as const) : null
  }, [matchup, songs])

  const cast = (songId: string) => {
    if (!matchup) return
    setAnnouncement('Counting your vote…')
    vote.mutate(
      { matchupId: matchup.id, songId },
      {
        onSuccess: (updated) => setAnnouncement(resultsSentence(updated, pair)),
        onError: () => setAnnouncement('Couldn’t count your vote. Try again.'),
      },
    )
  }
  const pending = usePendingVote(matchup?.id, pathname + search, cast)

  if (!matchup || !pair) return null
  const pendingSong = pair.find((s) => s.id === pending.pending)

  const onVote = (song: CoverSong) => {
    if (sessionPending || vote.isPending || matchup.myVote === song.id) return
    if (!user) return pending.loginToVote(song.id)
    cast(song.id)
  }
  const props: ShowdownProps = {
    pair,
    matchup,
    guest: !user,
    busy: sessionPending || vote.isPending,
    onVote,
    pendingSong,
    onCancelPending: pending.cancel,
  }

  return (
    <section aria-labelledby="showdown-title" className="relative isolate overflow-hidden bg-blue">
      <Showdown {...props} />
      <p role="status" className="sr-only">
        {pendingSong ? `Log in to count your vote for ${names(pendingSong)}.` : announcement}
      </p>
    </section>
  )
}

/** What the live region says after a vote: the choice, both percentages and the total. */
function resultsSentence(matchup: Matchup, pair: readonly [CoverSong, CoverSong] | null) {
  const split = percentages(matchup)
  if (!pair || !split || !matchup.results) return 'Vote counted.'
  const chosen = pair.find((s) => s.id === matchup.myVote)
  const total = matchup.results.total
  const counted = `Vote counted${chosen ? ` for ${names(chosen)}` : ''}.`
  const sample = percentages(matchup, matchup.demo)
  if (matchup.demo && sample) {
    // The samples are what's shown; say so, and give the real count separately.
    return `${counted} Preview with sample results, not community votes: ${names(pair[0])} ${sample[0]}%, ${names(pair[1])} ${sample[1]}% of ${matchup.demo.total} sample votes. ${total} real ${total === 1 ? 'vote' : 'votes'} so far.`
  }
  return `${counted} ${names(pair[0])} ${split[0]}%, ${names(pair[1])} ${split[1]}%. ${total} ${total === 1 ? 'vote' : 'votes'} in total.`
}
