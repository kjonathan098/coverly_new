import { Button } from '../../ui'

/** A saved song that has left the catalog: say so, and let it be removed. */
export function MissingSongRow({
  onRemove,
  pending,
  failed,
}: {
  onRemove: () => void
  pending: boolean
  failed: boolean
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-card px-3 py-3">
      <p className="m-0 text-label text-fg-soft">This cover is no longer in the catalog.</p>
      <Button variant="secondary" disabled={pending} onClick={onRemove} className="min-h-9 px-3">
        Remove
      </Button>
      {failed && (
        <p role="alert" className="m-0 w-full text-meta text-pink">
          Couldn’t remove it. Try again.
        </p>
      )}
    </li>
  )
}
