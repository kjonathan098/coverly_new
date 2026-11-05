# Coverly frontend

- Coverly 2.0 is a cover-song discovery product: browse by cover artist, genre, mood and performance style. Original-vs-cover comparison is out of scope for now; original-artist metadata may exist in the data but must not drive the UX.
- Current status and handoff notes: `docs/redesign/progress.md`. Read it at the start of a session and keep it current.
- Pages: `/` (`src/features/home`, browsing and collections; paused, don't change without asking) and `/discover` (`src/features/discover`, the main focus: search, six filter groups, a list of results and a docked Now Playing panel, with all state in the URL). Both read the real catalog from `GET /api/songs/all-songs` through `src/features/songs` (parser in `contract.ts`, filtering in `discover.ts`). Keep cover artist (`artist`) and original artist (`songBy`) separate everywhere, and never show the original genre as a recording's genre. Collections (`src/features/collections`) are saved Discover queries resolved with the same `filterSongs()`. The Phase 1 recordings contract is kept but not used by these pages.
- UI work follows `docs/design-system.md` (tokens in `src/styles/theme.css`, primitives in `src/ui`). The living reference is the dev-only `/design` route.
- Recording contracts and integrity rules: `src/mocks/CONTRACT.md`. Relationships come only from `originalRecordingId`; never infer them.
- `design-experiments/` holds approved visual prototypes. It is reference material, not production code.
- No fake functionality: never render a control that can't work (for example, no play button without a video).
- Playback: one YouTube player for the whole app, owned by the app shell (`src/app/AppShell.tsx`, `src/features/player`). Pages call `play(song)` and read `usePlaybackOf(id)`; never embed YouTube anywhere else. The player element must never move or remount (moving an iframe reloads it): layout changes are CSS only. No queue or auto-advance. Design notes: `docs/redesign/app-shell.md`.
- The backend (`../coverly_backend`) is an HTTP dependency only: never modify it. Its CORS allows only `http://localhost:5173`, so the dev server stays on that port.
- Never commit or push without the user's explicit approval.
- Use Node 24 (`nvm use`). Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run format:check`.

## Workflow (user preferences, 2026-11-05)

- Visual and layout work: implement, then let the user review in their own browser on the running dev server. Say which route to open and how to switch between alternatives.
- No screenshots by default: don't capture, save or analyze them unless the user asks, or one is needed to investigate a specific visual issue. Keep essential functional and responsive checks (scripted measurements are fine).
- During iteration, run only the relevant targeted tests (for example `npx vitest run src/features/player`). Don't run the full suite after every CSS or layout change, and don't add tests for temporary design prototypes.
- Before a commit is approved: run the full suite plus typecheck, lint, build and format:check.
- Don't re-read unchanged files. Keep tool output small, reuse existing fixtures and scripts, and summarize results briefly instead of listing every passing check.
- Never trade away playback behavior or accessibility to save effort.
