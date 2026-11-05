# Coverly application shell: persistent player (proposal)

Status: **implemented (stages A–C), awaiting review, not committed** (2026-11-05). It replaces "Playback is page-local; no global player or queue" from the Phase 0 plan and CLAUDE.md.

## Requirement

Playback continues across every in-app navigation. A recording stops or pauses only when:

- the listener stops or pauses it explicitly,
- another recording is selected (it replaces the current one in the same player), or
- it ends naturally.

A route change must never restart, pause or destroy the player. The video stays visible and usable while it plays, within YouTube's rules. There's no hidden or audio-only playback, and no queue or auto-advance.

## What exists today

| Where           | Who owns playback                                                                                        | What happens on navigation                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/discover`     | `DiscoverPage` state, plus the `NowPlaying` panel                                                        | The page unmounts, so the iframe is destroyed and playback stops. Switching songs remounts the iframe (`key={song.id}`), so each switch is a new player load. |
| `/` carousel    | `HomePage` `playingKey`. The video plays inside the slide's front artwork (`CoverArt` → `YouTubeEmbed`). | It stops on route change. Changing slide also stops it, on purpose.                                                                                           |
| `/` piano shelf | The same `playingKey`. The video plays inside the card artwork.                                          | It stops on route change. It's a separate iframe from the carousel's.                                                                                         |
| `/design` (dev) | Demo state only, with no embed                                                                           | `/design` is a sibling route outside `SiteLayout`, so navigating there would also unmount any player in `SiteLayout`.                                         |

Other limits today:

- The player is a plain `<iframe>`, so Coverly can't tell whether the video is playing, paused, ended or failed. If the listener pauses using YouTube's own controls, our "playing" state is wrong.
- Space for the panel is reserved by writing `document.body.style.paddingBottom`.

## YouTube constraints (checked against the official pages, 2026-11-05)

Source: [Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality) and the [IFrame Player API reference](https://developers.google.com/youtube/iframe_api_reference).

- **Size:** "Embedded players must have a viewport that is at least 200px by 200px". If controls are shown, the player must be large enough to display them fully. YouTube recommends at least 480×270 for 16:9. At 16:9, 200px tall means **356×200 is the smallest compliant player**. That's the floor for every layout below.
- **Overlays:** nothing may be displayed in front of, or obscure, any part of the player or its controls. Our close and transport controls therefore always sit beside the video, never on it.
- **Autoplay:** a client "must not initiate an automatic playback until … more than half of the player is visible". Also, there can be at most one auto-playing player on a page or screen. A single shell player satisfies both.
- **Switching recordings:** `loadVideoById(videoId, startSeconds)` loads and plays a new video in the existing player. `cueVideoById` loads it without playing. `destroy()` removes the iframe.
- **State:** `onStateChange` reports, among others, ended (`0`), playing and paused. `onError` reports 2 (bad parameter), 5 (HTML5 error), 100 (video not found or removed), 101 and 150 (embedding not allowed) and 153 (missing referrer). Error 100 would finally let us handle the removed videos in the catalog honestly.
- **Not documented:** an option to use the privacy-enhanced `youtube-nocookie.com` host with the API. The `host` option is in common use but isn't on the reference page. It needs a test, with `youtube.com` as the fallback (decision 2).
- **Embeds must send an HTTP `Referer`.** Ours do, via `strict-origin-when-cross-origin`.

Browser behaviour (not from YouTube's docs): **moving or re-parenting an `<iframe>` in the DOM reloads it**. So the player element must never move; every layout change below is CSS only.

## Architecture

### 1. One root layout that never unmounts

```
<RouterProvider>
  AppShell (root layout route; wraps every route, including /design)
  ├─ SiteHeader
  ├─ shell grid
  │   ├─ <main id="main"><Outlet /></main>   ← pages change here
  │   └─ <PlayerHost />                       ← mounted once, never moves
  ├─ SiteFooter
  └─ ScrollRestoration
