import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowIcon, CloseIcon, PauseIcon, PlayIcon, TagLink, cx } from '../../ui'
import { ArtistLinks } from '../discover/ArtistLinks'
import { discoverHref, discoverOne } from '../discover/useFilters'
import { NO_FILTERS } from '../songs/discover'
import { artistList, displayName, displayTitle, tagLabel } from '../songs/format'
import {
  attachPlayer,
  close,
  pause,
  play,
  replay,
  resume,
  usePlayback,
  type PlaybackProblem,
} from './playback'
import { usePlayerLayout } from './layouts'

const PROBLEMS: Record<PlaybackProblem, string> = {
  removed: 'This video has been removed from YouTube.',
  'not-embeddable': 'The video’s owner doesn’t allow it to play outside YouTube.',
  'not-loaded': 'YouTube’s player didn’t load. Check your connection or any content blockers.',
  other: 'YouTube couldn’t play this video here.',
}

const watchUrl = (videoId: string, start: number) =>
  `https://www.youtube.com/watch?v=${videoId}${start ? `&t=${start}s` : ''}`

const iconButton =
  'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill transition-colors duration-(--duration-fast) *:size-5'

/**
 * The player, owned by the app shell and mounted once for the app's lifetime. Pages come and go
 * around it; the video keeps playing.
 *
 * One element in every layout, changed only by CSS, because moving an iframe in the DOM reloads
 * it: a full-width bar on phones, a floating card from tablet width, and its own column from 1536px.
 * The video is never smaller than YouTube's 200 × 200 minimum and nothing is ever laid over it.
 */
