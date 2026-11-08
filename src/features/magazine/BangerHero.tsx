import cover from '../../assets/coverly_magazine_front_cover.png'
import { ArrowIcon } from '../../ui'

/**
 * The Magazine's entrance: the whole cover (never cropped) and the invitation into the issue.
 * From desktop, the two fill the first screen below the sticky site header (its min-h-14, 3.5rem);
 * when the window is too short, the hero grows instead of cropping the cover.
 */
export function BangerHero() {
  return (
    <section
      aria-labelledby="banger-title"
      className="flex flex-col bg-[#0b0a0d] desktop:min-h-[calc(100dvh-3.5rem)]"
    >
      <h2 id="banger-title" className="sr-only">
        Coverly Magazine — Banger of the Week
      </h2>
      <img
        src={cover}
        alt="Coverly Magazine Issue 01 — Banger of the Week"
        width={2172}
        height={724}
        decoding="async"
        className="block h-auto w-full"
      />
      <div className="flex flex-1 items-center justify-center bg-linear-to-b from-[#0b0a0d] to-ink px-margin py-8 desktop:py-12">
        <a
          href="#magazine-content"
          className="group inline-flex min-h-11 flex-col items-center gap-2 type-label tracking-[0.25em] text-fg uppercase no-underline transition-colors hover:text-pink focus-visible:text-pink"
        >
          Open this issue
          <ArrowIcon className="size-5 rotate-90 transition-transform motion-safe:group-hover:translate-y-1" />
        </a>
      </div>
    </section>
  )
}