```

- `SiteLayout` becomes `AppShell`, the single root route. `/design` moves under it, so no in-app route ever unmounts the shell.
- Route error boundaries go on the child routes, not the root, so a page error can't take the player down.
- `PlayerHost` is outside `<Outlet />`. React Router keeps a layout route mounted while its children change, so the player survives every navigation.
- **Full page loads still end playback**: a refresh, a new tab, an external link, and later the Google OAuth redirect. All in-app links already use router `<Link>`s, and new ones must too.

### 2. One YouTube player instance, never moved

- `PlayerHost` renders one stable container element. On the first play it loads the IFrame Player API on demand: a script from `youtube.com`, not an npm dependency. It then creates one `YT.Player` in that container.
- **Selecting another recording calls `loadVideoById({ videoId, startSeconds })` on the same instance.** There's no new iframe and no remount.
- **Close** calls `destroy()`, so a stopped player doesn't sit in the page. The next play creates a fresh instance. There is never more than one.
- **Rules that keep it from remounting:**
  - Every presentation (dock, floating, bar, compact or expanded) is a class change on the same element.
  - Never render a different component per breakpoint.
  - Never put the player in a portal.
  - Never wrap the player in a conditional parent.
  - Never use a `key` that changes per song.
- **Inline players are removed.** The carousel and shelf artwork stop embedding video. A second iframe would break both "one player" and YouTube's one-autoplay rule.

### 3. Shared playback state

This is a small store read through `useSyncExternalStore`, with no new library. Rows subscribe to their own song only, so playing a song doesn't re-render a 92-row list.

```ts
type Playback = {
  song: CoverSong | null // a snapshot, so the player doesn't depend on the current page's data
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'unavailable'
  error?: 'removed' | 'not-embeddable' | 'other' // from onError 100 / 101, 150 / anything else
}

// Actions, callable from any page:
play(song) // another song: replace it in the same player. The same song: pause or resume.
pause() / resume()
close() // the explicit stop: destroys the player and hides it

