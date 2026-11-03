# Coverly Recording API Contract

The frontend defines this contract. MSW serves it today (`src/mocks/handlers/recordings.ts`); the Coverly backend is expected to implement it later. Once it does, the frontend switches from the mock to the real API by removing `recordings` from `VITE_MOCK_GROUPS`. No frontend code changes.

The frontend enforces everything in this document at runtime (`src/features/recordings/contract.ts`). A response that breaks it is rejected with a `ContractError`; it is never rendered.

## Recording model

```ts
type TagType = 'genre' | 'subGenre' | 'performanceStyle' | 'mood'
type Tag = { id: string; name: string; type: TagType }
type ArtistRef = { id: string; name: string; imageUrl?: string }

type Recording = {
  id: string
  kind: 'original' | 'cover'
  originalRecordingId: string | null // the only original↔cover link
  title: string
  artists: ArtistRef[]
  year?: number
  genres: Tag[]
  performanceStyles: Tag[]
  moods: Tag[]
  source: { platform: 'youtube'; videoId: string; startSeconds?: number } | null
}

type Page<T> = { items: T[]; nextCursor: string | null }

type Exploration = {
  recording: Recording
  original: Recording | null
  covers: Page<Recording>
}
```

- An original is a full recording in its own right, not an attribute attached to a cover.
- `source` is `null` when a recording has no playable link yet.
- Strings must be non-empty. `year` and `startSeconds` must be finite numbers.

## Relationship rules

The only thing that links a cover to an original is an explicit `originalRecordingId`. A relationship must never be inferred from titles, artist names, or any other metadata, on either the server or the client.

A recording may stand alone. An original with no covers is valid, and so is a cover whose original isn't in the system yet (`originalRecordingId: null`).

| Rule | Requirement                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------- |
| I1   | `kind: 'original'` → `originalRecordingId` must be `null`.                                     |
| I2   | `kind: 'cover'` → `originalRecordingId` is a non-empty string or `null`.                       |
| I3   | A cover cannot reference another cover, including itself.                                      |
| I4   | A non-null `originalRecordingId` must reference an existing recording with `kind: 'original'`. |

## Envelope

Every response uses the backend's existing envelope.

| Outcome       | HTTP    | Body                                                              |
| ------------- | ------- | ----------------------------------------------------------------- |
| Success       | 200     | `{ "success": true, "message": <payload> }`                       |
| Not found     | 404     | `{ "success": false, "message": "Recording \"<id>\" not found" }` |
| Other failure | 4xx/5xx | `{ "success": false, "message": "<reason>" }`                     |

The frontend treats `success: false` as a failure even when the status is 200. 4xx responses are not retried.

## Endpoints

### `GET /api/recordings/:id`

Payload: a `Recording`. Its `id` must equal `:id`.

### `GET /api/recordings/:id/exploration`

Payload: an `Exploration` for the requested recording. The server resolves every relationship, and the client only checks the result.

- `recording` is the requested recording (`recording.id === :id`).
- `original` is:
  - the recording itself, when it is an original
  - the recording referenced by `originalRecordingId`, when it is a linked cover
  - `null`, when it is an unlinked cover
- When not `null`, `original` must have `kind: 'original'`.
- `covers.items` holds every cover whose `originalRecordingId === original.id`, with no duplicates. It is empty when `original` is `null`.
- When the requested recording is a linked cover and `covers.nextCursor` is `null`, the requested cover must appear in `covers.items`.

### Pagination (reserved)

Collections use `Page<T>` so pagination can be added without a breaking change.

- Today the server returns every item with `nextCursor: null`.
- `?cursor=&limit=` are reserved query parameters. Servers ignore them for now.
- A future server returns an opaque `nextCursor` string, and the client requests the next page with `?cursor=<nextCursor>`.

## Exploration states

| Requested recording     | `original`   | `covers.items`                          | Fixture ID                   |
| ----------------------- | ------------ | --------------------------------------- | ---------------------------- |
| Original with covers    | itself       | its linked covers                       | `placeholder-original-a`     |
| Original without covers | itself       | `[]`                                    | `placeholder-original-b`     |
| Linked cover            | its original | its original's covers, including itself | `placeholder-cover-a1`       |
| Unlinked cover          | `null`       | `[]`                                    | `placeholder-cover-unlinked` |

`placeholder-cover-unlinked` deliberately has the same title and artist as `placeholder-original-a`. It stays unlinked because only `originalRecordingId` creates links.

The fixtures (`src/mocks/fixtures/recordings.ts`) are placeholder metadata, not real songs, artists, or videos, and every `source` is `null`. A curated real-data set replaces them before the Phase 3 prototype review.

## Backend gaps

These are based on a read-only audit of the existing backend. How the backend stores the data is up to the backend; the frontend only depends on this contract.

- **No recording model or link.** Originals and covers are mixed together in one `Song` document (`artist.original` and `artist.coverArtist`), and nothing links a cover to an original. The backend needs:
  - a `kind` and an `originalRecordingId`, or equivalents
  - a way to add original recordings, which are mostly missing from the data today
  - the two endpoints above, with I1–I4 enforced on write
- **No pagination** on any list endpoint.
- **Coarse errors.** Most failures are HTTP 500 with a message string. This contract needs a 404 for missing recordings.
- **Auth isn't enforced** on mutating routes. `ensureAuthenticated` exists but isn't used, and playlist creation hardcodes its owner.
- **CORS** allows only `http://localhost:5173`, and that value is hardcoded rather than configured.
