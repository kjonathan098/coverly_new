import { useId, useMemo, type CSSProperties } from 'react'
import { HeartIcon } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { isPlayable, play, playVerb, usePlaybackOf, type PlayableSong } from '../player/playback'
import { artistList, displayTitle } from '../songs/format'
import type { CoverSong } from '../songs/types'
import { NOKIA_FEATURE } from './nokiaFeature'

/*
 * A Y2K love-song mini-poster: a fan-zine collage on a distressed black page. No heading: the
 * phone's screen ("Boo I miss you! xOxO") says it.
 *
 * - The red Nokia is the hero: a tilted cut-out print (cream paper border) on a torn hot-pink
 *   paper panel, with a lipstick kiss stuck on its corner and a blush arrow pointing out from
 *   behind it to the reply.
 * - The song title is the poster's type: DILEMMA, set vertically in chunky pink 3D letters.
 * - The reply is a second Nokia screen taped on like a sticker: "1 new song", the cover and
 *   original artists, and the rose heart as its soft key, which plays the cover in the shell's one
 *   player (it is not Favorites). While the cover plays, the LCD's backlight comes on.
 * - The caption is two cut-out label strips.
 *
 * The distressed speckle is generated (an SVG noise filter), concentrated toward the edges. The
 * collage sits side by side from 48rem of the section's own width (narrower when the player takes
 * its column); below that it stacks, the title running across the top.
 */

// The phone's screen, sampled from the photograph: sage LCD, near-black pixels, red plastic.
const LCD = {
  '--lcd': '#b7c0a3',
  '--lcd-lit': '#c9e3a6',
  '--lcd-ink': '#1d2219',
  '--bezel': '#b3121c',
  // Shared pieces (artist links, the focus ring) take their colors from these (base.css).
  '--surface-fg': '#1d2219',
  '--surface-focus': '#1d2219',
} as CSSProperties

const PIXEL_FONT = '[font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]'
// Blush paper and lipstick pinks of the poster.
const BLUSH = '#f6d3d0'
const HOT = '#ff3d8b'