// Hooks:
usePlayer() // the player's own UI: state and actions
usePlaybackOf(songId) // 'playing' | 'paused' | 'ended' | 'loading' | null, for any row, card or slide
```

- **Status comes from YouTube's events**, not from our guesses. If the listener pauses in YouTube's controls, every row shows "Paused".
- **Ended:** the player stays visible on the ended state with Replay and Close. Nothing plays next (decision 4).
- **Unavailable** (errors 100/101/150): the panel says "This video can't be played here" and links to "Watch on YouTube". It never pretends to play.
- **The current recording is marked wherever it appears:** Discover rows, homepage shelf cards, the carousel slide whose first cover it is, and future artist pages. The marks are a pink title, a "Playing" or "Paused" badge with an equalizer (static under reduced motion), `aria-current`, and the button state (Play, then Pause, then Resume).
- **Announcements:** a polite live region says "Now playing Blackbird, covered by Jon Batiste". Focus stays where the listener clicked.

### 4. Space reservation

- The shell owns the space, using grid or padding on `<main>`. Pages and `document.body` are never touched.
- The space is reserved only while a recording is loaded, so a closed player costs nothing.

## Layout alternatives

Footprints are for a loaded player. The video is never below 356×200.

### A. Right dock, shown only during playback

```
1440 × 900                                               dock: 400px, full height under header
┌──────────────────────────────────────────────┬───────────────────┐
│ COVERLY                 Discover Moods Artists│                   │
├──────────────────────────────────────────────┤ ┌───────────────┐ │
│ Discover                                      │ │  video 368×207 │ │
│ [ search                                    ] │ └───────────────┘ │
│ [Original artist][Cover artist][Genre]…       │ Blackbird         │
│ ▶ ▣ Mirrors    Boyce Avenue   Orig. J.T.  …   │ Jon Batiste       │
│ ▶ ▣ Good Luck  Sabrina C.     Orig. Chappell  │ Original · Beatles│
│ ❚❚ ▣ Blackbird  Jon Batiste  ← playing        │ ❚❚ Pause   ✕ Close│
│ ▶ ▣ …                                         │ Jazz · Folk · Soul│
│                                               │ More by Jon Batiste│
│  content reflows to 1040px                    │ More Beatles covers│
└──────────────────────────────────────────────┴───────────────────┘
```

- **Pros:** never covers content, and has room for the song's details and "find more" links into Discover. It's the most "music app" layout, and costs nothing when nothing is loaded.
- **Cons:**
  - The content reflows by 400px when playback starts or stops, which shifts the layout. Scroll position needs anchoring.
  - Pages use viewport breakpoints today, so a 1040px content area would still get "desktop" rules sized for about 1344px. Doing this properly means moving page layouts to **container queries** (Discover rows, homepage grids), which is a real refactor.
  - Only works at ≥1280px. At 1024px, content would be 624px wide.

### B. Floating player, corner card

```
1440 × 900: card ≈ 390 × 290 (≈ 9% of the screen)        1024 × 768: same card (≈ 14%)
┌────────────────────────────────────────────────────┐    ┌──────────────────────────────┐
│ COVERLY                    Discover Moods Artists   │    │ COVERLY      Discover …       │
├────────────────────────────────────────────────────┤    ├──────────────────────────────┤
│ Discover                                            │    │ Discover                     │
│ [ search                                          ] │    │ [ search                   ] │
│ ▶ ▣ Mirrors      Boyce Avenue   Orig. J.T.   Det.   │    │ ▶ ▣ Mirrors   Boyce Avenue   │
│ ❚❚ ▣ Blackbird    Jon Batiste    Orig. Beatles      │    │ ❚❚ ▣ Blackbird Jon Batiste    │
│ ▶ ▣ Let It Be    JP Cooper ┌──────────────────────┐ │    │ ▶ ▣ Let It ┌───────────────┐ │
│ ▶ ▣ In My Life   Plain View│  video 356×200       │ │    │ ▶ ▣ In My  │ video 356×200 │ │
│ ▶ ▣ Something    Billie E. │                      │ │    │ ▶ ▣ Someth │               │ │
│ ▶ ▣ …                      ├──────────────────────┤ │    │            ├───────────────┤ │
│                            │Blackbird · Jon Batiste│ │    │            │Blackbird  ❚❚ ✕│ │
│                            │❚❚  ⇆ side   ✕ Close  │ │    └────────────┴───────────────┘─┘
└────────────────────────────┴──────────────────────┘─┘
```

- **Pros:**
  - No reflow, and no layout refactor; it works with today's breakpoints.
  - Cheapest to build.
  - A "move to the other side" toggle (CSS only) lets the listener uncover what they're reading.
- **Cons:**
  - It always covers a corner. Rows at the bottom right, such as Details, hide until scrolled; the shell adds bottom padding so the last content can scroll clear.
  - On tablets it covers proportionally more.

### C. Bottom bar (today's panel, moved into the shell)

- About 225px tall at 1440×900, which is 25% of the height. At 390×844 it's about 270px (32%). This is the "too large" feedback.
- 200px of that height is the YouTube minimum, so a full-width bar can never be shorter than about 216px with a compliant video. Better as the phone layout than the desktop one.

### D. Phones (< 720px): every option becomes a bottom bar

A 356px-wide player is nearly the whole phone width, so a floating card or a dock are the same thing as a bar.

- **D1, full-width video plus a slim title strip** (recommended): 16:9 at 356–390px wide (200–219px tall), with one 48px row above it for the title, Pause and Close. That's about 250px on a 390×844 screen (≈ 30%). The results scroll clear of it.
- **D2, a 200×200 square player beside the title and controls:** about 216px tall. It's compliant, but the picture is letterboxed to about 200×113, and YouTube's controls get cramped at 200px wide. That risks the "controls fully displayed" rule. Not recommended.
- **Rejected:** docking the player at the top under the header. Header (56px), player (200px) and Discover's sticky toolbar (about 70px) would take about 330px of chrome.

### Footprint comparison

| Screen                    | A. Right dock                                 | B. Floating card                               | C/D. Bottom bar               |
| ------------------------- | --------------------------------------------- | ---------------------------------------------- | ----------------------------- |
| Desktop 1440×900          | 400px column, no overlap; content 1040px wide | ≈ 390×290, ≈ 9% of the screen, covers a corner | ≈ 1440×225, 25% of the height |
| Laptop 1280×800           | 400px column; content 880px wide              | ≈ 11%                                          | 28%                           |
| Tablet landscape 1024×768 | too narrow (content 624px)                    | ≈ 14%                                          | 29%                           |
| Tablet portrait 820×1180  | not suitable                                  | ≈ 12%                                          | 19%                           |
| Phone 390×844             | not suitable                                  | becomes a bar                                  | ≈ 250px, 30% (D1)             |

### Recommendation

The layout follows the screen width. All three are CSS classes on the same `PlayerHost` element, so resizing never reloads the video.

| Width      | Layout                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| ≥ 1280px   | **A. Right dock, shown only while a recording is loaded.** Requires container queries for page content. |
| 720–1279px | **B. Floating card,** bottom right, with a side toggle.                                                 |
| < 720px    | **D1. Full-width video with a slim title strip.**                                                       |

If the container-query refactor isn't wanted now, use **B everywhere from 720px up** and add the wide-screen dock later. Nothing else in the architecture changes.

## What changes when this is built

1. **Shell:**
   - `AppShell` becomes the root route, with `/design` under it and error boundaries on the child routes.
   - New: `PlayerProvider` and its store, and `PlayerHost` with the lazy YouTube API loader. All of them live in `src/features/player/`.
2. **Discover:**
   - Remove the page's playback state and `NowPlaying`.
   - Rows call `play(song)` and show `usePlaybackOf(song.id)`.
3. **Homepage**, which is paused and needs your OK:
   - Carousel and shelf play buttons call the shared player.
   - `CoverArt` no longer embeds video; it shows the playing or paused badge instead.
   - Remove the carousel rule that stops playback on slide change, since it conflicts with persistence.
4. **Layout:** the chosen variants as CSS on `PlayerHost`, plus container queries if the dock is approved.
5. **Tests:**
   - unit tests for the store
   - a shell test that starts a song on `/discover`, navigates to `/` and back, and asserts the **same iframe element** is still in the document, there's exactly one, and the YouTube API wasn't re-created (YT mocked)
   - a test that switching songs calls `loadVideoById`, not a remount
   - Browser check: count the iframe's `load` events across navigations (a reload would add one), plus the usual desktop and mobile screenshots.

## Decisions for the user

1. **Layout:**
   - the recommended mix: dock ≥ 1280px, floating 720–1279px, bar on phones
   - floating everywhere from 720px up, adding the dock later
   - or something else
2. **YouTube IFrame Player API:**
   - Needed for in-place switching, real playing, paused and ended state, and error handling.
   - It loads a script from youtube.com.
   - The `youtube-nocookie.com` host isn't documented for the API. I'd test it and fall back to `youtube.com` if it doesn't work.
3. **Homepage changes:** the homepage is paused, but its inline players have to go for "one player everywhere". OK to change its play behaviour, and to drop "stop on slide change"?
4. **When a video ends:** keep the player visible with Replay and Close (recommended), or close it automatically?
5. **Button semantics:** a row's button on the current song becomes Pause and Resume, and Close is the only full stop. OK?
6. **Later, not now:** restore what was playing after a page reload, paused and cued (browsers and YouTube's rules forbid autoplaying it).

## Implementation notes (2026-11-05)

### Decisions (user)

1. **Layout:** adaptive.
   - The right dock starts at **1536px** (new `wide` breakpoint, `--breakpoint-wide: 96rem`), not 1280.
   - Below that, from 720px: a floating card.
   - On phones: a full-width bar.
2. **IFrame Player API approved, keeping privacy-enhanced mode.** Tested 2026-11-05 in Chrome against real YouTube on `youtube-nocookie.com`:
   - events fire, `loadVideoById` switches videos in the same iframe, and pause and resume are reported back
   - The domain is unchanged.
   - Catalog music videos refuse to embed with error 150 on IP-address origins (`127.0.0.1`) **on both hosts**. That's a YouTube restriction, not a privacy-mode one. Use `localhost` in development.
3. **Homepage:** its separate players were replaced by the shared player, and changing carousel slides no longer stops playback. Nothing else changed.
4. **Video ending:** the player stays visible with Replay and Close.
5. **Controls:** Pause and Resume follow YouTube's events. Another recording replaces the current one, and Close destroys the player.
6. **Reload persistence:** deferred.

### What was built

**Stage A, `src/features/player`:**

- `youtubeApi.ts`: loads the API on first play and types it by hand.
- `playback.ts`: the store (`useSyncExternalStore`) and the engine. It owns the single `YT.Player`, maps YouTube's events to Coverly's status, and provides `play`, `pause`, `resume`, `replay`, `close`, `usePlayback`, `usePlaybackOf` and `playVerb`.
- `src/test/fakeYouTube.ts`: a stand-in for the API, installed for every test.

**Stage B, the shell:**

- `src/app/AppShell.tsx` (formerly `SiteLayout`) is the only root route, with `/design` under it. `RouteError` handles page errors and 404s inside the shell.
- `PlayerPanel.tsx` is one `<aside>` that changes only through CSS:
  - phones: a fixed bottom bar, video 16:9 at full width (at least 200px tall)
  - from 720px: a floating card, 356×200 video, with a side toggle
  - from 1536px: a sticky column 400px wide (368×207 video) with labels and "More covers by…" links
- `--player-inset` holds the measured height the floating player covers. It sets the page's bottom padding, and caps the height of Discover's filter panels and suggestion list.
- The phone filter sheet is now a non-modal dialog that ends above the player, with the page (`data-shell="page"`) made inert. A modal's backdrop would sit in front of the video.

**Stage C, connected:**

- Discover rows, homepage shelf cards and the carousel all call `play(song)`.
- `PlaybackBadge` marks the current recording: Playing, Paused, Finished or Can't play here.
- Removed: `YouTubeEmbed.tsx`, Discover's `NowPlaying.tsx`, and inline playback in `CoverArt`.

### Verified

**Unit and integration tests** (`npm test`, 195 tests):

- the store and engine
- Discover playback
- the carousel keeping playback across slides
- the shell keeping **the same iframe element** through navigation to Home, a filtered Discover URL, Back/Forward, a 404 and `/design`
- replacing the recording from another page
- the phone sheet leaving the player usable

**Real Chrome, real YouTube.** The scripts were scratchpad tools, not in the repo.

- 25 persistence checks:
  - Through every in-app navigation (wordmark, nav links, Back, Forward), the iframe loaded **once** and the playhead kept advancing.
  - Switching songs happened in the same iframe.
  - Resizing between 1680 (dock), 1440, 1100 and 820 (floating) and 390 (bar) never reloaded it. At every size the video was at least 200×200 with nothing over it and no horizontal overflow.
  - Clicking inside YouTube's own video paused it, and Coverly's row and player showed Paused.
  - Close removed the player everywhere.
- 8 homepage checks:
  - The carousel plays in the shell, with no iframe in the slide.
  - Changing slides keeps it playing.
  - A shelf card replaces the recording in the same iframe.
  - Slides and cards show the current recording.
- 11 clearance checks:
  - At 1100×800, the filter panels and suggestions end above the floating card.
  - The header and Discover's toolbar are never covered.
  - The phone filter sheet ends above the player, which stays visible and clickable.
  - The end of the page scrolls clear of it.
- Discover's search, filter counts, Details and URL behaviour re-verified against the live catalog: 33 of 33 checks at 1440×900 and at 390×844.

### Known limitations

- **The floating card and the phone bar cover a corner or strip of scrollable content until it's scrolled.** For example, on the homepage at 1440×900 the card sits over the carousel's Next button and the last two collection names on first view. Nothing becomes unreachable:
  - the page has bottom padding equal to the player
  - Previous wraps around
  - the arrow keys and contents entries still work
  - the floating card can be moved to the other side

  The header and Discover's search and filters are never covered. Options if this needs more: start the dock at 1280px, or a compact paused state.

- **Full page loads still end playback:** refresh, a new tab, external links, and later the OAuth redirect. Restoring the last recording after a reload is deferred.
- **iOS and Safari autoplay rules may need a tap on YouTube's own play button** for the first video. The player handles `onAutoplayBlocked` as Paused. This hasn't been tested on a real iPhone yet.
