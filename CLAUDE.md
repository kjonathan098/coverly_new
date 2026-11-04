# Coverly frontend

- Coverly 2.0 is a cover-song discovery product: browse by cover artist, genre, mood and performance style. Original-vs-cover comparison is out of scope for now; original-artist metadata may exist in the data but must not drive the UX.
- Current status and handoff notes: `docs/redesign/progress.md`. Read it at the start of a session and keep it current.
- Pages: `/` (`src/features/home`, browsing and collections; paused, don't change without asking) and `/discover` (`src/features/discover`, the main focus: search, six filter groups, a list of results and a docked Now Playing panel, with all state in the URL). Both read the real catalog from `GET /api/songs/all-songs` through `src/features/songs` (parser in `contract.ts`, filtering in `discover.ts`). Keep cover artist (`artist`) and original artist (`songBy`) separate everywhere, and never show the original genre as a recording's genre. Collections (`src/features/collections`) are saved Discover queries resolved with the same `filterSongs()`. The Phase 1 recordings contract is kept but not used by these pages.
- UI work follows `docs/design-system.md` (tokens in `src/styles/theme.css`, primitives in `src/ui`). The living reference is the dev-only `/design` route.
- Recording contracts and integrity rules: `src/mocks/CONTRACT.md`. Relationships come only from `originalRecordingId`; never infer them.
- `design-experiments/` holds approved visual prototypes. It is reference material, not production code.
- No fake functionality: never render a control that can't work (for example, no play button without a video). Playback is page-local; no global player or queue.
- The backend (`../coverly_backend`) is an HTTP dependency only: never modify it. Its CORS allows only `http://localhost:5173`, so the dev server stays on that port.
- Never commit or push without the user's explicit approval.
- Use Node 24 (`nvm use`). Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run format:check`.
