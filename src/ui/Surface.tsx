import type { HTMLAttributes } from 'react'
import { cx } from './cx'

export type SurfaceTone = 'ink' | 'paper'
type SurfaceTag = 'div' | 'section' | 'header' | 'footer' | 'main' | 'aside' | 'article'

type SurfaceProps = HTMLAttributes<HTMLElement> & {
  /** Ink is for covers and listening; paper is for reading. Children adapt automatically. */
  tone?: SurfaceTone
  /** Print texture over the whole surface. */
  grain?: boolean
  as?: SurfaceTag
}

export function Surface({
  tone = 'ink',
  grain = false,
  as: Tag = 'div',
  className,
  ...rest
}: SurfaceProps) {
  return (
    <Tag
      data-surface={tone}
      className={cx('relative isolate bg-surface text-fg', grain && 'grain', className)}
      {...rest}
    />
  )
}
