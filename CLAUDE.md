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
- Screenshots: never generate or capture them automatically. Only when the user asks, or one is needed for a specific issue. Scripted functional and responsive checks are fine.
- During iteration, run only the relevant targeted tests (for example `npx vitest run src/features/player`). Don't run the full suite after every CSS or layout change, and don't add tests for temporary design prototypes.
- Before a commit is approved: run the full suite plus typecheck, lint, build and format:check.
- Token efficiency: avoid unnecessary exploration, broad refactors, excessive tests and repeated design iterations. Don't re-read unchanged files. Keep tool output small, reuse existing fixtures and scripts, and summarize results briefly instead of listing every passing check.
- Never trade away playback behavior or accessibility to save effort.

## MVP Product Priorities & Decisions (ongoing, 2026-11-06)

- **Phase:** Coverly is an MVP. Functionality and stability come before visual perfection.
- **Priorities:** core discovery, search, filters, playback, playlists, favorites, metadata and application stability.
- **Approach:** small, incremental changes, each with a clearly defined scope and acceptance criteria.
- **Mobile UI:** detailed mobile redesign is postponed, not abandoned. Mobile must have basic usability, working navigation, working playback and no critical layout issues (for example, no horizontal overflow from 320px).
- **Mobile player:** the C1/C2 experiments are concluded. Keep the current full-width bottom bar (a title and controls strip above a 16:9 video). Don't experiment with mobile layouts unless explicitly asked.
- **Desktop:** preserve the existing working experience. The player layout A/B comparison (dev-only switch, `?player=`, `src/features/player/layouts.ts`) is still awaiting the user's decision. The user leaned toward B. Production uses A.
- **Later:** revisit mobile polish and advanced visual design once core MVP functionality is stable.
