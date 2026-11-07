import { cx } from './cx'

/** Small round icon actions on a song (favorite, add to playlist), 44px to tap. */
export function actionButtonClasses({ active = false }: { active?: boolean } = {}) {
  return cx(
    'grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill transition-colors duration-(--duration-fast) *:size-5 hover:text-pink disabled:cursor-default disabled:opacity-50',
    active ? 'text-pink' : 'text-fg-soft',
  )
}
