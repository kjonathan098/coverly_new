import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Recording } from '../features/recordings/types'
import { PLACEHOLDER_IDS, placeholderRecordings } from '../mocks/fixtures/recordings'
import {
  ArtPanel,
  Button,
  ButtonLink,
  Container,
  Dissolve,
  EditorialCard,
  ORIGINAL_COLOR,
  PlayIcon,
  RecordingTile,
  Section,
  SectionHeading,
  Surface,
  Tag,
  ToggleTag,
  versionColor,
  Wordmark,
} from '../ui'

/*
 * The living design system. Development only: the route is registered behind import.meta.env.DEV,
 * so this module is not part of production builds. Static examples only; no API calls.
 */

const byId = (id: string) => placeholderRecordings.find((r) => r.id === id)!
const original = byId(PLACEHOLDER_IDS.originalWithCovers)
const covers = [byId(PLACEHOLDER_IDS.linkedCover), byId(PLACEHOLDER_IDS.secondLinkedCover)]
const unlinked = byId(PLACEHOLDER_IDS.unlinkedCover)

// Stand-in recordings for the playback states. The fixtures have no sources, by design.
const demo = (id: string, artist: string, year: number, note: string): Recording => ({
  id,
  kind: id === 'demo-original' ? 'original' : 'cover',
  originalRecordingId: id === 'demo-original' ? null : 'demo-original',
  title: 'Paper Satellites',
  artists: [{ id: `${id}-artist`, name: artist }],
  year,
  genres: [{ id: `${id}-g`, name: note.split(',')[0]!, type: 'genre' }],
  performanceStyles: [{ id: `${id}-s`, name: note.split(', ')[1]!, type: 'performanceStyle' }],
  moods: [],
  source: { platform: 'youtube', videoId: 'demo' },
})
const DEMO = [
  demo('demo-original', 'Junie Marlowe', 1998, 'Lo-fi indie pop, Four-track demo'),
  demo('demo-dub', 'Okonkwo Sound System', 2004, 'Dub, Half-time'),
  demo('demo-cumbia', 'Las Hermanas Vela', 2011, 'Cumbia, Translated'),
  demo('demo-punk', 'The Low Ceilings', 2016, 'Garage punk, Live'),
]

function Swatch({
  name,
  value,
  use,
  dark,
}: {
  name: string
  value: string
  use: string
  dark?: boolean
}) {
  return (
    <li className="overflow-hidden rounded-card bg-paper text-ink shadow-[inset_0_0_0_1px_var(--color-paper-2)]">
      <div
        className={dark ? 'h-16 border-b border-ink-3' : 'h-16 border-b border-paper-2'}
        style={{ background: value }}
      />
      <div className="px-3 pt-2 pb-3 text-meta">
        <b className="block text-label">{name}</b>
        <code className="text-paper-soft">{value}</code>
        <span className="block">{use}</span>
      </div>
    </li>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-12 first:mt-0">
      <h3 className="type-row mb-4 text-[1.4rem]">{title}</h3>
      {children}
    </div>
  )
}

function ColorSection() {
  return (
    <Section tone="paper" grain aria-labelledby="ds-color">
      <SectionHeading
        id="ds-color"
        title="Color"
        intro="Ink and paper are the fields. Pink, blue and turquoise are inks: they live in artwork and actions, never as large backgrounds."
      />
      <Block title="Fields">
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 tablet:grid-cols-5">
          <Swatch name="Ink" value="#15121D" use="Covers, listening" dark />
          <Swatch name="Ink 2" value="#1F1A2B" use="Raised on ink" dark />
          <Swatch name="Ink 3" value="#2C2640" use="Lines, tracks" dark />
          <Swatch name="Paper" value="#F6F1EB" use="Reading; type on ink" />
          <Swatch name="Paper 2" value="#EBE3D8" use="Shade on paper" />
        </ul>
      </Block>
      <Block title="Inks">
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 tablet:grid-cols-4">
          <Swatch name="Hot pink" value="#FF3E8F" use="Primary, originals" />
          <Swatch name="Electric blue" value="#3159FF" use="Far echoes, screens" />
          <Swatch name="Turquoise" value="#1ED6C1" use="Near echoes, labels on ink" />
          <Swatch name="Indigo" value="#221A4D" use="Halftone, shadow" dark />
        </ul>
      </Block>
      <Block title="Every version has a color">
        <p className="mb-4 max-w-[62ch] text-fg-soft">
          The original is always pink. Covers take the turquoise-to-blue ramp in the order they were
          recorded. <code>versionColor(index, count)</code> resamples it for any number of covers.
        </p>
        {[5, 8].map((count) => (
          <div key={count} className="mb-3 flex max-w-2xl overflow-hidden rounded-card">
            <span
              className="flex-[1.3] p-2 pt-6 text-chip font-semibold text-ink"
              style={{ background: ORIGINAL_COLOR }}
            >
              Original
            </span>
            {Array.from({ length: count }, (_, i) => (
              <span
                key={i}
                className="flex-1 p-2 pt-6 text-chip font-semibold text-ink"
                style={{ background: versionColor(i, count) }}
              >
                {i + 1}
              </span>
            ))}
          </div>
        ))}
      </Block>
      <Block title="Text on each surface">
        <div className="grid gap-4 tablet:grid-cols-2">
          {(['ink', 'paper'] as const).map((tone) => (
            <Surface
              key={tone}
              tone={tone}
              className="rounded-panel p-6 shadow-[inset_0_0_0_1px_var(--surface-line)]"
            >
              <p className="type-label text-accent">Accent label</p>
              <p className="type-card mt-1">Primary text on {tone}</p>
              <p className="mt-2 text-fg-soft">Secondary text. Every pair here passes WCAG AA.</p>
              <a href="#ds-color" className="mt-3 inline-block font-semibold">
                A link to tab to (focus ring adapts)
              </a>
            </Surface>
          ))}
        </div>
      </Block>
    </Section>
  )
}

