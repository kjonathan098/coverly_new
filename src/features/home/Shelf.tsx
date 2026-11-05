import { Link } from 'react-router'
import { Section, SectionHeading, type SurfaceTone } from '../../ui'
import { discoverHref } from '../discover/useFilters'
import type { Filters } from '../songs/discover'
import { plural } from '../songs/format'
import { SongCard } from '../songs/SongCard'
import type { CoverSong } from '../songs/types'

type ShelfProps = {
  id: string
  label: string
  title: string
  intro: string
  songs: CoverSong[]
  /** The filter that picked this shelf: "See all" opens it in Discover. */
  filters: Filters
  tone?: SurfaceTone
}

const SHOWN = 4

/** A row chosen by a stated rule (a label), with a way into the full set. */
export function Shelf({ id, label, title, intro, songs, filters, tone = 'paper' }: ShelfProps) {
  if (songs.length < 3) return null
  return (
    <Section tone={tone} grain aria-labelledby={`${id}-title`} className="pb-12 tablet:pb-16">
      <SectionHeading id={`${id}-title`} label={label} title={title} intro={intro} />
      {/* relative: the cards' screen-reader text is absolutely positioned and must clip with the scroller. */}
      <ul className="relative m-0 -mx-margin flex list-none snap-x snap-mandatory scroll-px-margin gap-gutter overflow-x-auto px-margin pb-4 tablet:mx-0 tablet:grid tablet:grid-cols-2 tablet:overflow-visible tablet:px-0 desktop:grid-cols-4">
        {songs.slice(0, SHOWN).map((song) => (
          <li key={song.id} className="w-[78%] shrink-0 snap-start tablet:w-auto">
            <SongCard song={song} />
          </li>
        ))}
      </ul>
      {songs.length > SHOWN && (
        <Link
          to={discoverHref(filters)}
          className="mt-4 inline-block font-bold underline decoration-2 underline-offset-[0.3em] hover:underline-offset-[0.45em]"
        >
          See all {plural(songs.length, 'cover')} in Discover
        </Link>
      )}
    </Section>
  )
}
