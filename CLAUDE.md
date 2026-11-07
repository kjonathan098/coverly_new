# Coverly frontend

- Coverly 2.0 is a cover-song discovery product: browse by cover artist, genre, mood and performance style. Original-vs-cover comparison is out of scope for now. Original-artist metadata may be used for discovery (Discover's Original artist filter, Home's same-song pairs), but never for original-vs-cover features.
- Current status and handoff notes: `docs/redesign/progress.md`. Read it at the start of a session and keep it current.
- Pages:
  - `/` Home (`src/features/home`): functional, music-first discovery with subtle visual personality. It has a compact welcome, Explore covers (a daily-rotating selection), Discover by mood (real moods, linking to Discover), Same song, different voices (recordings grouped by normalized title plus original-artist ids, with two different cover artists; the section hides when none qualify) and a Magazine invitation. No trending, popularity, personalization or hand-picked content. Selection rules are in `home/selection.ts`.
  - `/discover` (`src/features/discover`): advanced search and filtering. Six filter groups, a list of results, all state in the URL.
  - `/magazine` (`src/features/magazine`): expressive editorial content. The previous homepage design is preserved here as-is.
  - `/library` (`src/features/library`): Your Library. Favorites (`/library/favorites`, `src/features/favorites`; `/favorites` redirects) and the user's private playlists (`/library/playlists/:id`, `src/features/playlists`, backend `/api/playlists`). The heart (`FavoriteButton`) and "+" (opens the one shared add-to-playlist modal, `PlaylistPickerDialog`) are only in the Now Playing panel: cards and Discover rows keep just Play, so artwork stays uncovered (user decision, 2026-11-07). Favorites and playlist pages give their rows a Remove action. Each reads one shared query (`useFavorites()`, `usePlaylists()`). Guests get a login prompt.
  - `/playlists/:id`: a Coverly (official) playlist, public. Same `Playlist` model with `type: 'official'` (missing `type` = personal; `type` alone decides access, `public` never does). Only admins (`requireAdmin`) change official playlists; personal routes exclude them. Admins publish their own playlist from its page; Home shows "Playlists by Coverly" only when some exist.
  - Future Magazine features: Original vs. Cover, Cover vs. Cover, Behind the Song, Creator Spotlight, and Suggest a Cover with Picks rewards. Content is initially curated by the product owner.
