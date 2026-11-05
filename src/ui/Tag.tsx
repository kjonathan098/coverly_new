import type { ButtonHTMLAttributes } from 'react'
import { Link, type To } from 'react-router'
import type { Tag as RecordingTag, TagType } from '../features/recordings/types'
import { cx } from './cx'

// Genres are filled, performance styles are outlined, moods are dashed: the shape carries the type.
const SHAPES: Record<TagType, string> = {
  genre: 'bg-[color-mix(in_srgb,var(--surface-fg)_14%,transparent)]',
  subGenre: 'bg-[color-mix(in_srgb,var(--surface-fg)_14%,transparent)]',
  performanceStyle: 'shadow-[inset_0_0_0_1.5px_var(--surface-line)]',
  mood: 'outline-[1.5px] -outline-offset-[1.5px] outline-dashed outline-(--surface-line)',
}

const NAMES: Record<TagType, string> = {
  genre: 'Genre',
  subGenre: 'Genre',
  performanceStyle: 'Style',
  mood: 'Mood',
}

const CHIP =
  'type-chip inline-flex min-h-[1.7rem] items-center rounded-pill px-2.5 whitespace-nowrap'

export function Tag({ type, children }: { type: TagType; children: string }) {
  return (
    <span className={cx(CHIP, SHAPES[type])}>
      <span className="sr-only">{NAMES[type]}: </span>
      {children}
    </span>
  )
}

/** A recording's labels, in a fixed order: genres, then performance styles, then moods. */
export function TagList({
  tags,
  className,
}: {
  tags: readonly RecordingTag[]
  className?: string
}) {
  if (tags.length === 0) return null
  return (
    <ul aria-label="Labels" className={cx('m-0 flex list-none flex-wrap gap-1.5 p-0', className)}>
      {tags.map((tag) => (
        <li key={tag.id} className="flex">
          <Tag type={tag.type}>{tag.name}</Tag>
        </li>
      ))}
    </ul>
  )
}

/**
 * A filter chip: a toggle button that keeps the tag's shape and fills with pink when on.
 * With `count`, a value that would match nothing is disabled instead of leading to an empty result.
 */
export function ToggleTag({
  type,
  pressed,
  count,
  className,
  children,
  disabled,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & {
  type: TagType
  pressed: boolean
  count?: number
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(
        CHIP,
        'min-h-11 cursor-pointer px-4 transition-colors duration-(--duration-fast)',
        pressed ? 'bg-pink text-ink' : SHAPES[type],
        !pressed && 'hover:bg-[color-mix(in_srgb,var(--surface-fg)_24%,transparent)]',
        'disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent',
        className,
      )}
      disabled={disabled ?? (count === 0 && !pressed)}
      {...rest}
    >
      {children}
      {count !== undefined && <span className="ml-1.5 tabular-nums opacity-70">{count}</span>}
    </button>
  )
}

/**
 * A tag that leads somewhere: the same shape as Tag, as a link. `label` names the group for
 * assistive technology ("Subgenre", "Performance style"), so two tags with the same word in
 * different groups never sound alike. `current` marks a filter that's already on.
 */
export function TagLink({
  type,
  to,
  label,
  current = false,
  className,
  children,
}: {
  type: TagType
  to: To
  label: string
  current?: boolean
  className?: string
  children: string
}) {
  return (
    <Link
      to={to}
      aria-label={`${label}: ${children}`}
      aria-current={current ? 'true' : undefined}
      className={cx(
        CHIP,
        'no-underline transition-colors duration-(--duration-fast)',
        current
          ? 'bg-pink text-ink'
          : cx(SHAPES[type], 'hover:bg-[color-mix(in_srgb,var(--surface-fg)_24%,transparent)]'),
        className,
      )}
    >
      {children}
    </Link>
  )
}
