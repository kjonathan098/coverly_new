/**
 * A video's YouTube thumbnail. mqdefault is 16:9 (320×180); hqdefault is 4:3 (480×360, the 16:9 frame
 * letterboxed); maxresdefault is 16:9 (1280×720) but not every video has one. A missing one comes
 * back as YouTube's 120px placeholder, so check naturalWidth on load.
 */
export function youtubeThumbnail(
  videoId: string,
  quality: 'mqdefault' | 'hqdefault' | 'maxresdefault',
) {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`
}
