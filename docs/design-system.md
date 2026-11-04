# Coverly design system (Electric Pop)

How Coverly looks and why. Follow these rules when building pages; change them only with design approval.

- Living reference: run `npm run dev` and open <http://localhost:5173/design> (development only).
- Approved prototype it was translated from: `design-experiments/2b-homepage/` (exploratory, not production code).

## Product principle: music first

Coverly looks like a magazine but is music-first. A reader must be able to start the featured music with one click from the homepage, without navigating anywhere. The collections carousel does this with its “Play” button, which plays the collection’s first cover in place.

## Where things live

| What                                                             | Where                                                   |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| Tokens (color, type, space, radius, shadow, motion, breakpoints) | `src/styles/theme.css` (`@theme`)                       |
| Surface variables, base element styles, reduced motion           | `src/styles/base.css`                                   |
| Type roles (`type-*`), `grain`, `halftone`, `dissolve` utilities | `src/styles/utilities.css`                              |
| Primitives                                                       | `src/ui/` (import from `src/ui`)                        |
| Living design system page                                        | `src/design/DesignPage.tsx`, route `/design` (dev only) |

Tailwind's default palette, fonts, sizes, radii, shadows and breakpoints are removed on purpose. If a value is not in `theme.css`, it is not part of the system; add a token rather than an arbitrary one-off.

## Surfaces: ink and paper

**Reading happens on paper; listening happens on ink.**

- **Ink** (`#15121D`) holds covers, featured artwork and everything to do with listening (versions, players, exploration).
- **Paper** (`#F6F1EB`) holds stories and long-form reading.
- Switch with `<Surface tone="ink" | "paper">` or `<Section tone=…>`. Children read colors from the surface, so the same component works on both: use `text-fg`, `text-fg-soft`, `text-accent`, `bg-surface`, `bg-raised`, `border-line`.
- In arbitrary values, use the live variables (`var(--surface-line)`, `var(--surface-fg)`), never `var(--color-line)`: theme variables resolve once at the root and would always give the ink value.
- Where ink meets paper, put a `<Dissolve to="paper" | "ink" />` band. Never a hard edge.
- `grain` adds print texture. If one paper section has grain, its neighbors need it too, or the seam shows.

## Color

| Token                    | Hex                       | Role                                                |
| ------------------------ | ------------------------- | --------------------------------------------------- |
| `ink`, `ink-2`, `ink-3`  | #15121D, #1F1A2B, #2C2640 | Ink field, raised surfaces, lines and idle controls |
| `paper`, `paper-2`       | #F6F1EB, #EBE3D8          | Paper field, shade                                  |
| `pink`                   | #FF3E8F                   | Primary: the main action, originals, highlights     |
| `blue`                   | #3159FF                   | Secondary: far echoes, screens, rays                |
| `turquoise`              | #1ED6C1                   | Tertiary: near echoes, labels on ink, comparison    |
| `indigo`                 | #221A4D                   | Halftone, shadow plates                             |
| `ink-soft`, `paper-soft` | #CFC8DC, #4D4757          | Secondary text on ink, on paper                     |
| `pink-ink`, `link-ink`   | #C8125E, #2342D9          | Pink labels and links on paper                      |

- Accents are inks, not fields: no accent fills more than about a quarter of a screen. Large backgrounds are ink or paper. No yellow.
- Never use `pink` as small text on paper (2.9:1) or `blue` as small text on ink (3.5:1). The surface accent (`text-accent`) already picks the safe variant.
- **Every version has a color.** The original is always `ORIGINAL_COLOR` (pink). Covers use `versionColor(index, count)`, turquoise to blue in the order they were recorded. Use the same color for a version everywhere: its echo, its row accent, its sleeve.

## Typography

| Utility                                | Face                                | Use                                                                                                                                      |
| -------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `type-lettering`                       | Bagel Fat One                       | The B-side: wordmark flip, short artwork lettering. One or two per screen, never under 18px, never for paragraphs, buttons or navigation |
| `type-wordmark` + `text-masthead`      | Bricolage 800, 88% width, uppercase | The masthead only, via `<Wordmark>`                                                                                                      |
| `type-display`                         | Bricolage 780, 80% width            | The one featured title on a page, such as a collection in the homepage carousel                                                          |
| `type-headline`                        | Bricolage 760                       | Cover headlines                                                                                                                          |
| `type-section`                         | Bricolage 760                       | Section titles                                                                                                                           |
| `type-card`                            | Bricolage 740                       | Story card titles, featured recordings                                                                                                   |
| `type-row`                             | Bricolage 650                       | Recording rows, small titles                                                                                                             |
| `type-lead`, `type-body`               | Schibsted Grotesk                   | Summaries; body text. Articles: max ~68ch, use `max-w-reading`                                                                           |
| `type-label`, `type-meta`, `type-chip` | Schibsted Grotesk                   | Labels, metadata, tags                                                                                                                   |

