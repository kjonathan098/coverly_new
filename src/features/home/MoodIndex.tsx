import { Link } from 'react-router'
import { Section, SectionHeading } from '../../ui'
import { discoverHref } from '../discover/useFilters'
import { NO_FILTERS, type FacetCount } from '../songs/discover'
import { plural, tagLabel } from '../songs/format'

/** The contents page: moods set large, each one a way into the catalog. */
export function MoodIndex({ moods }: { moods: FacetCount[] }) {
  if (moods.length === 0) return null
  return (
    <Section tone="paper" grain id="moods" aria-labelledby="moods-title" className="scroll-mt-14">
      <SectionHeading
        id="moods-title"
        label="Moods"
        title="Start with a mood"
        intro="Every cover is tagged with how it feels. Pick one to hear every cover that carries it."
      />
      <ul className="m-0 flex list-none flex-wrap items-baseline gap-x-8 gap-y-2 p-0 tablet:gap-x-12">
        {moods.map(({ name, count }) => {
          return (
            <li key={name}>
              <Link
                to={discoverHref({ ...NO_FILTERS, mood: [name] })}
                className="type-section inline-flex items-start gap-2 no-underline transition-[text-shadow,color] duration-(--duration-base) ease-snap hover:text-pink-ink hover:[text-shadow:3px_-3px_0_var(--color-turquoise),6px_-6px_0_var(--color-blue)] focus-visible:text-pink-ink"
              >
                {tagLabel(name)}
                <span className="type-meta mt-[0.4em] font-semibold tracking-normal whitespace-nowrap text-fg-soft [text-shadow:none]">
                  {plural(count, 'cover')}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
