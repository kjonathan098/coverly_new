# Coverly 2.0 roadmap

Last updated: 2026-11-08. Detailed status and handoff notes: `docs/redesign/progress.md`.

## Done (MVP)

- Discover: search, six filter groups, list, URL state.
- One persistent YouTube player in the app shell; artwork is the play button everywhere (`PlayableCoverArt`).
- Home (Explore covers, moods, same-song pairs, Playlists by Coverly) and Magazine (editorial features, then the featured collections carousel and Artists who keep coming back).
- Google login in a popup (server-side sessions), and the backend security milestone (admin-only catalog writes, CSRF guard, query hardening).
- Favorites; private playlists and Your Library; official Coverly playlists (public, admin-managed).
- Artist profiles at `/artists/:id`.
- Now Playing information: full titles and labelled cover and original artists (desktop design approved).
- Magazine cover entrance (full-screen cover, "Open this issue" anchor) and Banger of the Week, the issue's first feature (configured in `magazine/bangerFeature.ts`).
- Who Covered It Better? (Magazine voting showdown, approved design): one curated matchup in the backend config, persistent votes in their own collection, labelled sample results for the MVP (manual switch).
- One Word, Five Songs (Magazine lyric game): a curated backend answer bank, exact phrase matching, artist hints, scoring in the browser; compact two-page design that adapts to the player column.
- Nokia love song (Magazine): a Y2K pop-collage mini-poster around the red Nokia, featuring Chris Holsten's "Dilemma" from the catalog; the pink heart plays it in the shared player.

## Next: Responsive design milestone (deferred, not started)

Decided 2026-11-07: mobile player optimization waits for a dedicated responsive-design milestone. No mobile UI changes until then.

- The phone player bar now grows with long titles and several artists (the full information wraps instead of being cut off). It needs a compact phone layout, designed separately.
- The broader mobile redesign postponed earlier (see `CLAUDE.md`, "Mobile UI") belongs to the same milestone.
- Until then, phones keep basic usability: working navigation and playback, no horizontal overflow from 320px.

## Open decisions

- When to switch off the showdown's sample results (`SHOW_DEMO_RESULTS` in the backend's `matchups.js`): the user decides once real participation is enough.
- Desktop player layout A or B (dev-only switch, `?player=`). Production uses A; the user leaned toward B.

## Later (ideas, not commitments)

- Magazine features: Original vs. Cover, Cover vs. Cover, Behind the Song, Creator Spotlight, Suggest a Cover.
- One Word, Five Songs: more challenges and rotating words, more accepted lyric phrases, more flexible answer recognition, admin challenge management, optional persistent scores or leaderboards.
- Coverly playlists as Magazine collections.
- A quicker way to save while browsing (hover controls or a menu), if users need it.
- A backend artist endpoint once the catalog is paginated or artists get real profile data.
- Backend hardening before a public launch: see "Backend issues still open" in `progress.md`.
