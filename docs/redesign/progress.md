# Coverly redesign: progress handoff

Last updated: 2026-11-07. Read this first in a new session, then `CLAUDE.md`, `docs/design-system.md` and `docs/redesign/roadmap.md`.

## Product vision (current, approved)

**Coverly 2.0 is a cover-song discovery platform.** It should feel like an engaging place to explore music, discover unexpected covers and find new artists. Discovery runs through:

- cover artists
- genres and subgenres
- moods
- performance styles
- featured and curated picks
- playlists and community features, but only where the backend actually supports them

**Latest decision (start of Phase 3): original-vs-cover comparison is out of scope.** Do not build:

- original-vs-cover comparisons
- side-by-side original and cover experiences
- original-anchored exploration
- anything else that depends on linking originals to covers

Original-artist metadata can stay in the database, but it must not drive the UX. The earlier architecture plan centered on `/recordings/:id` exploration. That plan is superseded on this point, but its Phase 1 code is kept.

## Design direction (approved in Phase 2C)

"Electric Pop": a print-magazine look that is still music-first.

- Ink surfaces are for listening and paper surfaces for reading. They meet at halftone `Dissolve` bands, never at a hard edge.
- Print texture comes from grain and halftone. Colors run on a pink/turquoise/blue "version" ramp, with offset echo shadows.
- Display type is condensed and very large.
- **Music-first rule:** the homepage must let a reader start featured music with one click.
- Avoid generic Spotify-style layouts.
- Full rules: `docs/design-system.md`. Tokens: `src/styles/theme.css`. Primitives: `src/ui`. Living reference: the dev-only `/design` route.

## Phases

| Phase                           | Status                                                                                 | Summary                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0: Scaffold                     | Done (committed)                                                                       | Vite 8, React 19, TS strict, React Router 8, TanStack Query 5, Tailwind v4, MSW 3 with `VITE_MOCK_GROUPS` partial mocking, Vitest 5 + RTL, ESLint, Prettier                                |
| 1: Contract and fixtures        | Done (committed `59a7394`)                                                             | `Recording`/`Exploration`/`Page<T>` contract, integrity rules I1–I4, `src/mocks/CONTRACT.md`, recordings handlers and fixtures. Kept but **not used** by the homepage.                     |
| 2A/2B: Visual direction         | Done (committed `b3313f0`, `78cde64`)                                                  | Electric Pop prototypes in `design-experiments/` (reference only)                                                                                                                          |
| 2C: Design system               | Done, approved, **not committed**                                                      | Tokens, utilities, primitives (`Button`, `Tag`/`ToggleTag`, `RecordingTile`, `Sleeve`, `EditorialCard`, `SectionHeading`, `Dissolve`, icons), the `/design` route, `docs/design-system.md` |
| 3: Discovery homepage           | Done (cover-of-the-week version); superseded by 3B, **not committed**                  | First homepage with Discover embedded in it                                                                                                                                                |
| 3B: Homepage and Discover split | Implemented and verified, **awaiting review, not committed**                           | See below                                                                                                                                                                                  |
| 4: Discover as a music app      | Direction and layout approved; final verification passed; **commit awaiting approval** | See "Phase 4" below. Homepage paused.                                                                                                                                                      |
| MVP 1: Authentication           | Done (committed)                                                                       | See "MVP Phase 1: Authentication" below. Next: Favorites, then Playlists.                                                                                                                  |
| MVP 2: Favorites                | Done (committed `3ff0c3e`, backend `ee65d40`)                                          | See "MVP Phase 2: Favorites" below. Next: Playlists and Your Library.                                                                                                                      |
| MVP 3: Playlists + Your Library | Done (committed `29addd9`, backend `f72d3af`)                                          | See "MVP Phase 3: Playlists and Your Library" below.                                                                                                                                       |
| MVP 4: Coverly playlists        | Implemented, **awaiting review, not committed**                                        | See "MVP Phase 4: Official Coverly playlists" below.                                                                                                                                       |

## Magazine cover entrance (complete, 2026-11-08)