export function NokiaLoveSong({
  songs,
  feature = NOKIA_FEATURE,
}: {
  songs: CoverSong[]
  feature?: typeof NOKIA_FEATURE
}) {
  // A plain id for the SVG filter reference (React's ids contain characters url() dislikes).
  const grunge = `grunge-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const song = useMemo(
    () => songs.find((s) => s.video?.videoId === feature.videoId) ?? null,
    [songs, feature.videoId],
  )
  const status = usePlaybackOf(song?.id ?? '')
  if (!song || !isPlayable(song)) return null
  const { artwork } = feature
  const name = `${displayTitle(song.title)}, covered by ${artistList(song.artists)}`

  return (
    <section
      aria-label={name}
      data-playing={status === 'playing' || undefined}
      className="group/nokia @container relative isolate overflow-hidden bg-[#0d0709]"
    >
      {/* Distressed print: blush speckle, heavy at the edges, clearing toward the middle. */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full opacity-60 [mask-image:radial-gradient(ellipse_72%_68%_at_50%_50%,transparent_40%,#000_100%)]"
      >
        <filter id={grunge} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85 0.55" numOctaves="3" seed="9" />
          <feColorMatrix values="0 0 0 0 0.96  0 0 0 0 0.81  0 0 0 0 0.79  0 0 0 16 -9.4" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grunge})`} />
      </svg>

      <div className="mx-auto grid max-w-[60rem] justify-items-center gap-y-2 px-margin py-10 @min-[48rem]:grid-cols-[auto_minmax(0,26rem)_minmax(0,1fr)] @min-[48rem]:items-center @min-[48rem]:justify-items-stretch @min-[48rem]:gap-x-4 @min-[48rem]:py-12">
        {/* The poster's type: the song title. Vertical beside the photo, across the top when stacked. */}
        <p
          className="m-0 font-heading text-[clamp(3.25rem,15cqw,5rem)] leading-[0.85] font-[800] tracking-[-0.01em] uppercase [font-stretch:75%] @min-[48rem]:rotate-180 @min-[48rem]:text-[clamp(4.5rem,11cqw,8.25rem)] @min-[48rem]:[writing-mode:vertical-rl]"
          style={{
            color: HOT,
            textShadow: `0.035em 0.035em 0 ${BLUSH}, 0.07em 0.07em 0 #000`,
          }}
        >
          {displayTitle(song.title)}
        </p>

        {/* The hero: the photo as a cut-out print on torn pink paper. */}
        <div className="relative w-full max-w-[24rem] py-4 @min-[48rem]:max-w-none">
          {/* Torn hot-pink paper panel. */}
          <span
            aria-hidden="true"
            className="absolute -inset-x-[7%] inset-y-[2%] rotate-[5deg] [clip-path:polygon(2%_4%,28%_0,61%_3%,100%_0,97%_36%,100%_71%,96%_100%,58%_96%,22%_100%,0_95%,3%_57%)]"
            style={{ background: `linear-gradient(150deg, ${HOT}, #e0245e 60%, #b5123f)` }}
          />
          {/* A blush arrow, out from behind the photo toward the reply. */}
          <span
            aria-hidden="true"
            className="absolute top-[58%] -right-[18%] hidden h-20 w-40 -rotate-[8deg] [clip-path:polygon(0_32%,62%_32%,62%_0,100%_50%,62%_100%,62%_68%,0_68%)] @min-[48rem]:block"
            style={{ background: BLUSH }}
          />
          <div className="relative -rotate-[4deg] border-[7px] border-[#f6efe6] bg-[#f6efe6] shadow-[10px_12px_0_rgb(0_0_0/0.55)]">
            {/* Cropped past the source's top strip and the speaker button in its bottom corner. */}
            <div className="aspect-[1205/1169]">
              <img
                src={artwork.src}
                alt={artwork.alt}
                width={artwork.width}
                height={artwork.height}
                loading="lazy"
                decoding="async"
                className="block size-full object-cover object-[50%_19%]"
              />
            </div>
          </div>
          {/* A lipstick kiss on the print's corner. */}
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-3 rotate-[16deg] text-[4.5rem] leading-none drop-shadow-[3px_4px_0_rgb(0_0_0/0.45)]"
          >
            💋
          </span>
        </div>

        {/* The reply, taped onto the collage, and the caption strips. */}
        <div className="relative z-10 -mt-14 grid justify-items-center gap-5 @min-[48rem]:mt-24 @min-[48rem]:-ms-10 @min-[48rem]:justify-items-start">
          <Reply song={song} />
          <p className="m-0 grid justify-items-center gap-1.5 @min-[48rem]:justify-items-start">
            {feature.copy.map((line, i) => (
              <span
                key={line}
                className={
                  i === 0
                    ? 'block -rotate-2 px-2.5 py-1 font-heading text-[0.95rem] font-[800] tracking-[0.02em] text-ink uppercase'
                    : 'block rotate-1 px-2.5 py-1 font-heading text-[0.95rem] font-[800] tracking-[0.02em] text-[#fff4f2] uppercase @min-[48rem]:ms-6'
                }
                style={{ background: i === 0 ? BLUSH : HOT }}
              >
                {i > 0 && ' '}
                {line}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}

/** A second Nokia screen, taped on: the song as an incoming message, the heart as its soft key. */
function Reply({ song }: { song: PlayableSong }) {
  return (
    <div className="relative w-[min(100%,20rem)] rotate-[4deg]">
      {/* Tape. */}
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 z-10 h-6 w-24 -translate-x-1/2 -rotate-3 bg-[#fbe3e6]/75 shadow-[0_1px_2px_rgb(0_0_0/0.25)]"
      />
      <div
        style={LCD}
        className="rounded-[1.75rem] bg-[linear-gradient(160deg,#d8262f,var(--bezel)_45%,#7d0a12)] p-3.5 shadow-[10px_12px_0_rgb(0_0_0/0.55),inset_0_1px_0_rgb(255_255_255/0.35)]"
      >
        <div
          className={`rounded-[0.9rem] bg-(--lcd) px-5 pt-3.5 pb-3 text-(--lcd-ink) shadow-[inset_0_2px_6px_rgb(0_0_0/0.45)] transition-[background-color] duration-(--duration-slow) group-data-playing/nokia:bg-(--lcd-lit) ${PIXEL_FONT}`}
        >
          {/* The status row: what arrived, and a signal in the phone's style. */}
          <p className="m-0 flex items-center justify-between text-[0.8125rem] font-bold tracking-[0.08em] uppercase">
            <span>1 new song</span>
            <span aria-hidden="true" className="flex items-end gap-0.5">
              {[5, 8, 11, 14].map((h) => (
                <span key={h} className="block w-[3px] bg-(--lcd-ink)" style={{ height: h }} />
              ))}
            </span>
          </p>

          <p className="m-0 mt-3 text-[0.9375rem] leading-snug">
            <ArtistLinks
              artists={song.artists}
              role="artist"
              className="text-[1.125rem] font-bold"
            />
            {song.originalArtists.length > 0 && (
              <>
                <br />
                <span className="opacity-75">covering </span>
                <ArtistLinks artists={song.originalArtists} role="songBy" />
              </>
            )}
          </p>

          <SoftKey song={song} />
        </div>
      </div>
    </div>
  )
}

/** The heart as the phone's soft key: plays, pauses, resumes or retries in the shell's player. */
function SoftKey({ song }: { song: PlayableSong }) {
  const verb = playVerb(usePlaybackOf(song.id))
  return (
    <button
      type="button"
      onClick={() => play(song)}
      aria-label={`${verb} ${displayTitle(song.title)} by ${artistList(song.artists)}`}
      className="group mt-4 flex w-full cursor-pointer items-center justify-between rounded-md py-1 text-[0.9375rem] font-bold tracking-[0.04em] text-(--lcd-ink)"
    >
      <span aria-hidden="true">{verb}</span>
      <HeartIcon
        filled
        className="size-9 text-rose drop-shadow-[0_2px_0_rgb(0_0_0/0.25)] transition-transform duration-(--duration-fast) ease-snap group-hover:scale-115 group-focus-visible:scale-115 group-active:scale-95"
      />
    </button>
  )
}
