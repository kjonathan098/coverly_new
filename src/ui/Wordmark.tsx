import { cx } from './cx'

const LETTERS = ['C', 'O', 'V', 'E', 'R', 'L', 'Y']

type WordmarkProps = {
  /** bar: for headers. masthead: the full-width cover masthead. */
  size?: 'bar' | 'masthead'
  className?: string
}

/** The publication's name. Every letter has an A-side (heavy grotesque) and a B-side (bubble lettering). */
export function Wordmark({ size = 'bar', className }: WordmarkProps) {
  return (
    <span
      className={cx(
        'type-wordmark inline-flex perspective-[1400px]',
        size === 'masthead' ? 'text-masthead' : 'text-[1.7rem]',
        className,
      )}
    >
      <span className="sr-only">Coverly</span>
      {LETTERS.map((letter, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="relative inline-block transform-3d transition-transform duration-(--duration-slow) ease-snap hover:rotate-y-180"
        >
          <span className="block backface-hidden">{letter}</span>
          <span className="type-lettering absolute inset-0 grid rotate-y-180 place-items-center text-[0.6em] tracking-normal text-pink backface-hidden">
            {letter}
          </span>
        </span>
      ))}
    </span>
  )
}