- `src/features/magazine/BangerHero.tsx`, at the top of `/magazine`: the cover artwork `src/assets/coverly_magazine_front_cover.png` (2172×724, full width at its natural ratio, never cropped), then an "Open this issue" link in a dark gradient area that fills the rest of the first screen.
- From the `desktop` breakpoint the hero is `min-h-[calc(100dvh-3.5rem)]` (3.5rem = the sticky header's `min-h-14`): a minimum, so a short window grows the hero instead of cropping the cover. Phones and tablets get no forced height.
- Root cause of the earlier attempt: `theme.css` resets Tailwind's breakpoints, colors and text sizes, so `lg:`, `pink-400` and `text-sm` silently didn't exist. Use the project's own (`desktop:`, `pink`, `type-label`).
- "Open this issue" is a native anchor to `#magazine-content`, a wrapper (with `scroll-mt-24 tablet:scroll-mt-14`, clearing the header, which wraps to two rows on phones) around everything after the cover, so it exists in every state and the first section in the issue is what it reaches. Smooth scrolling and its reduced-motion fallback come from `base.css`. Banger of the Week is the first section inside that wrapper.
- Approved and manually verified by the user (design, playback, anchor) on 2026-11-08. The earlier lettering experiment's portrait (`banger-of-the-week.png`) was deleted.

## Banger of the Week, first feature (complete, 2026-11-08)

- `src/features/magazine/BangerOfTheWeek.tsx`: the first section inside `#magazine-content`, so "Open this issue" lands on it. A spread: the street-leap photograph (`src/assets/banger-street-leap.png`, the user's artwork copied unchanged, 1054×1492) as a full page on the left (45%), never cropped, overlapping the edge of a cream paper page (55%) with the edition sticker, the headline (Bricolage Grotesque 800, 75% width, sized in `cqw` of the paper page), a hand-drawn rule, the song title, "Cover by" and "Original by" (`ArtistLinks`), the comment and "Listen to this banger" (`play(song)` in the shell's player; the label follows `playVerb`). Stacked on phones and tablets.
- Editorial config: `src/features/magazine/bangerFeature.ts` (`songId`, artwork, `edition`, `headline` lines, `comment`). Song data always comes from the catalog by **song** id. Issue 001 (user's content, 2026-11-08): "Like a Prayer", Miley Cyrus covering Madonna (`6ae645d5be654669da63d45c`), headline "This one hits different.", edition "The Weekly Drop / 001", comment "Miley takes on a Madonna classic. Turn it up and hear what happens." The dev preview and placeholder comment are gone: if the song isn't in the catalog, the section doesn't render (no stand-in song).
- New token `--color-orange` (#ee5a1f, from the sneaker): accents and stickers only.
- Not `bangerOfTheWeek.ts`: macOS resolves `./BangerOfTheWeek` case-insensitively to it.

## Experiment: artist header A/B (2026-11-07, awaiting the user's choice, not committed)

- Dev-only switch on artist pages: `?hero=a` (text header, production) or `?hero=b`, or the "Header A / Header B" toggle at the header's top right. Production always shows A.
- B (`artists/ArtistHero.tsx`, `heroVariant.ts`): a frame from one of the artist's own cover performances (a solo one first; `heroSong()`), as a duotone in its genre's ink with a halftone, on the right 68% from tablets (full width on phones, under a stronger fade), fading into ink toward the name. Captioned "From their cover of {title}" (it's a video frame, not a portrait). Tries `maxresdefault`, then `hqdefault`, then falls back to the text header. Original-only artists keep A. From tablets the header is at least 22rem tall.
- `youtubeThumbnail()` moved to `songs/thumbnail.ts` (used by `CoverArt` and the hero).
- Remove the losing variant and the switch once decided.

## Now Playing information (2026-11-07, desktop design approved)

- `PlayerPanel`: the controls (heart, +, a divider, Play/Pause, move, Close) share the top row with the status label ("Now playing", "Paused"…), so the song's text gets the full width. The title wraps (no truncation); "Cover by" and "Original by" are a label/value list on separate lines, every artist linked to their profile, names wrapping. Same on phones (the bar grows by the extra lines). The video element and the DOM order are unchanged.
- Tests: `player/nowPlaying.test.tsx`; the Discover playback test checks the new labelled lines.
- **Mobile deferred (user decision, 2026-11-07):** the phone bar grows with long titles and several artists. Optimizing the mobile player waits for a dedicated responsive-design milestone (`docs/redesign/roadmap.md`); no mobile UI changes until then.

## Artist profiles (complete, committed `0717ba5`)

- `/artists/:id` (`src/features/artists/ArtistPage.tsx`): public, frontend only, built from the cached catalog by `artistProfile(songs, id)` (`profile.ts`), which matches artists **by id**. No backend change, no migration, no third-party data.
- Header: "Artist" label, the name in display type, role labels with counts ("Cover artist · 3 covers performed", "Original artist · 5 covers of their songs"; counts are cover performances, not distinct songs), and a fading pink halftone as the only decoration. No photo, biography or placeholder art (the Artist model's extra fields are all empty).
- Sections: "Covers by {name}" (`SongCard` with the original artist) and "Covers of songs by {name}" (`SongCard` showing who covered it), each linking to Discover's matching filter ("Their covers in Discover", "Covers of their songs in Discover"). Both appear for artists with both roles. Cards: a swipeable row on phones, 2 columns on tablets, 4 on desktop, as on Home. "Artist not found" for unknown ids and artists no cover credits.
- `ArtistLinks` (every artist name: Discover rows, Favorites and playlist rows, cards, Now Playing, Home) now links to the profile, by id; accessible name "{Name}, cover artist" / "{Name}, original artist". Links never start playback.
- Data audit (2026-11-07, read-only): 122 artists, 119 credited on songs (79 cover, 45 original, 5 both); most have one cover; no near-duplicate names; 7 duo/group records (e.g. "Simon & Garfunkel") stay their own artists; 3 artists without songs show "Artist not found".
- Tests: `artists/profile.test.ts`, `artists/artistPage.test.tsx`; Discover, app shell and artwork tests updated for profile links.

## Artwork is the play button, everywhere (2026-11-07, awaiting review)

- `src/features/songs/PlayableCoverArt.tsx`: one component for every song thumbnail. A `<button>` wrapping `CoverArt` (labels as before: Play / Pause / Resume / Replay … by …) that calls `play(song)`, so the current song toggles pause/resume. Only the artwork is inside it: titles, artist links, tags, Details and Remove stay outside.
  - Hover (devices that can hover) and keyboard focus: a translucent pink circle (`bg-pink/50`, pink ring) at the center over a slight darkening, 150ms fade and scale; the duotone-to-color reveal stays. Touch screens (`pointer-coarse:`): a small permanent dark icon in the corner. Sizes: `card` (56px circle) and `row` (36px circle, 24px corner icon).
  - No video: plain artwork with a "No video" chip, not a button. Reduced motion: the global rule in `base.css`.
  - `badge`: the Playing/Paused badge on the artwork (cards); rows keep theirs beside the title.
- Used by `SongCard` (Home's Explore, Magazine's shelf), Home's same-song takes, and `SongRow` (Discover, Favorites, personal and Coverly playlists). The separate Play/Pause buttons are gone; `SongRow` lost its play column (rows on phones got shorter, desktop unchanged).
- Not changed: the Magazine carousel's labelled "Play …" call-to-action, the Cover Machine's strip, and the Now Playing panel.
- `CoverArt` renders spans (displayed as blocks) so it can sit inside a button.

## MVP Phase 4: Official Coverly playlists (2026-11-07, awaiting review)

- **Model** (no migration): `Playlist.type` (`user` | `official`, default `user`; **missing = personal**) and `description` (≤ 200). `type` alone decides access; the legacy `public` flag never grants anything (kept in sync on publish/unpublish only).
- **Backend** (`src/3-routes/playlists.route.js`, one handler factory for both kinds):
  - Personal `/api/playlists`: login (401), every query `{ createdBy: req.user._id, type: { $ne: 'official' } }`, so a published playlist is out of reach even for its creator. Create always writes `type: 'user'`; `type`, `createdBy`, `public` from requests are ignored everywhere.
  - Official `/api/official-playlists`: `GET /` and `GET /:id` public (guests too), never personal ones; `POST`, `PATCH` (name, description), `DELETE`, songs `PUT`/`DELETE`, `POST /:id/unpublish` need `requireAdmin` (401 guests, 403 users), any admin, whoever created it. Responses never include `createdBy` (credited to Coverly).
  - `POST /api/playlists/:id/publish`: admin **and** owner of that personal playlist; same id and songs. Unpublish returns it, private, to its creator.
  - `getUser` adds server-derived `isAdmin` (UI only).
  - Tests: `test/playlists.test.js` (official suite), `test/favorites.test.js` (`isAdmin`).
- **Frontend:**
  - Data: `PlaylistKind` (`mine` | `official`) on the API calls and hooks; `useOfficialPlaylists()` (public, key `['official-playlists']`); `useUpdatePlaylist` (name, description), `usePublishPlaylist(id, publish)`. `SessionUser.isAdmin`.
  - `/playlists/:id` (`OfficialPlaylistPage`): public, "By Coverly" badge (`CoverlyBadge`), description, "Coverly playlist · N covers", rows play in the global player. Covers gone from the catalog are hidden from visitors. Admins: Edit (name + description), Delete, Unpublish, Remove per row.
  - Personal pages say "Private playlist"; admins get "Publish as Coverly playlist" (with a confirmation step).
  - Home: "Playlists by Coverly" (`home/CoverlyPlaylists.tsx`, after Explore covers), up to 4 compact cards, rendered only when official playlists exist.
  - "+" modal: admins also see a "Coverly playlists · admin" group; everyone else never sees official playlists there.
  - "The Beatles Covers" was not changed: the user publishes it from the UI.
  - Tests: `playlists/officialPlaylists.test.tsx`, additions to `playlistsData.test.tsx`.

## MVP Phase 3: Playlists and Your Library (2026-11-07, awaiting review)

- **Backend** (approved):
  - `Playlist` model: `name` (trimmed, 1–100), `createdBy` (indexed), `songs` (ids in the order added, default `[]`, only `$addToSet` / `$pull`), `public` (default **false**), `timestamps: true` (same field names as before).
  - `/api/playlists` (`src/3-routes/playlists.route.js`), all behind `ensureAuthenticated` (401). Every query filters by `{ _id, createdBy: req.user._id }`, so anyone else's playlist is a 404, whatever `public` says. No owner id is read from the request.
    - `GET /` mine, newest first · `POST /` `{ name, songId? }` (201) · `PATCH /:id` `{ name }` · `DELETE /:id` · `PUT /:id/songs/:songId` (404 if not in the catalog) · `DELETE /:id/songs/:songId` (no catalog check, so removed songs can be removed).
    - 400 for bad ids or names; 409 at the limits (200 playlists per user, 500 songs per playlist). Adding a song is one atomic `findOneAndUpdate` (only if it's already there or there's room).
  - Removed: the legacy `/api/playlist` router (disabled create, `by-name`) and `playlistValidation.js`. Only the retired old frontend referenced them. `User.userPlaylists` stays in the schema, unused.
  - Data: `scripts/makePlaylistsPrivate.js` (dry run by default, `--apply` to write) set the one existing playlist to `public: false`. Verified: only `public` changed (name, owner, 10 songs and timestamps identical); no duplicates; all its songs are in the catalog.
  - Tests: `test/playlists.test.js` (fake models); `test/security.test.js` now uses the new router.
- **Frontend:**
  - `src/features/playlists`: `usePlaylists()` (one query, `['playlists', userId]`, cleared at logout), `usePlaylistSong()` (optimistic, scoped per playlist and song, settles on the server's list), create / rename / delete hooks, `NewPlaylistForm`.
  - **Add-to-playlist modal** (revised 2026-11-07 after the user's review; the first version's inline panels caused layout problems): one `PlaylistPickerDialog`, mounted once by `AppShell`; any `AddToPlaylistButton` ("+") opens it through `pickerStore.ts` (`openPlaylistPicker(song, opener)`). It shows the song and cover artist, a "Find a playlist" search, a scrollable checkbox list (only the list scrolls; works with 5 or 100 playlists), and "New playlist" (prefilled from the search; creates it with the song). Close button, Escape and a click outside close it; focus returns to "+". Like the filter sheet, it's a non-modal `<dialog>`: the page (`[data-shell="page"]`) is made inert and dimmed (`data-dimmed`, `base.css`), the player is not, and the dialog sits above a floating player (`--player-inset`) and clear of a docked one, so it never covers the video and the iframe never moves. Guests: "+" opens the Google popup, no automatic action after login.
  - Where the actions are (user decision, 2026-11-07, after reviewing hearts and "+" on artwork and rows): **only in the Now Playing panel**, beside the song information. `SongCard` (Home, Magazine) and Discover's `SongRow` keep just Play, so artwork stays uncovered; no hover controls or overflow menus for now (to revisit if users need a quicker way to save while browsing). Favorites and playlist pages give each row a Remove (×) at the end of its Details line. Card titles are at most two lines (no mid-word breaks); artist lines truncate.
  - `src/features/library`: `/library` (Favorites first, then playlists newest first, "New playlist"), `/library/playlists/:id` (songs in the order added, rename inline, delete with confirmation, Remove on each row in place of "+", removable rows for songs gone from the catalog, "Playlist not found"), `LibraryShell`. `/library/favorites` is the Favorites page; `/favorites` redirects there. The header nav is Discover · Magazine · Library.
  - Shared: `LoginPrompt` (auth), `MissingSongRow` (songs), `PlusIcon` (ui).
  - No queue, Play All or auto-advance: each row plays on its own through the global player.
  - Tests: `playlistsData.test.tsx`, `addToPlaylist.test.tsx`, `library/library.test.tsx`. No horizontal overflow at 320–1440 px.

## MVP Phase 2: Favorites (complete, 2026-11-07)

Verified manually by the user (Google login, hearts, sync, playback). Committed: frontend `3ff0c3e`, backend `ee65d40`.

- **Backend** (approved): `favorites: [ObjectId → Song]` on `User`, changed only with `$addToSet` / `$pull` (no duplicates). Routes in `user.route.js`, all behind `ensureAuthenticated` (401), owner always `req.user._id`:
  - `GET /api/user/favorites` → song ids, oldest first.
  - `PUT /api/user/favorites/:songId` → add (idempotent). 400 for a malformed id, 404 if the song isn't in the catalog.
  - `DELETE /api/user/favorites/:songId` → remove (idempotent). No catalog check, so a song that left the catalog can still be removed.
  - Each answers with the updated id list. `getUser` now returns only `{_id, name}` (the frontend reads nothing else).
  - `rejectCrossSiteWrites` now treats `Content-Length: 0` as no body (bodyless PUT/DELETE from fetch were getting 415).
  - Tests: `test/favorites.test.js` (fake models).
- **Frontend** (`src/features/favorites`):
  - `useFavorites()`: one query, key `['favorites', userId]`, enabled only when logged in. Every heart and the Favorites page read it, so they always agree. Logout removes it.
  - `useFavoriteToggle(songId)`: optimistic. Changes to one song run one at a time in click order (mutation `scope`); only the last of overlapping changes re-reads the list, so the cache ends on the server's truth. A failure re-reads too, and is announced (`role="status"`).
  - `FavoriteButton`: the heart (`HeartIcon` in `src/ui`), `aria-pressed`, its own button so it never plays anything. On `SongRow` (Discover, Favorites), `SongCard` (Home's Explore, Magazine shelf) and the Now Playing panel.
  - Guests: the heart's click opens the Google popup (`startLogin()`, full-page fallback) and keeps the song id in `sessionStorage` (`pending.ts`, 5 minutes, id only). `useCompletePendingFavorite()` (in `AppShell`) saves it once after login; a canceled login drops it.
  - `/favorites` (nav link for everyone): guests get a login prompt; users get their favorites newest first as `SongRow`s, an empty state, an error state, and a removable row for a song that left the catalog.
  - Tests: `favoritesData.test.tsx` (cache, rapid clicks, rollback, logout, pending), `favoritesUi.test.tsx` (sync across row, player, Home and Favorites; guest popup flow; cancel; missing song; logout). No horizontal overflow at 320–1440 px.

## MVP Phase 1: Authentication (2026-11-06)

Google login on the existing backend (Passport, server-side `express-session`, HttpOnly `connect.sid` cookie, 24 h), in a popup so Coverly and the music stay put. No tokens in the browser, no second auth system, no Google Identity Services.

- **`src/features/auth`:**
  - `session.ts`: `fetchSession()` reads `GET /api/user/getUser`. The backend's logged-out answer (200 `{success:false, message:null}`) is a guest (`null`), not an error. A user is `{id, name}`: Google gives only a display name (scope `profile`; no email, `profileImage` stays empty), so nothing else is shown.
  - `useSession()`: query key `['session']`, staleTime 60 s. `data` is undefined until the first answer.
  - `loginUrl(path + search, { popup })`: `/api/auth/google?from=…` (plus `&mode=popup`).
  - `openLoginPopup()`: opens that URL in a popup from the click. If the browser blocks it, the link's default full-page login runs instead and returns to the same route and search.
  - `useLoginResult()`: listens on `BroadcastChannel('coverly-auth')` for `{type:'coverly:auth', status:'success'|'failed'}` and re-reads the session (no reload, player untouched). The message carries no token or user data, and anything else on the channel is ignored. The session query also re-checks on every window focus (`refetchOnWindowFocus: 'always'`), which covers a popup closed by hand.
  - `useLogout()`: `GET /api/auth/logout`, then the session becomes `null`. Only the session query changes; the player is untouched.
  - `returnPath.ts`: `safeReturnPath()` passes only same-site paths (one leading `/`, no `//`, backslashes or control characters, at most 2000 characters), otherwise `/`.
  - `AccountControl.tsx`, in the app shell header: "Log in", or the name (tablet and up) plus "Log out". Hidden until the first answer. If the session check fails, it shows "Log in"; if logout fails, it stays logged in and says so; if the popup login is canceled or fails, it says "Login didn’t finish." Modified clicks (Ctrl/Cmd/Shift) open the full-page login.
- **`public/auth-complete.html`:** static page where popup logins end. It posts the result on the channel and closes. If it can't close (not a script-opened popup), it continues to the validated `from` route, so nobody is stranded on it.
- **Guests:** nothing is restricted. There are no route guards yet; personal features will ask for login where they appear.
- **Playback:** the popup login, session checks and logout never touch the player. Only the blocked-popup fallback leaves the page, so playback stops then.
- **Backend changes (approved 2026-11-06, auth only):**
  - `src/config/passport-setup.js`: `state: true`, a one-time OAuth state nonce in the session, checked on the callback (CSRF protection).
  - `src/3-routes/auth.route.js`:
    - `prompt: 'select_account'`: Google always shows the account chooser.
    - `safePath()` validates `from` on the backend (single leading `/`, no `//`, backslashes or control characters, at most 2000 characters, otherwise `/`).
    - `mode=popup` ends on `/auth-complete.html?status=…&from=…`; the full-page login ends on the `from` route.
    - The callback uses a custom Passport callback: cancellation (`access_denied`), a state mismatch or an error never logs in and ends as `status=failed` (popup) or back on the `from` route as a guest (full page).
    - `req.logIn(user, { keepSessionInfo: true })`: Passport 0.7 regenerates the session at login and used to drop the return path, so logins always landed on `/`. The session id still changes (fixation protection).
  - Verified with scripted requests: `prompt=select_account` and `state` reach Google; cancel, a forged state and a missing state end as failed with no session; unsafe `from` values become `/`. A standalone script confirmed the session id rotates and the destination survives with `keepSessionInfo`. A real Google login is verified by the user.
- **Sessions are in backend memory:** every backend restart (including nodemon's) logs everyone out. Fine for development.
- **Mocks and tests:** the `auth` MSW group answers as a guest by default; `loggedInHandlers()` gives a session that ends at logout (`src/mocks/fixtures/users.ts`). Tests: `src/features/auth/auth.test.tsx` (guest, logged in, logout, failed logout, unusable session check, return-path validation, popup login, blocked popup, canceled popup, ignored channel messages).
- **Phones:** the header's right side wraps to a second row when it doesn't fit (below 390 px for guests, at 390 px when logged in). No horizontal overflow from 320 px.

### Roadmap: backend changes for Favorites and Playlists

- **Allowed from the next phases:** narrowly scoped backend changes for Favorites and Playlists, each reviewed and approved by the user before it is made. Everything else in the backend stays off limits.
- **Needed:** Favorites has no model or routes. Playlists has a model, but `POST /api/playlist/create/:id` ignores the login (owner hardcoded to one user id, `ensureAuthenticated` imported but unused), reads `req.body.title`, never updates `user.userPlaylists`, and answers with a misspelled `succcess`. `GET /api/playlist/by-name/:name` returns anyone's playlist. There is no list, add/remove song, rename or delete.
- **Not doing:** browser-only (localStorage) Favorites or Playlists as a workaround.

### Backend security milestone (complete, committed: backend `2ab81b8`)

Backend changes, approved for this milestone only. Tests: `npm test` in `coverly_backend` (`test/security.test.js`, Node's built-in runner, models replaced by in-memory fakes; no database).

- **Roles:** guest (browse, play), user (later: own Favorites and Playlists), admin (catalog writes). Admins are the Google OAuth ids in the backend env var `ADMIN_OAUTH_IDS` (comma-separated). Unset or empty means nobody is admin (fail closed). Nothing in a request can grant admin.
- **`requireAdmin`** (`src/8-middlewares/authVerification.js`, reusing `ensureAuthenticated`): 401 for guests, 403 for non-admins. Applied to `POST /api/songs/add`, `/api/songs/add-ai`, `/api/artists/add`, `/api/tags/add`, `/api/tags/addBulk` and the whole `/api/admin` router.
- **CSRF** (`src/8-middlewares/requestSecurity.js`): POST/PUT/PATCH/DELETE with an `Origin` other than the frontend's get 403, and non-JSON bodies get 415. This is layered on `SameSite=lax`; routes still check the session for authorization.
- **Query injection:** Express uses the `simple` query parser, so query values are only strings or arrays of strings, never objects. `search-song` accepts only `title`, `lang` (one exact value) and tag/artist id fields (24-hex ids, repeatable); anything else is 400. `tags/getAll` ignores the request body. Artist and title searches escape regex text (`src/helpers/escapeRegex.js`). Mongoose `sanitizeFilter` was evaluated and not enabled: it would also neutralize the backend's own `$regex`/`$in`/`$all` filters unless each is wrapped in `mongoose.trusted()`.
- **Playlists:** `POST /api/playlist/create/:id` is disabled (401 for guests, 501 for users; the hardcoded owner is gone). `GET /api/playlist/by-name/:name` returns only public playlists, or the signed-in owner's private ones.
- **Shared origin constant:** `src/9-constants/frontend.js` (CORS, OAuth redirects, CSRF).
- **Admin setup:** `ADMIN_OAUTH_IDS` belongs in the **backend** `.env` (not the frontend's `.env.local`), then restart the backend (nodemon doesn't watch `.env`: type `rs`). Verified 2026-11-07: one id configured, it matches an existing user, and `requireAdmin` passes for that user.
- **Song imports** (`POST /api/songs/add-ai`, sent by hand, for example with curl or Postman: no import script exists) now need an admin session: log in through Coverly, copy the `connect.sid` cookie value, and send it as a `Cookie` header with `Content-Type: application/json`. Sessions last 24 h and end on every backend restart. Covered by `test/security.test.js`.

### Backend issues still open

- **Still open:** `errorMiddleware` statuses (every error is 500 with the raw message, including Joi validation errors), logout on `POST`.
- **Production:** session store (in memory now), `secure` cookies and `trust proxy`, origins from env (still hardcoded `http://localhost:5173`), rate limiting.
- **Pre-existing bugs found:** `/api/tags/add` lowercases `type` before checking it, so `coverGenre`, `subGenre` and `performanceStyle` tags can't be added. `POST /api/admin/songs/bulk` calls an `addAISongs` it never imports. `addSong` creates artists before validating. `GET /api/songs/getByName` reads a route param that doesn't exist.
- Fixed during MVP Phase 1: the unvalidated OAuth `from` (open redirect), the missing OAuth `state`, and the canceled login ending on a backend error page.

## Phase 4: Discover as a music app (current state)

**Direction (user, 2026-11-04):** Coverly should work like a music app in usability, navigation, browsing, search and playback, using Spotify as the reference for interaction quality, not as a visual template, and keeping Coverly's own look. **Homepage work is paused**: don't change the homepage, the carousel, playlists or community features. Original-versus-cover playback or comparison is still out of scope; finding covers by original artist is in scope.

### Decisions approved with the proposal

1. Plain text search matches titles, cover artists **and original artists**. Grouped suggestions let the reader pick an artist in one exact role.
2. A Now Playing panel, docked to the bottom of Discover only.
3. A list layout only, with no grid toggle.
4. Sorting by catalog order (the default) and title A–Z. "Recently added" was left out because `createdAt` isn't reliable: all 92 songs were bulk-imported within 21 minutes on 2026-10-31.

### What Discover has now (`src/features/discover/`)

- **Header** (`DiscoverPage`): a compact "Discover" `h1` with live totals ("92 covers · 79 cover artists · 45 original artists").
- **Sticky toolbar** (`Discover`), with z-index 8 so it sits under the page's grain overlay (z 9):
  - `SearchBox`: a WAI-ARIA combobox. Results update as you type. Suggestions are grouped Original artist / Cover artist / Song, with counts. The keys are ↑ ↓ Enter, and Escape (closes the list, then clears the text). Picking an artist turns the text into that role's filter.
  - `FilterBar`, on tablet and up: six menu buttons, each opening a panel of checkboxes with counts, a search field for long lists, Clear and Done. Escape or a click outside closes the panel and returns focus to its button.
  - `FilterSheet`, on phones: one "Filters" button opens a native `<dialog>` with the six groups as `<details>` and a "Show N covers" button.
- **The six groups** (`groups.ts`), named by role so they never blur together: Original artist (`songBy`), Cover artist (`artist`), Cover genre (`genre`), Subgenre (`sub`), Performance style (`style`), Mood (`mood`). "Acoustic" the subgenre and "Acoustic" the style are separate filters. `from` (original genre) stays link-only, for homepage collections, and shows as a chip.
- **Active filter chips** (removable, named by group) and Clear all. Clear all keeps the search text and the sort.
- **Results header**: a live count and a Sort select.
- **`SongRow`**:
  - On desktop: play, artwork, title and cover artist(s), the labelled original artist(s), cover genre tags with subgenres as text below, and Details.
  - On phones: artwork, title, cover artists, "Original · …", play and Details.
  - Artist names are buttons that add that role's filter.
  - Details lists all four label groups as tags that toggle their filter.
  - Missing values say "Not listed". There's no play button without a video ("No video").
  - The original genre is never shown on a row.
- **`NowPlaying`**:
  - A fixed panel with the YouTube embed at a minimum of 356×200 (YouTube requires at least 200×200, with nothing laid over the player). At 320px-wide screens it's 320×200, letterboxed.
  - It shows the title, cover artist and original artist, and a Close button.
  - It reserves its height as `body` bottom padding.
  - Only one recording plays at a time. Picking another replaces it; picking the same one stops it.
  - The playing row is marked (`aria-current`, a pink bar and title, Stop).
  - It keeps playing while filters change, and unmounts when you leave Discover.
- **URL**: `genre, sub, mood, style, artist, songBy, from, q, sort`.
  - Filter changes push a history entry.
  - Typing and changing the sort replace the current entry.
  - Refresh and direct links restore everything.
- **Shared logic** (`songs/discover.ts`): `artist` and `songBy` are now regular facets (filter and counts). The module also gains `suggest()`, `sortSongs()`, `parseSort()`, `fold()` and `countArtists(songs, role)`.

### Verified against the real catalog

The final pass (2026-11-04) ran 42 checks at 1440×900 and the same 42 at 390×844 (mobile goes through the filter sheet). All passed. Every expected value was computed independently from the raw API JSON, with labels formatted by the app's own `format.ts`. The pass covered:

- search by title, original artist and cover artist, plus both roles at once
- 11 label combinations
- 277 filter-panel counts
- Details for every one of the 92 songs, with no original genre leaking into a row
- refresh and Back/Forward
- play, replace, Stop, Close, and cleanup when leaving the page
- the 200×200 player minimum
- no overflow and no console errors

The script is not part of the repo; it lived in the session scratchpad.

Earlier spot checks:

Each combination was checked in Chrome against counts computed independently from the raw API JSON. In every case the count and the rendered rows matched.

| URL                             | Covers |
| ------------------------------- | ------ |
| `songBy=The Beatles`            | 10     |
| `artist=Taylor Swift`           | 5      |
| `songBy=Taylor Swift`           | 7      |
| `songBy=The Beatles&genre=rock` | 2      |
| `mood=nostalgic&style=acoustic` | 6      |
| `mood=nostalgic&sub=acoustic`   | 11     |
| `q=taylor`                      | 11     |
| `q=beatles`                     | 10     |

- `q=taylor` is 11, not 12, because "Back to December" credits Taylor Swift in both roles.
- With `songBy=The Beatles`, the Cover genre panel shows Rock 2, Pop 6, Folk 5, Jazz 2 and R&B and soul 1.
- The suggestions for "taylor" list both roles separately.
- Playback: one iframe at a time, replacement, the current-row mark, Close, and cleanup when leaving the page (iframe and padding removed).
- Refresh and Back/Forward walk the exact states, including the sort.
- No horizontal overflow at 1440 or 390.

### Persistent player in the application shell (implemented, awaiting review, not committed)

Requirement (user, 2026-11-05): playback continues across all in-app navigation, using one shared YouTube player owned by the app shell. It was built in three stages (A: state and IFrame API, B: shell and responsive placement, C: connecting every play action). The design, decisions, what was built, verification and limitations are in [`app-shell.md`](app-shell.md). The Discover version before this was committed as `dc3dafe`.

### Follow-up improvements (recorded, not started)

- **The Now Playing panel feels too large** (user feedback, 2026-11-04). Now covered by the player layout options in `app-shell.md`. Don't redesign it until asked. Any redesign must keep these constraints:
  - YouTube's minimum player size (200×200, with nothing laid over the player)
  - a visible Close control
  - results that scroll clear of the panel
  - cleanup when leaving Discover

  Today it's 225px tall on desktop and about 270px on a 390px phone. Options to discuss then: a slimmer info strip, putting the video beside the title on phones, or a user-chosen compact state that keeps the video visible.

### Open points

- At 320px wide, the **shared site header** overflows by 6px. It's outside Discover, so it was left alone.
- On phones the player takes about 270px of the screen. YouTube's minimum size makes that unavoidable while it plays. Close is always visible, and results scroll clear of it.
- Duet entries such as "Lady Gaga & Bradley Cooper" are single artist records in the backend, so they show and filter as one name.
- There are near-duplicate labels ("soft rock" and "soft-rock"); they are shown as stored.
- Fixtures: the song fixtures now have fictional original artists. Mara Quill is in both roles, and "acoustic" exists as both a subgenre and a style. `contract.test` and `discover.test` were updated to match.

## Phase 3B: homepage and Discover separated

Approved by the user before implementation, with these decisions:

- Keep "Pop songs, turned rock": original-genre metadata may drive themed discovery, but there are still no original-vs-cover comparisons.
- Remove the giant COVERLY title; branding lives in the header.
- Switch the homepage shelf to Piano-driven.

### Routes

All pages render inside `src/app/SiteLayout.tsx`:

- a sticky header with the wordmark (links to `/`), the tagline on desktop, and nav: Discover (`/discover`, `aria-current` when active), Moods (`/#moods`), Artists (`/#artists`)
- a skip link and `<main id="main">`
- the footer
- React Router's `ScrollRestoration`: new pages start at the top, Back and Forward restore the position, and hash links scroll to the section

The pages:

- `/` → `features/home/HomePage.tsx`, for browsing and inspiration. Its `h1` is "Coverly", visually hidden.
- `/discover` → `features/discover/DiscoverPage.tsx`, the search and filter page moved over from the old homepage.
- `/design` stays dev-only.

### Homepage, in order

1. **Collections carousel** (`home/CollectionsCarousel.tsx`), the focal point.
   - One collection per slide. Each slide shows:
     - a kicker naming the rule that picks the songs ("Songs by one artist", "Mood", "Sound", "Genre crossover")
     - the title in the new `type-display` role
     - a description
     - live counts ("10 covers · 12 cover artists")
     - "Explore the collection", a router link to `/discover?…`
     - "Play {first cover}", shown only when the collection has a playable cover. It plays in place, keeping the one-click rule, and a caption names the song and artist.
   - The artwork fans out three real thumbnails, printed in the slide's tint.
   - Navigation is always manual; nothing advances on its own:
     - Previous and Next buttons, which wrap around
     - a numbered contents strip (numbers on tablet, numbers and titles on desktop, a "02 / 06" counter on mobile)
     - left and right arrow keys
     - native swipe and trackpad through CSS scroll snapping, with no gesture library
   - Accessibility follows the WAI-ARIA carousel pattern:
     - slides out of view are `inert`
     - the active contents entry has `aria-current`
     - slide changes are announced in a polite live region
   - Changing slide stops any collection video.
   - Loading, error and retry states replace the carousel. If no collection qualifies, the hero says "Every song has another side" and links to browse everything.
2. **Moods:** links to `/discover?mood=…`.
3. **Piano-driven shelf:** on ink, built from the `piano-driven` label. "See all" opens Discover.
4. **Artists who keep coming back:** each one links to `/discover?artist=…`.
5. **The whole catalog:** a band with live totals and "Open Discover".

### Discover page

It keeps every earlier capability:

- search
- the Mood, Genre and "How it's played" facets, with OR within a group, AND across groups, and counts scoped to the other groups (a value with zero matches is disabled)
- a live result count, Clear filters, an empty state, Show more
- the collapsible filter panel on mobile
- one-at-a-time inline playback, and no play button without a video

New in this phase:

- A **Subgenre** facet (`sub`).
- **Pinned chips** for filters that arrive from links: cover artist (`artist`), "Songs first released by" (`songBy`, the original artist) and "Originally released as" (`from`, the original genre). There is deliberately no browsable list of original artists or genres.
- **History:** picking or clearing a filter pushes a history entry, so Back undoes it. Typing a search replaces the current entry, so Back doesn't replay every keystroke.
- **Cover-artist counts** are distinct by artist id (`countArtists`). A duet counts both artists, so a collection can have more artists than recordings: The Beatles has 10 covers and 12 artists, because "Hey Jude" and "I've Just Seen a Face" are duets.

### Collections: dynamic versus curated

- **Dynamic collections (built):** defined in `src/features/collections/collections.ts`. Each is a saved Discover query: an id, a kind, a title, a description with no numbers, and partial `Filters`.
  - `resolveCollections()` runs the same `filterSongs()` Discover uses, so membership, counts and "Explore" always agree.
  - A collection is hidden below `MIN_COLLECTION_SIZE` (6).
  - Artwork and play come from the collection's playable matches, in Discover's order.
- **Curated playlists (not built):** an explicit, ordered song selection.
  - The backend already has a `Playlist` model (name, createdBy, songs[], public), readable with `GET /api/playlist/by-name/:name`.
  - The database holds one playlist, "The Beatles Covers": 10 songs, exactly the set the `songBy=The Beatles` filter returns.
  - It needs its own page later, because a Discover query can't express a fixed order.
  - Don't use playlist creation: the route is unauthenticated and its owner is hardcoded.
  - No new playlist model is needed.

The live collections, verified in the browser, show the same count on the carousel and in Discover:

| Collection               | Query                              | Covers / artists |
| ------------------------ | ---------------------------------- | ---------------- |
| Covers of The Beatles    | `songBy=The Beatles`               | 10 / 12          |
| Nostalgic                | `mood=nostalgic`                   | 20 / 21          |
| Acoustic & stripped down | `sub=acoustic&style=stripped-down` | 14 / 14          |
| Pop songs, turned rock   | `genre=rock&from=pop`              | 18 / 15          |
| Covering Madonna         | `songBy=Madonna`                   | 10 / 10          |
| Soulful interpretations  | `mood=soulful`                     | 22 / 21          |

### Playback

- Playback state belongs to each page (`playingKey`), so only one video plays at a time.
- The player is `src/features/player/YouTubeEmbed.tsx`: a youtube-nocookie iframe that mounts only after a click and autoplays.
- There is no global player or queue.

### Deliberately excluded

- playlist creation and management
- auth
- temporary or dismissible editorial content

### Future idea (not implemented): "Highlight of the Day"

A temporary or dismissible editorial item that disappears after a set time or when dismissed. Before building it, decide:

- where dismissal is remembered (local storage versus an account)
- who writes the highlights and where they're stored (the backend has no model for it)
- how it avoids competing with the carousel as the focal point

Do not build timers, pop-ups or dismissal persistence until the user asks.

### Verified in the browser (headless Chrome, real backend)

- Full pages at 1440×900 and 390×844, with no horizontal overflow and no console errors.
- Carousel: buttons, the contents strip, arrow keys, swipe sync (counter, live region, inert), hover fan, play, and stop on slide change.
- Navigation: a homepage collection opens the right filtered results. Refresh keeps the filters, Back undoes one filter and then returns home, and Forward replays both. The tab title changes per page.
- Fixed while checking: the scroll track clipped the fanned artwork, so the fan now fits inside the art's own padding.

### Open points

- Autoplay in a real browser is still unconfirmed. Headless Chrome shows YouTube's own play button.
- Some catalog videos may have been removed from YouTube (for example "Iris" by NIKI). Their play button still shows.
- The labels have data-quality issues that show in the Subgenre facet:
  - near-duplicates such as "soft rock" and "soft-rock"
  - "acoustic" exists as both a subgenre and a style
  - "soul" exists alongside "r&b/soul"
  - Normalizing them is a data decision for the user.
- Every song has `approved: false`, so the site shows unapproved songs; filtering on approval would show nothing.
- On mobile, the Artists section is long, with 8 artists in one column.

## Architecture decisions and contracts

- **Songs feature (`src/features/songs`):**
  - `types.ts`: `CoverSong {id, title, artists, genres, subGenres, moods, styles, originalArtists, originalGenres, video | null, addedAt}`. The two original fields are **for filtering only**; never build comparison UI on them.
  - `contract.ts`: `parseSong`/`parseSongs` adapt the backend payload.
    - Invalid songs (no id, title or cover artist) are dropped, with a warning in dev.
    - Invalid labels are skipped.
    - Label names are lowercased.
    - `youtubeVideoId` accepts watch, youtu.be, embed, shorts and live URLs.
  - `api.ts`: `fetchCoverSongs()`. A payload that isn't a list throws `ContractError`, which is not retried.
  - `hooks.ts`: `useCoverSongs()` (query key `['songs']`, staleTime 5 min). Both pages share the cache.
  - `discover.ts`: holds the `Filters` type, with fields `genre`, `sub`, `mood`, `style`, `artist`, `songBy`, `from` and `q`. Also `filterSongs`, `facetCounts`, `countArtists`, `selectedCount`, `recurringArtists`, `songsWith`, URL (de)serialization, and `featuredSong`, which is now unused but kept. All filtering happens client-side.
  - `format.ts`: display helpers for titles, names and labels.
  - Shared components: `CoverArt` (takes an optional `tint` override), `SongCard`, `tint.ts`.
- **Discover feature (`src/features/discover`):** `DiscoverPage`, `Discover` (the panel), and `useFilters` (URL state; exports `discoverHref` and `DISCOVER_PATH`).
- **UI:** `buttonClasses()` lives in `src/ui/buttonClasses.ts`, so router `Link`s can look like buttons. Also new: `ButtonIcon`, `ArrowIcon`, and the `type-display` role (`--text-display` token).
- **Backend contract used** (read-only; never modify `/Users/coding/Desktop/coverly_backend`):
  - Endpoint: `GET /api/songs/all-songs`, which returns `{success, message: Song[]}` with populated songs.
  - Song fields: `_id`, `title`, `artist.coverArtist[]`, `artist.original[]`, `genres.cover[]`, `genres.original[]`, `subGenre[]`, `mood[]`, `performanceStyle[]`, `links[{url, platform, timeStamp}]`, `createdAt`.
  - The backend runs on port 4000. CORS allows only `http://localhost:5173` with credentials, which is why Vite uses `strictPort` on 5173.
- **Mocking:**
  - MSW groups are `recordings, songs, auth, artists, tags`.
  - The dev default is `recordings`, so songs come from the real backend in dev.
  - Tests run with every group enabled. Song fixtures are fictional and too small for any real collection, so the homepage tests serve a larger catalog built from them.
- `src/main.tsx` renders the app even if MSW fails to start.
- **Thumbnails** load from `i.ytimg.com`, and the embeds use `youtube-nocookie.com`. No images were copied into the repo, and no dependencies were added.

## Uncommitted changes (Phases 2C and 3, all unstaged)

**Modified:**

- `.env.example` (API port 4000, list of mock groups)
- `.gitignore`: the `songsJSON.json` line was added by the user, not by Claude
- `src/app/routes.tsx`
- `src/main.tsx`
- `src/mocks/groups.ts`, `groups.test.ts`, `index.ts`, `partialMocking.test.ts`
- `src/styles/theme.css`, `utilities.css`
- `src/ui/Dissolve.tsx`, `Icons.tsx`

**Deleted:** `src/app/Placeholder.tsx`

**New:**

- `CLAUDE.md`
- `docs/design-system.md`, `docs/redesign/progress.md`
- `src/app/routes.test.tsx`
- `src/design/`
- `src/app/SiteLayout.tsx`, `src/lib/useDocumentTitle.ts`
- `src/features/home/`, `src/features/discover/`, `src/features/collections/`, `src/features/player/`, `src/features/songs/`
- `src/ui/buttonClasses.ts`
- `src/mocks/fixtures/songs.ts`, `src/mocks/handlers/songs.ts`
- the new `src/ui/*` primitives and their tests

`docs/design_refs/` and `docs/songs_json/` belong to the user.

**Local only:** `.env.local` sets `VITE_API_BASE_URL=http://localhost:4000`.

## Test and check results (last run 2026-11-04, after Phase 3B)

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run format:check`: pass
- `npm test`: 20 files, 149 tests, all pass. The new and updated ones are:
  - `discover/DiscoverPage.test.tsx`
  - `home/HomePage.test.tsx`
  - `collections/collections.test.ts`
  - additions to `songs/discover.test.ts` and `songs/contract.test.ts`
- `npm run build`: pass. `/design` is excluded from the production bundle.

## Remaining tasks

1. Get the user's review of Phase 3B, or apply their feedback.
2. Commit Phases 2C and 3/3B only when the user says to. The user may want separate commits.
3. Confirm autoplay in a real browser.
4. Later, each only when the user asks or the backend supports it:
   - a curated playlist page (read-only, using the existing model)
   - cover-artist pages
   - normalizing the label data
   - "Highlight of the Day"
   - server-side pagination and search

## Instructions for the next session

- Do not commit or push without explicit approval.
- Work only in `/Users/coding/Desktop/coverly_new`. Never modify the old frontend (`/Users/coding/Desktop/coverly`). Never modify the backend, except narrowly scoped, user-approved changes for Favorites and Playlists (see "Roadmap: backend changes for Favorites and Playlists").
- Don't add unnecessary dependencies, and don't copy Pinterest or reference images into production.
- No fake functionality: never show a control that can't work, including play buttons without a video.
- No global player, queue or persistent player. Page-local playback only.
- Keep the Phase 0/1 contracts, fixtures, hooks and tests intact.
- Use they/them for the user.
- **To run the app locally:**
  1. Start MongoDB.
  2. Run `node server.js` in `coverly_backend` (port 4000).
  3. Run `nvm use && npm run dev` in this repo (port 5173, strict).
- **For browser verification**, use headless Chrome over the DevTools protocol at 1440×900 and 390×844. Check that `document.documentElement.scrollWidth === clientWidth`.
- After any change, run all five checks.
