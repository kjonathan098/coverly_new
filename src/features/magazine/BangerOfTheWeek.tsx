import { Fragment, useMemo } from 'react'
import { PauseIcon, PlayIcon, Surface, cx } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { isPlayable, play, playVerb, usePlaybackOf, type PlayableSong } from '../player/playback'
import { artistList, displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { BANGER_OF_THE_WEEK, type BangerFeature } from './bangerFeature'

/**
 * Banger of the Week: the issue's first feature, as a two-page spread. The photograph is a full
 * page on the left (never cropped); the paper page on the right carries the editorial and the song,
 * which always comes from the catalog by id. If that song isn't in the catalog, nothing shows.
 */
export function BangerOfTheWeek({
  songs,
  feature = BANGER_OF_THE_WEEK,
}: {
  songs: CoverSong[]
  feature?: BangerFeature
}) {
  const song = useMemo(
    () => songs.find((s) => s.id === feature.songId) ?? null,
    [songs, feature.songId],
  )
  if (!song) return null

  const { artwork } = feature
  return (
    <section
      aria-labelledby="banger-feature-title"
      className="bg-ink px-margin py-12 tablet:py-16 desktop:py-24"
    >
      <div className="mx-auto grid max-w-[86rem] desktop:grid-cols-[45fr_55fr]">
        {/* A full-page photograph. From desktop it overlaps the paper page's edge. */}
        <div className="relative z-10 desktop:-mr-12 desktop:self-center">
          <img
            src={artwork.src}
            alt={artwork.alt}
            width={artwork.width}
            height={artwork.height}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full desktop:shadow-[18px_18px_0_rgb(0_0_0/0.45)]"
          />
        </div>

        <Surface
          tone="paper"
          grain
          className="@container flex flex-col justify-center px-6 py-10 tablet:px-12 tablet:py-14 desktop:my-[5%] desktop:pr-16 desktop:pl-28"
        >
          {feature.edition && (
            <p className="m-0 mb-6 -rotate-2 self-start bg-orange px-3 py-1.5 type-chip tracking-[0.2em] text-ink uppercase shadow-[3px_3px_0_var(--color-ink)]">
              {feature.edition}
            </p>
          )}

          <h2
            id="banger-feature-title"
            className="m-0 font-heading text-[22cqw] leading-[0.82] font-[800] tracking-[-0.035em] text-ink uppercase [font-stretch:75%]"
          >
            <span className="sr-only">Banger of the Week: </span>
            {feature.headline.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && ' '}
                <Line text={line} indent={i % 2 === 1} />
              </Fragment>
            ))}
          </h2>

          <Rule />

          <p className="m-0 type-chip tracking-[0.2em] text-fg-soft uppercase">Featured cover</p>
          <h3 className="m-0 mt-2 type-section [overflow-wrap:anywhere]">
            {displayTitle(song.title)}
          </h3>
          <dl className="m-0 mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5">
            <dt className="type-chip tracking-[0.12em] text-fg-soft uppercase">Cover by</dt>
            <dd className="m-0 type-lead font-bold">
              <ArtistLinks artists={song.artists} role="artist" />
            </dd>
            {song.originalArtists.length > 0 && (
              <>
                <dt className="type-chip tracking-[0.12em] text-fg-soft uppercase">Original by</dt>
                <dd className="m-0 type-lead">
                  <ArtistLinks artists={song.originalArtists} role="songBy" />
                </dd>
              </>
            )}
          </dl>

          {feature.comment && (
            <p className="m-0 mt-8 max-w-[44ch] border-l-4 border-orange pl-5 type-lead">
              {feature.comment}
            </p>
          )}

          {isPlayable(song) && <Listen song={song} />}
        </Surface>
      </div>
    </section>
  )
}

/** One headline line; closing punctuation picks up the sneaker orange. */
function Line({ text, indent }: { text: string; indent: boolean }) {
  const [, words = text, mark] = /^(.*?)([.!?]*)$/.exec(text) ?? []
  return (
    <span className={cx('block', indent && 'ps-[0.9em]')}>
      {words}
      {mark && <span className="text-orange">{mark}</span>}
    </span>
  )
}

/** A hand-drawn rule, with a short orange stroke at its start. */
function Rule() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 14"
      preserveAspectRatio="none"
      className="my-8 block h-3.5 w-full"
      fill="none"
      strokeLinecap="round"
    >
      <path
        d="M2 8 C 90 4, 160 11, 250 7 S 420 3, 520 8 S 590 9, 598 6"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M3 8 C 30 6, 60 9, 92 7"
        stroke="var(--color-orange)"
        strokeWidth="7"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Plays the featured cover in the shell's one player, or pauses, resumes or retries it. */
function Listen({ song }: { song: PlayableSong }) {
  const verb = playVerb(usePlaybackOf(song.id))
  const label = verb === 'Play' ? 'Listen to this banger' : `${verb} this banger`
  return (
    <button
      type="button"
      onClick={() => play(song)}
      aria-label={`${label}: ${displayTitle(song.title)} by ${artistList(song.artists)}`}
      className="mt-10 inline-flex min-h-[3.75rem] items-center justify-center gap-3 self-start rounded-control bg-ink px-7 font-heading text-[1.125rem] font-[800] tracking-[0.06em] text-paper uppercase shadow-[6px_6px_0_var(--color-orange)] transition-[translate,box-shadow] duration-(--duration-base) ease-snap hover:-translate-0.5 hover:shadow-[10px_10px_0_var(--color-orange)] active:translate-0 active:shadow-[2px_2px_0_var(--color-orange)] max-tablet:self-stretch"
    >
      {verb === 'Pause' ? <PauseIcon className="size-5" /> : <PlayIcon className="size-5" />}
      {label}
    </button>
  )
}
