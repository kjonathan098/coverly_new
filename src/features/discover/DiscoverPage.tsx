import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { Button, Container, Surface } from '../../ui'
import { countArtists } from '../songs/discover'
import { plural } from '../songs/format'
import { useCoverSongs } from '../songs/hooks'
import { Discover } from './Discover'
import { useFilters } from './useFilters'

/** /discover: the whole catalog, searchable and filterable. Playback goes to the shell's player. */
export function DiscoverPage() {
  useDocumentTitle('Discover covers · Coverly')
  const query = useCoverSongs()
  const songs = query.data ?? []
  const { filters, sort, update, setSort } = useFilters()

  return (
    <Surface
      as="section"
      tone="ink"
      grain
      aria-labelledby="discover-title"
      className="min-h-[70vh] pb-16"
    >
      <Container className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-5">
        <h1 id="discover-title" className="type-card m-0">
          Discover
        </h1>
        {query.isSuccess && (
          <p className="type-meta m-0 text-fg-soft">
            {plural(songs.length, 'cover')} · {plural(countArtists(songs), 'cover artist')} ·{' '}
            {plural(countArtists(songs, 'songBy'), 'original artist')}
          </p>
        )}
      </Container>

      {query.isError ? (
        <Container role="alert" className="mt-6 grid justify-items-start gap-4">
          <p className="type-card m-0">The catalog didn’t load.</p>
          <p className="max-w-[48ch] text-fg-soft">
            Coverly couldn’t reach its music library. Check that the Coverly backend is running,
            then try again.
          </p>
          <Button onClick={() => query.refetch()}>Try again</Button>
        </Container>
      ) : query.isPending ? (
        <Container>
          <p aria-busy="true" className="type-label mt-6 text-fg-soft">
            Loading the catalog…
          </p>
        </Container>
      ) : (
        <Discover songs={songs} filters={filters} sort={sort} onChange={update} onSort={setSort} />
      )}
    </Surface>
  )
}
