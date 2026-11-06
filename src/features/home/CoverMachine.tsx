import { useState } from 'react'
import collage from '../../assets/cover-machine-collage.png'
import { PauseIcon, PlayIcon, ShuffleIcon, Surface } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { play, playVerb, usePlaybackOf } from '../player/playback'
import { CoverArt } from '../songs/CoverArt'
import { artistList, displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { randomOther } from './selection'

// A torn paper edge along the top and bottom of the strip.
const TORN =
  'polygon(0% 9%, 4% 1%, 9% 7%, 15% 2%, 22% 8%, 28% 2%, 35% 7%, 42% 0%, 49% 6%, 56% 1%, 63% 8%, 70% 2%, 77% 7%, 84% 0%, 91% 6%, 100% 2%, 100% 92%, 95% 100%, 88% 94%, 81% 99%, 74% 93%, 67% 98%, 60% 94%, 53% 100%, 46% 95%, 39% 99%, 32% 93%, 25% 98%, 18% 94%, 11% 100%, 5% 95%, 0% 99%)'

const STICKER =
  'type-lettering inline-block bg-paper px-2 leading-none text-ink shadow-[3px_3px_0_0_var(--color-ink)]'

/**
 * The Cover Machine: a collage with one real cover on a torn paper strip, ready to play, and a
 * "Surprise me" lever that deals another. Surprise never starts playback by itself; Play hands
 * the song to the app shell's player. The collage and stickers are decoration; the strip is the
 * machine. Kept short so the song rows below stay above the fold.
 */
export function CoverMachine({
  songs,
  initial,
}: {
  /** The catalog already fetched for the page. */
  songs: readonly CoverSong[]
  /** What the machine shows first. */
  initial: CoverSong | undefined
}) {
  const [picked, setPicked] = useState<CoverSong | null>(null)
  const song = picked ?? initial
  const status = usePlaybackOf(song?.id ?? '')
  const verb = playVerb(status)

  const surprise = () => {
    const next = randomOther(songs, song?.id)
    if (next) setPicked(next)
  }

  return (
    <section
      aria-labelledby="machine-title"
      className="relative isolate h-[26rem] w-full tablet:h-[23rem] desktop:h-[24rem]"
    >
      {/* The current song's own thumbnail, tucked behind the collage at an angle. Decorative: the
          strip names the song. Hidden on phones, where there's no room beside the collage. */}
      {song && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[40%] left-[2%] -z-20 hidden w-60 -rotate-6 tablet:block desktop:top-[38%] desktop:w-64"
        >
          <CoverArt
            key={song.id}
            song={song}
            size="hero"
            className="animate-flip-in rounded-card shadow-[0_0_0_4px_var(--color-paper),0_24px_40px_-12px_rgb(0_0_0/0.85)]"
          />
        </div>
      )}

      <img
        src={collage}
        alt=""
        width={640}
        height={799}
        decoding="async"
        fetchPriority="high"
        className="pointer-events-none absolute -top-4 right-[4%] -z-10 w-[17rem] rotate-3 tablet:right-[16%] tablet:w-[19rem] desktop:right-[14%] desktop:w-[21rem]"
      />

      {/* A pink zigzag, as in the collage's print. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 60"
        className="absolute top-2 right-0 -z-10 hidden w-28 text-pink tablet:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinejoin="miter"
      >
        <path d="M2 52 L30 12 L48 44 L78 6 L96 38 L118 14" />
      </svg>

      <h2
        id="machine-title"
        className="absolute top-3 left-0 z-10 m-0 -rotate-8 text-[2.1rem] tablet:top-6 tablet:text-[2.6rem] desktop:text-[3rem]"
      >
        <span className="type-lettering block w-max bg-yellow px-3 py-1 leading-[0.9] text-ink uppercase shadow-[0_0_0_4px_var(--color-paper),7px_7px_0_4px_var(--color-blue)]">
          <span className="block">The Cover</span> <span className="block">Machine</span>
        </span>
      </h2>

      <p
        aria-hidden="true"
        className="absolute top-20 right-0 z-10 m-0 hidden -rotate-8 gap-1 text-[1.4rem] uppercase tablet:grid"
      >
        <span className={STICKER}>Same</span>
        <span className={STICKER}>Song</span>
        <span className={STICKER}>Different</span>
        <span className={STICKER}>Vibes</span>
      </p>

      <div className="absolute inset-x-0 bottom-0 z-20 -rotate-2">
        <span
          aria-hidden="true"
          className="absolute inset-x-3 -bottom-3 h-8 bg-turquoise"
          style={{ clipPath: TORN }}
        />
        <Surface
          tone="paper"
          className="relative px-4 pt-5 pb-4 tablet:px-6"
          style={{ clipPath: TORN }}
        >
          {song ? (
            <div
              key={song.id}
              className="flex animate-flip-in flex-wrap items-center gap-x-4 gap-y-3"
            >
              <button
                type="button"
                aria-label={`${verb} ${displayTitle(song.title)} by ${artistList(song.artists)}`}
                onClick={() => play(song)}
                className="grid size-14 shrink-0 cursor-pointer place-items-center rounded-full bg-pink text-ink shadow-[0_0_0_3px_var(--color-ink)] transition-transform duration-(--duration-base) ease-snap *:size-7 hover:scale-105"
              >
                {verb === 'Pause' ? <PauseIcon /> : <PlayIcon />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="type-card m-0 truncate text-[1.6rem] leading-tight">
                  {displayTitle(song.title)}
                </p>
                <p className="m-0 truncate text-label font-semibold">
                  <ArtistLinks artists={song.artists} role="artist" />{' '}
                  <span className="font-normal text-fg-soft">(Cover)</span>
                </p>
                {song.originalArtists.length > 0 && (
                  <p className="m-0 truncate text-label text-fg-soft">
                    Original by <ArtistLinks artists={song.originalArtists} role="songBy" />
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={surprise}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-pill bg-ink px-4 text-label font-bold text-paper transition-colors hover:bg-pink hover:text-ink max-tablet:w-full max-tablet:justify-center"
              >
                <ShuffleIcon className="size-4" />
                Surprise me
              </button>
            </div>
          ) : (
            <p aria-busy="true" className="m-0 py-4 text-label text-fg-soft">
              Warming up the machine…
            </p>
          )}
        </Surface>
      </div>

      {/* Announces a new song after a surprise (outside the part that's swapped). */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {picked && song
          ? `Now showing ${displayTitle(song.title)}, covered by ${artistList(song.artists)}`
          : ''}
      </p>
    </section>
  )
}
