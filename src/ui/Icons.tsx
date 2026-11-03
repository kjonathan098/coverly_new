export function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M8 5.5 L19 12 L8 18.5 Z" />
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
