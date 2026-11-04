import type { Video } from '../songs/types'

/**
 * Plays one video in place. It mounts only after the reader presses play, so autoplay is
 * always a response to that click. Uses the privacy-enhanced youtube-nocookie domain.
 */
export function YouTubeEmbed({ video, title }: { video: Video; title: string }) {
  const params = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' })
  if (video.startSeconds) params.set('start', String(video.startSeconds))
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${video.videoId}?${params}`}
      title={`${title}, playing from YouTube`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="absolute inset-0 size-full border-0"
    />
  )
}