function TypeSection() {
  const rows: Array<[string, string, ReactNode]> = [
    [
      'Lettering, the B-side',
      'type-lettering, Bagel Fat One',
      <span className="type-lettering text-[2.6rem] text-pink-ink">
        every song has another side
      </span>,
    ],
    [
      'Masthead',
      'type-wordmark text-masthead',
      <span className="type-wordmark text-[5rem]">Coverly</span>,
    ],
    [
      'Cover headline',
      'type-headline',
      <span className="type-headline block">
        Nobody bought it. Five artists covered it anyway.
      </span>,
    ],
    ['Section title', 'type-section', <span className="type-section block">Inside issue 07</span>],
    ['Card title', 'type-card', <span className="type-card block">What makes a cover yours?</span>],
    ['Row title', 'type-row', <span className="type-row block">Okonkwo Sound System</span>],
    [
      'Lead',
      'type-lead',
      <span className="type-lead block max-w-[46ch]">
        We asked everyone who covered Paper Satellites the same question.
      </span>,
    ],
    [
      'Body',
      'type-body',
      <span className="type-body block max-w-[62ch]">
        Paper Satellites sold 900 copies in 1998. Since then it has come back as dub, cumbia, garage
        punk, synthwave and solo piano.
      </span>,
    ],
    ['Label', 'type-label', <span className="type-label text-accent">Interview</span>],
    ['Meta', 'type-meta', <span className="type-meta text-fg-soft">12 min read, 3:40</span>],
  ]
  return (
    <Section tone="paper" grain aria-labelledby="ds-type" className="pt-0">
      <SectionHeading
        id="ds-type"
        title="Typography"
        intro="Three voices. Bagel Fat One for rare lettering moments, Bricolage Grotesque for headings, Schibsted Grotesk for reading and interface. Sentence case; uppercase only in the wordmark."
      />
      <dl className="m-0">
        {rows.map(([role, token, sample]) => (
          <div
            key={role}
            className="grid gap-2 border-b border-line py-5 tablet:grid-cols-[14rem_minmax(0,1fr)] tablet:items-center tablet:gap-6"
          >
            <dt>
              <b className="block">{role}</b>
              <code className="text-meta text-fg-soft">{token}</code>
            </dt>
            <dd className="m-0 min-w-0">{sample}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

function ControlsPanel({ tone }: { tone: 'ink' | 'paper' }) {
  const [filters, setFilters] = useState<Record<string, boolean>>({ Dub: true })
  const toggle = (name: string) => setFilters((f) => ({ ...f, [name]: !f[name] }))
  return (
    <Surface
      tone={tone}
      grain
      className="rounded-panel p-6 shadow-[inset_0_0_0_1px_var(--surface-line)] tablet:p-8"
    >
      <p className="type-label mb-5 text-accent">On {tone}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
        <Button size="lg" icon={<PlayIcon />}>
          Explore the six versions
        </Button>
        <Button variant="secondary">Read the interview</Button>
        <ButtonLink variant="quiet" href="#ds-controls">
          Read the cover story
        </ButtonLink>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-5">
        <Button disabled>Primary disabled</Button>
        <Button variant="secondary" disabled>
          Secondary disabled
        </Button>
      </div>
      <p className="type-label mt-8 mb-3">Labels</p>
      <div className="flex flex-wrap gap-1.5">
        <Tag type="genre">Cumbia</Tag>
        <Tag type="performanceStyle">Live</Tag>
        <Tag type="mood">Late night</Tag>
      </div>
      <p className="type-label mt-6 mb-3">Filters (try them, they toggle)</p>
      <div className="flex flex-wrap gap-2">
        {['Dub', 'Cumbia', 'Garage punk', 'Acoustic'].map((name) => (
          <ToggleTag
            key={name}
            type="genre"
            pressed={Boolean(filters[name])}
            onClick={() => toggle(name)}
          >
            {name}
          </ToggleTag>
        ))}
      </div>
    </Surface>
  )
}

function ControlsSection() {
  return (
    <Section tone="paper" grain aria-labelledby="ds-controls" className="pt-0">
      <SectionHeading
        id="ds-controls"
        title="Buttons and labels"
        intro="One primary action per view, and it carries the echoes. Genres are filled, performance styles outlined, moods dashed, so the shape tells the type apart without color."
      />
      <div className="grid gap-6 desktop:grid-cols-2">
        <ControlsPanel tone="ink" />
        <ControlsPanel tone="paper" />
      </div>
    </Section>
  )
}

function RecordingsSection() {
  const [playing, setPlaying] = useState<string | null>('demo-cumbia')
  const play = (r: Recording) => setPlaying((current) => (current === r.id ? null : r.id))
  const [demoOriginal, ...demoCovers] = DEMO
  return (
    <Section tone="ink" grain aria-labelledby="ds-recordings">
      <SectionHeading
        id="ds-recordings"
        label="Originals & covers"
        title="Recording tiles"
        intro="The original anchors the list; covers follow in recording order, each in its version color. Sleeves are generated, so nothing waits for artwork."
      />
      <Block title="From the Phase 1 fixtures: no sources yet">
        <p className="mb-5 max-w-[62ch] text-fg-soft">
          Every fixture has <code>source: null</code>. The tiles say so instead of showing play
          buttons that cannot work.
        </p>
        <div className="grid gap-6 desktop:grid-cols-12 desktop:gap-x-gutter">
          <RecordingTile
            recording={original}
            color={ORIGINAL_COLOR}
            variant="feature"
            className="desktop:col-span-4"
          />
          <div className="grid content-start gap-2 desktop:col-span-8">
            {covers.map((cover, i) => (
              <RecordingTile
                key={cover.id}
                recording={cover}
                color={versionColor(i, covers.length)}
              />
            ))}
            <RecordingTile
              recording={unlinked}
              color={versionColor(0, 1)}
              note="Shares a title with the original, but nothing links them"
            />
          </div>
        </div>
      </Block>
      <Block title="Playback states, with stand-in sources">
        <p className="mb-5 max-w-[62ch] text-fg-soft">
          With a source and a player, the tile shows a play toggle. This page keeps the state
          locally; there is no global player. Press any play button.
        </p>
        <div className="grid gap-6 desktop:grid-cols-12 desktop:gap-x-gutter">
          <RecordingTile
            recording={demoOriginal!}
            color={ORIGINAL_COLOR}
            variant="feature"
            onPlay={play}
            playing={playing === demoOriginal!.id}
            className="desktop:col-span-4"
          />
          <div className="grid content-start gap-2 desktop:col-span-8">
            {demoCovers.map((cover, i) => (
              <RecordingTile
                key={cover.id}
                recording={cover}
                color={versionColor(i, demoCovers.length)}
                onPlay={play}
                playing={playing === cover.id}
              />
            ))}
            <RecordingTile
              recording={{ ...demoCovers[0]!, id: 'demo-link' }}
              color={versionColor(0, demoCovers.length)}
              note="With a source but no player: an outbound link instead"
            />
          </div>
        </div>
      </Block>
    </Section>
  )
}

function QuestionArt() {
  return (
    <ArtPanel className="flex aspect-[16/10] items-end p-6 tablet:p-9">
      <svg
        viewBox="0 0 700 460"
        aria-hidden="true"
        className="absolute top-[-9%] right-0 w-[70%] overflow-visible"
      >
        {[5, 4, 3, 2, 1].map((i) => (
          <text
            key={i}
            x={500 - i * 17}
            y={420 - i * 13}
            textAnchor="middle"
            className="type-lettering text-[430px] transition-transform duration-(--duration-slow) ease-snap group-hover:[transform:translate(calc(var(--i)*-14px),calc(var(--i)*-11px))]"
            style={{ fill: versionColor(i - 1, 5), '--i': i } as CSSProperties}
          >
            ?
          </text>
        ))}
        <text
          x="500"
          y="420"
          textAnchor="middle"
          className="type-lettering fill-pink stroke-paper text-[430px] [paint-order:stroke] [stroke-width:10px]"
        >
          ?
        </text>
      </svg>
      <p className="type-row relative z-[1] max-w-[18ch] text-[clamp(1.4rem,2.2vw,2rem)] leading-none">
        Keep the bones. Change the room it lives in.
      </p>
    </ArtPanel>
  )
}

function KaraokeArt() {
  const line =
    'type-card block w-fit bg-[linear-gradient(var(--color-pink),var(--color-pink))] bg-no-repeat text-transparent [background-clip:text] [-webkit-background-clip:text] transition-[background-size] duration-700 ease-linear'
  return (
    <ArtPanel tone="blue" className="flex aspect-[4/3.3] flex-col justify-center p-6">
      <p className="type-meta absolute top-4 left-6 font-semibold">♪ Track 07, 2:14</p>
      <div
        aria-hidden="true"
        className="relative z-[1] grid gap-1 text-[clamp(1.6rem,2.6vw,2.4rem)]"
      >
        <span
          className={`${line} bg-[length:58%_100%] [background-color:var(--color-paper)] group-hover:bg-[length:100%_100%]`}
        >
          And the paper satellites
        </span>
        <span
          className={`${line} bg-[length:0%_100%] [background-color:var(--color-paper)] delay-700 group-hover:bg-[length:100%_100%]`}
        >
          fall into the sea
        </span>
      </div>
    </ArtPanel>
  )
}

function EditorialSection() {
  return (
    <Section tone="paper" grain aria-labelledby="ds-editorial">
      <SectionHeading
        id="ds-editorial"
        title="Editorial cards"
        intro="Each story brings its own art; the text block never changes. Hover a card: its art answers. On desktop the cards sit off-grid, the smaller one dropped."
      />
      <div className="grid gap-16 desktop:grid-cols-12 desktop:gap-x-gutter">
        <EditorialCard
          className="desktop:col-span-7"
          format="Interview"
          title="What makes a cover yours? Five artists answer"
          href="#ds-editorial"
          dek="We asked everyone who covered Paper Satellites the same question. Their answers disagree in the best way."
          meta="12 min read"
          art={<QuestionArt />}
        />
        <EditorialCard
          className="desktop:col-span-4 desktop:col-start-9 desktop:mt-24"
          format="Essay"
          title="In defense of the karaoke version"
          href="#ds-editorial"
          dek="The least cool cover of all might be the most honest one."
          meta="6 min read"
          art={<KaraokeArt />}
        />
      </div>
    </Section>
  )
}

function LayoutSection() {
  return (
    <Section tone="paper" grain aria-labelledby="ds-layout" className="pt-0">
      <SectionHeading
        id="ds-layout"
        title="Layout"
        intro="Twelve columns with fluid gutters on desktop, a single column on phones. Containers: full (margins only), page and reading."
      />
      <div aria-hidden="true" className="grid grid-cols-4 gap-gutter tablet:grid-cols-12">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className={`${i >= 4 ? 'hidden tablet:block' : ''} h-20 rounded-sleeve bg-[color-mix(in_srgb,var(--color-pink)_22%,transparent)]`}
          />
        ))}
      </div>
      <div className="mt-8 grid gap-3">
        <div className="rounded-card bg-paper-2 p-3 text-meta">
          <b>page</b>: max-w-page (72rem), centered, with page margins
        </div>
        <div className="mx-auto w-full max-w-reading rounded-card bg-paper-2 p-3 text-meta">
          <b>reading</b>: max-w-reading (42rem), for long-form text
        </div>
      </div>
    </Section>
  )
}

export function DesignPage() {
  return (
    <>
      <Surface as="header" tone="ink" grain className="pt-6 pb-12">
        <Container size="full">
          <p className="type-meta mb-6 inline-flex rounded-pill bg-ink-3 px-3 py-1 text-ink-soft">
            Development only. Not part of production builds.
          </p>
          <h1 className="m-0">
            <Wordmark size="masthead" />
          </h1>
          <p className="type-lead mt-5 max-w-[56ch] text-fg-soft">
            The Electric Pop design system: tokens, type and primitives for Phase 3. Hover the
            wordmark letters to see their B-side. Rules live in <code>docs/design-system.md</code>.
          </p>
        </Container>
      </Surface>
      <Dissolve to="paper" />
      <main>
        <ColorSection />
        <TypeSection />
        <ControlsSection />
        <Dissolve to="ink" />
        <RecordingsSection />
        <Dissolve to="paper" />
        <EditorialSection />
        <LayoutSection />
      </main>
    </>
  )
}
