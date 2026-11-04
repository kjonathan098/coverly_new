import { cx } from './cx'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet'
export type ButtonSize = 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2.5 font-text font-bold whitespace-nowrap no-underline transition-[translate,box-shadow,background-color,color] duration-(--duration-base) ease-snap disabled:cursor-default aria-disabled:pointer-events-none'

const VARIANTS: Record<ButtonVariant, string> = {
  // The one main action per view. Its echoes fan out on hover, like the cover artwork.
  primary:
    'rounded-control bg-pink text-ink shadow-echo hover:-translate-x-[3px] hover:translate-y-[3px] hover:shadow-echo-lift active:translate-0 active:shadow-echo-press disabled:bg-raised disabled:text-fg-soft disabled:shadow-none disabled:translate-0',
  secondary:
    'rounded-control text-fg shadow-[inset_0_0_0_1.5px_var(--surface-line)] hover:bg-fg hover:text-surface disabled:bg-transparent disabled:text-fg-soft',
  quiet:
    'rounded-sm text-fg underline decoration-2 underline-offset-[0.3em] hover:underline-offset-[0.45em] disabled:text-fg-soft',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-label',
  lg: 'min-h-[3.4rem] px-6 text-[1.0625rem]',
}

/** Button looks for any element, such as a router Link. Prefer Button and ButtonLink where they fit. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  // A quiet button is text, so it keeps its height for touch but loses horizontal padding.
  return cx(BASE, VARIANTS[variant], SIZES[size], variant === 'quiet' && 'px-0', className)
}
