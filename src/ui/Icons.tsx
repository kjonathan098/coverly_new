export function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M8 5.5 L19 12 L8 18.5 Z" />
    </svg>
  )
}

/** A heart: filled when `filled`, an outline otherwise. */
export function HeartIcon({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 20.5 C 5 15.6 2.5 12.4 2.5 8.9 A 4.6 4.6 0 0 1 12 6.6 A 4.6 4.6 0 0 1 21.5 8.9 C 21.5 12.4 19 15.6 12 20.5 Z" />
    </svg>
  )
}

export function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M7 5 H10.5 V19 H7 Z M13.5 5 H17 V19 H13.5 Z" />
    </svg>
  )
}

export function StopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  )
}

/** Points right; flip with `-scale-x-100` for "previous". */
export function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 12 H19 M13 6 L19 12 L13 18" />
    </svg>
  )
}

const STROKE = {
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 L20 20" />
    </svg>
  )
}

/** Points down; rotate 180° for "open". */
export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE} className={className}>
      <path d="M6 9.5 L12 15.5 L18 9.5" />
    </svg>
  )
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE} className={className}>
      <path d="M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5" />
    </svg>
  )
}

export function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg {...STROKE} className={className}>
      <path d="M4 7 H7.5 C10 7 11.5 8.5 12.5 10.5 L13.5 13.5 C14.5 15.5 16 17 18.5 17 H20 M17 14 L20 17 L17 20 M4 17 H7.5 C8.7 17 9.7 16.6 10.5 15.9 M13.5 8.1 C14.3 7.4 15.3 7 16.5 7 H20 M17 4 L20 7 L17 10" />
    </svg>
  )
}