- `approved` on songs is reserved for future moderation of user submissions. It is not enforced: never filter by it.
- All pages read the real catalog from `GET /api/songs/all-songs` (not paginated; fetched once and cached by `useCoverSongs()`) through `src/features/songs` (parser in `contract.ts`, filtering in `discover.ts`). Keep cover artist (`artist`) and original artist (`songBy`) separate everywhere, and never show the original genre as a recording's genre. Collections (`src/features/collections`) are saved Discover queries resolved with the same `filterSongs()`. The Phase 1 recordings contract is kept but not used by these pages.
- UI work follows `docs/design-system.md` (tokens in `src/styles/theme.css`, primitives in `src/ui`). The living reference is the dev-only `/design` route.
- Recording contracts and integrity rules: `src/mocks/CONTRACT.md`. Relationships come only from `originalRecordingId`; never infer them.
- `design-experiments/` holds approved visual prototypes. It is reference material, not production code.
- No fake functionality: never render a control that can't work (for example, no play button without a video).
- Song artwork is the playback control everywhere a thumbnail shows: use `PlayableCoverArt` (`src/features/songs`), never a separate Play button beside a thumbnail. Keep other actions (artist links, tags, Details, Remove) outside it.
- Playback: one YouTube player for the whole app, owned by the app shell (`src/app/AppShell.tsx`, `src/features/player`). Pages call `play(song)` and read `usePlaybackOf(id)`; never embed YouTube anywhere else. The player element must never move or remount (moving an iframe reloads it): layout changes are CSS only. No queue or auto-advance. Design notes: `docs/redesign/app-shell.md`.
- The backend (`../coverly_backend`) is an HTTP dependency: don't modify it, except narrowly scoped changes the user has reviewed and approved one by one (so far: popup login, the security milestone, Favorites, Playlists, Coverly playlists). No browser-only (localStorage) Favorites or Playlists. Its CORS allows only `http://localhost:5173`, so the dev server stays on that port.
- Auth: Google OAuth through the backend's server-side session cookie, via `src/features/auth` (`useSession()`, `loginUrl()`, `openLoginPopup()`, `useLoginResult()`, `useLogout()`). Login runs in a popup that reports back on `BroadcastChannel('coverly-auth')` (no tokens or user data on the channel), with the full-page login as fallback. Catalog writes are admin-only on the backend (`requireAdmin`, `ADMIN_OAUTH_IDS` in the backend `.env`). Guests can use everything except personal features. Never store tokens in the browser or add a second auth system. Login return paths go through `safeReturnPath()`. Known backend security issues: `docs/redesign/progress.md`, "Backend issues".
- Never commit or push without the user's explicit approval.
- Use Node 24 (`nvm use`). Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run format:check`.

## Workflow (user preferences, 2026-11-05)

- Visual and layout work: implement, then let the user review in their own browser on the running dev server. Say which route to open and how to switch between alternatives.
- Screenshots: never generate or capture them automatically. Only when the user asks, or one is needed for a specific issue. Scripted functional and responsive checks are fine.
- During iteration, run only the relevant targeted tests (for example `npx vitest run src/features/player`). Don't run the full suite after every CSS or layout change, and don't add tests for temporary design prototypes.
- Before a commit is approved: run the full suite plus typecheck, lint, build and format:check.
- Token efficiency: avoid unnecessary exploration, broad refactors, excessive tests and repeated design iterations. Don't re-read unchanged files. Keep tool output small, reuse existing fixtures and scripts, and summarize results briefly instead of listing every passing check.
- Never trade away playback behavior or accessibility to save effort.

## Testing Report (user preference, 2026-11-07; same rule in both Coverly repos)

After every feature, bug fix or significant UI change, end the final summary with a short, practical Testing Report:

- **Implemented:** a brief summary.
- **Verified automatically:** the specific behaviors and edge cases confirmed, and whether each passed or failed. Not just test counts. Say which kind of test checked what (unit, integration, browser/UI), and which pages, interactions and viewport sizes were checked in a real browser, including playback continuity, navigation and responsive layout where relevant. Keep mocked or simulated checks clearly apart from real ones: a test with mocks (MSW, fake models, a fake YouTube player, intercepted requests) does not verify the real external service, so say so.
- **Not verified:** important behavior that wasn't checked, and tests that were skipped or couldn't run. Typecheck, lint or build passing is not evidence that a feature works.
- **Manual QA needed:** only checks that need a person: real Google OAuth login, real YouTube playback continuity, visual appearance and UX quality, and anything automation can't reliably check. Don't ask for checks automation already covers, unless there's a specific reason.
- **Git status:** committed or uncommitted (and which repos).

Rules:

- Never claim a test ran if it didn't.
- During development, run targeted tests only; run the full suite before major commits.
- Avoid unnecessary screenshots.
- Never commit without the user's approval.

## MVP Product Priorities & Decisions (ongoing, 2026-11-06)

- **Phase:** Coverly is an MVP. Functionality and stability come before visual perfection.
- **Priorities:** core discovery, search, filters, playback, playlists, favorites, metadata and application stability.
- **Approach:** small, incremental changes, each with a clearly defined scope and acceptance criteria.
- **Mobile UI:** detailed mobile redesign is postponed, not abandoned. Mobile must have basic usability, working navigation, working playback and no critical layout issues (for example, no horizontal overflow from 320px).
- **Mobile player:** the C1/C2 experiments are concluded. Keep the current full-width bottom bar (a title and controls strip above a 16:9 video). Don't experiment with mobile layouts unless explicitly asked.
- **Desktop:** preserve the existing working experience. The player layout A/B comparison (dev-only switch, `?player=`, `src/features/player/layouts.ts`) is still awaiting the user's decision. The user leaned toward B. Production uses A.
- **Later:** revisit mobile polish and advanced visual design once core MVP functionality is stable.