export function PlayerPanel() {
  const playback = usePlayback()
  const layout = usePlayerLayout()
  const video = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const [side, setSide] = useState<'right' | 'left'>('right')
  const { song, status, problem } = playback
  const open = song !== null

  // Hand the video element to the player, once.
  useEffect(() => attachPlayer(video.current!), [])

  // Tell the page how much of the bottom of the screen the player covers when it floats, so
  // content, menus and sheets can stay clear of it. Zero when docked or closed.
  useEffect(() => {
    const el = panel.current!
    const root = document.documentElement
    const measure = () => {
      const floating = open && getComputedStyle(el).position === 'fixed'
      const gap = floating ? window.innerHeight - el.getBoundingClientRect().bottom : 0
      root.style.setProperty('--player-inset', floating ? `${el.offsetHeight + gap}px` : '0px')
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      root.style.removeProperty('--player-inset')
    }
  }, [open])

  const title = song ? displayTitle(song.title) : ''
  const by = song ? artistList(song.artists) : ''
  const originals = song ? artistList(song.originalArtists) : ''

  const main =
    status === 'playing' || status === 'loading'
      ? { label: `Pause ${title}`, icon: <PauseIcon />, run: pause }
      : status === 'paused'
        ? { label: `Resume ${title}`, icon: <PlayIcon />, run: resume }
        : status === 'ended'
          ? { label: `Replay ${title}`, icon: <PlayIcon />, run: replay }
          : null

  return (
    <aside
      ref={panel}
      id="now-playing"
      aria-label="Now playing"
      hidden={!open}
      data-surface="ink"
      className={cx(
        // Phone: a full-width bar along the bottom, title and controls above the video.
        'fixed inset-x-0 bottom-0 z-40 flex flex-col border-t-[1.5px] border-line bg-ink-2 text-fg shadow-[0_-18px_40px_-16px_rgb(0_0_0/0.75)]',
        // Tablet and desktop: a floating card in a bottom corner.
        'tablet:bottom-4 tablet:w-[24.25rem] tablet:rounded-panel tablet:border-t-0 tablet:p-4 tablet:shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8),inset_0_0_0_1px_var(--surface-line)]',
        side === 'right' ? 'tablet:right-4 tablet:left-auto' : 'tablet:right-auto tablet:left-4',
        // Docked: its own column beside the page, under the header, while something is loaded.
        // Where it docks depends on the layout under review (layouts.ts); classes only, no remount.
        layout.dock,
      )}
    >
      {/* The video. React never renders inside it: the YouTube player owns its contents. */}
      <div
        ref={video}
        className="relative order-2 aspect-video min-h-[200px] w-full shrink-0 overflow-hidden bg-ink tablet:order-1 tablet:rounded-control [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:size-full"
      />

      <div className="order-1 flex min-w-0 items-center gap-3 px-margin py-2 tablet:order-2 tablet:px-0 tablet:pt-3 tablet:pb-0">
        <div className="min-w-0 flex-1">
          <p className="type-meta m-0 font-semibold text-accent max-tablet:sr-only">
            {status === 'paused'
              ? 'Paused'
              : status === 'ended'
                ? 'Finished'
                : status === 'unavailable'
                  ? 'Can’t play here'
                  : 'Now playing'}
          </p>
          <p className="type-row m-0 truncate text-[1.0625rem] tablet:text-[1.1875rem]">{title}</p>
          <p className="m-0 truncate text-label">
            <span className="font-medium">
              <ArtistLinks artists={song?.artists ?? []} role="artist" />
            </span>
            {originals && (
              <span className="text-fg-soft">
                {' '}
                · <span className="font-semibold">Original</span>{' '}
                <ArtistLinks artists={song?.originalArtists ?? []} role="songBy" />
              </span>
            )}
          </p>
        </div>
        {main && (
          <button
            type="button"
            aria-label={main.label}
            onClick={main.run}
            className={cx(iconButton, 'bg-pink text-ink hover:bg-fg')}
          >
            {main.icon}
          </button>
        )}
        <button
          type="button"
          aria-label={`Move the player to the ${side === 'right' ? 'left' : 'right'}`}
          onClick={() => setSide(side === 'right' ? 'left' : 'right')}
          className={cx(
            iconButton,
            'hidden text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] hover:bg-raised tablet:grid',
            layout.sideToggle,
          )}
        >
          <ArrowIcon className={cx(side === 'right' && '-scale-x-100')} />
        </button>
        <button
          type="button"
          aria-label="Close player"
          onClick={close}
          className={cx(
            iconButton,
            'text-fg shadow-[inset_0_0_0_2px_var(--surface-line)] hover:bg-pink hover:text-ink hover:shadow-none',
          )}
        >
          <CloseIcon />
        </button>
      </div>

      {song && status === 'unavailable' && problem && (
        <div
          role="alert"
          className="order-1 mx-margin mb-2 rounded-control bg-raised p-3 text-label tablet:order-3 tablet:mx-0 tablet:mt-3 tablet:mb-0"
        >
          <p className="m-0">{PROBLEMS[problem]}</p>
          <p className="m-0 mt-2 flex flex-wrap gap-x-4 gap-y-1 font-bold">
            <a
              href={watchUrl(song.video.videoId, song.video.startSeconds)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-2 underline-offset-[0.25em]"
            >
              Watch on YouTube <span className="sr-only">(opens in a new tab)</span>
            </a>
            {(problem === 'not-loaded' || problem === 'other') && (
              <button
                type="button"
                onClick={() => play(song)}
                className="cursor-pointer underline decoration-2 underline-offset-[0.25em]"
              >
                Try again
              </button>
            )}
          </p>
        </div>
      )}

      {/* With a column to itself, the player also shows the recording's labels and where to go next. */}
      {song && (
        <div className={cx('order-4 hidden', layout.extras)}>
          <dl className="m-0 grid gap-3">
            {(
              [
                ['Cover genre', 'genre', 'genre', song.genres],
                ['Subgenre', 'subGenre', 'sub', song.subGenres],
                ['Performance style', 'performanceStyle', 'style', song.styles],
                ['Mood', 'mood', 'mood', song.moods],
              ] as const
            ).map(
              ([term, type, key, values]) =>
                values.length > 0 && (
                  <div key={term}>
                    <dt className="type-meta mb-1.5 font-semibold text-fg-soft">{term}</dt>
                    <dd className="m-0 flex flex-wrap gap-1.5">
                      {values.map((value) => (
                        <TagLink
                          key={value.id}
                          type={type}
                          label={term}
                          to={discoverOne(key, value.name)}
                        >
                          {tagLabel(value.name)}
                        </TagLink>
                      ))}
                    </dd>
                  </div>
                ),
            )}
          </dl>
          <ul className="m-0 grid list-none gap-2 border-t-[1.5px] border-line p-0 pt-4 text-label font-bold">
            {song.artists.map((artist) => (
              <li key={artist.id}>
                <Link
                  to={discoverHref({ ...NO_FILTERS, artist: [artist.name] })}
                  className="underline decoration-2 underline-offset-[0.25em] hover:decoration-pink"
                >
                  More covers by {displayName(artist.name)}
                </Link>
              </li>
            ))}
            {song.originalArtists.map((artist) => (
              <li key={artist.id}>
                <Link
                  to={discoverHref({ ...NO_FILTERS, songBy: [artist.name] })}
                  className="underline decoration-2 underline-offset-[0.25em] hover:decoration-pink"
                >
                  More covers of {displayName(artist.name)} songs
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Changes only with the recording, so a new song is announced and a pause isn't. */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {song ? `Now playing ${title}, covered by ${by}` : ''}
      </p>
    </aside>
  )
}