- Sentence case everywhere. Uppercase exists only in the wordmark.
- No single-word emphasis in headlines (one word in another color or style).
- Labels name content types (Interview, Essay, Discover). They carry information, not decoration.
- Use `tabular-nums` only on times and counts; in Schibsted it also widens periods and commas.
- Fonts load from Google Fonts in `index.html` (all SIL OFL). Self-host subsets before launch.

## Components (`src/ui`)

| Component                         | Use                                          | Notes                                                                                                         |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Surface`, `Section`, `Container` | Page structure                               | `Container` sizes: `full` (margins only), `page` (72rem), `reading` (42rem)                                   |
| `Dissolve`                        | Between ink and paper                        | `to` is the next surface                                                                                      |
| `SectionHeading`                  | Top of a section                             | Optional `label` (only when informative) and `intro`                                                          |
| `Button`, `ButtonLink`            | Actions; navigation styled as buttons        | `primary` (one per view, carries the echo shadow), `secondary`, `quiet`; `md` (44px) or `lg`                  |
| `Tag`, `TagList`, `ToggleTag`     | Recording labels; filters                    | Shape carries the type: genre filled, performance style outlined, mood dashed. Screen readers hear "Genre: …" |
| `EditorialCard`, `ArtPanel`       | Stories on paper                             | The story brings its own art; the text block is fixed. The whole card is one link                             |
| `RecordingTile`                   | A recording, as a `row` or a `feature` panel | Generated `Sleeve`, role label from explicit links only                                                       |
| `Sleeve`                          | Artwork when no image exists                 | A halftone in the version color, with the year                                                                |
| `Wordmark`                        | The publication name                         | `bar` or `masthead`; letters flip to their B-side on hover                                                    |

Conventions:

- Primitives are small and presentational. They take domain types (`Recording`, `Tag`) but never fetch data.
- Variants are string props. Don't add a variant until two real uses need it.
- Every interactive element is a native `button` or `a`, at least 44×44px, with the global focus ring.

### Playback rule

Never show a control that cannot work.

- `source: null`: the tile says "No playable source yet". No play button, no disabled play button.
- A source and an `onPlay` handler: a play/pause toggle with `aria-pressed` and a label naming the recording.
- A source without a handler: a plain "Watch on YouTube" link.
- There is no global player, queue or persistent player. A page that plays music owns its state and passes `onPlay`/`playing` down.

## Artwork and editorial composition

- **The publication stays; the artwork changes.** Constant: masthead, slug, ink frame, cover-line strip, type, palette, echoes, halftone, grain. New each issue: the subject, the field shapes, which device leads. The headphone listener belongs to one story; it is never a logo or mascot.
- **Planes.** Field, then echoes, then masthead, then subject, then details, then text. A cover shows at least three at once.
- **Echoes** repeat a silhouette or glyph in the version colors, offset in one direction, nearest first, receding toward the background.
- **Halftone** (`halftoneDots()`, or the `halftone` utility for flat fields) is a 45° screen growing away from one light source. Texture goes on the subject; echoes and fields stay flat.
- **Cut-outs** get a paper edge and a hard offset shadow. Shadows in this system are hard offsets (`shadow-echo`, `shadow-lift`), not soft blurs; `shadow-float` is the one exception, for bars that float over content.
- **One loud thing per screen.** Everything around the artwork is calm and gridded.
- Never put text over busy artwork or artwork under controls. Never use fabricated photos of real artists or copied artwork; recordings without images get generated sleeves.
- Story cards sit asymmetrically on desktop (for example 7 + 4 columns, the smaller one dropped); each card's art reacts to its own hover.

## Layout and responsiveness

- Mobile first. Breakpoints: `tablet` 45rem (720px), `desktop` 68.75rem (1100px).
- Desktop uses a 12-column grid with `gap-x-gutter`; pages use `px-margin`.
- Phones get their own composition, not a shrunk desktop: artwork in its own panel clear of text, full-width primary actions, single-column lists with the play button kept at the side.
- Long names wrap (`[overflow-wrap:anywhere]`) instead of overflowing.

## Motion

- Durations: `--duration-fast` 150ms (state), `--duration-base` 300ms (hover), `--duration-slow` 750ms (expressive). Easing: `ease-snap`; `ease-pop` for things that land.
- Motion answers the reader: hover, press, play. At most one entrance sequence per page; no scroll-triggered fade-ins.
- `prefers-reduced-motion` is handled globally in `base.css`: transitions and animations collapse to their end state.

## Accessibility

- Every text pair in the color table meets WCAG AA (4.5:1).
- Focus: a 3px outline, pink on ink and link-blue on paper (automatic via the surface).
- Artwork is `aria-hidden`; its meaning is always also stated in text.
- Tags announce their type; play buttons announce what they play and their pressed state.
- Mark non-English titles with `lang`.
