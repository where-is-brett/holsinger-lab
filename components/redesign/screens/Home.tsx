import { urlForImage } from 'lib/sanity.image'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Image as SanityImage } from 'sanity'
import type {
  HomePagePayload,
  HomeResourcePayload,
  MaestroProjectPayload,
  ProfilePayload,
  RoleGroupPayload,
  SettingsPayload,
  SiteCopyPayload,
  SupportPagePayload,
} from 'types'

import { currentMemberCount, homeStatement, resolveLabHeadHref, shouldShowLabHeadCard, splitLead } from '../homeModel'
import { LeadPublication } from '../LeadPublication'
import { initialsOf } from '../peopleModel'
import { PORTRAIT_IMAGE_CLASS } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import type { Publication } from '../publicationModel'
import { PublicationRow } from '../PublicationRow'
import { ResourceBlock } from '../ResourceBlock'
import { buildResourceMeta } from '../resourceModel'
import { Section } from '../Section'
import { LABEL, MICRO_LABEL, PUBLICATION_GRID, STRIPE_BG } from '../tokens'

// Composition follows
// docs/redesign-experiment/design-system/ui_kits/site/Home.jsx (task brief
// "Visual authority"), spec §2 (rulings 2 and 4) / §6: up to five `Section`
// blocks (Identity plus four labelled ones), each omitted when there's
// nothing to show. `home` itself has no editorial body copy
// (`home.showcaseProjects` stays unused, per constraints.md) -- the hero
// statement comes from the shared `siteCopy` singleton (via
// `homeStatement`, `homeModel.ts`), falling back through `home.overview`
// to the IA's fixed tagline when it's unset.

// -- Block 1: Identity -------------------------------------------------

// A dedicated 64px-square portrait, not PersonCard.tsx's `PortraitFrame`:
// that component's footprint is a fixed `aspect-[4/5]` box at `w-full`
// (People's 220px spotlight, the card grid's own fractional widths), and
// getting a *square* 64px box out of it would mean overriding either
// `aspect-[4/5]` or `w-full` from outside -- exactly the same-CSS-property
// collision constraints.md forbids (two utilities, `aspect-[4/5]` from
// PortraitFrame's own FOOTPRINT_IMAGE/FOOTPRINT_FALLBACK plus whatever
// square-forcing utility this call site would need to append, both
// targeting `aspect-ratio`/`width` at the same breakpoint). A small
// dedicated component, mirroring PortraitFrame's own two branches (image /
// initials-and-stripe fallback) at this one fixed size, avoids the
// collision entirely. The image branch composes PersonCard.tsx's own
// exported `PORTRAIT_IMAGE_CLASS` (a single `object-cover` declaration)
// instead of a bare inline utility, so the lab head's hero portrait
// matches every other portrait in this direction; `STRIPE_BG` (the
// no-portrait fallback background) is the same shared token
// PersonCard.tsx/ResourceBlock.tsx also use.
function PiPortrait64({ name, img }: { name: string; img?: string }) {
  if (img) {
    // `alt=""` (decorative), not `alt={name}` -- axe's `image-redundant-alt`
    // rule: this portrait sits inside the same `Link` as the lab head's
    // name text (`LabHeadCard` below), so a non-empty alt would duplicate
    // the visible name right beside it in the link's accessible name,
    // announced twice to screen-reader users. Same call PersonCard.tsx's
    // own `href` branch already makes for its linked variant. The People
    // spotlight's portrait (People.tsx's `SpotlightBlock`) keeps
    // `alt={name}` unchanged -- its image and name (an `h2`) are not
    // inside a shared link there, so there's no duplication to fix.
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-surface-raised">
        <Image src={img} alt="" fill sizes="64px" className={PORTRAIT_IMAGE_CLASS} />
      </div>
    )
  }
  return (
    <div
      className="box-border flex h-16 w-16 shrink-0 items-center justify-center border border-rule"
      style={{ backgroundImage: STRIPE_BG }}
    >
      <span className="font-mono text-[16px] leading-none font-medium text-text-muted">{initialsOf(name)}</span>
    </div>
  )
}

function IdentityBlock({
  home,
  siteName,
  settings,
  siteCopy,
  headingLevel = 'h1',
}: {
  home: HomePagePayload
  siteName: string
  settings: SettingsPayload
  siteCopy: SiteCopyPayload | null
  headingLevel?: 'h1' | 'h2'
}) {
  // Fix round 1, point 3: a Studio string field can collect a stray space
  // -- `.trim()` before the `||` fallback, same "whitespace-only counts as
  // unset" rule `resolveBranding` (lib/branding.ts) already applies to
  // `siteName` itself, so a whitespace-only `home.title` falls through to
  // `siteName` instead of rendering a blank `<h1>`.
  const title = home.title?.trim() || siteName
  // `homeStatement` (homeModel.ts) owns the whole fallback chain --
  // `siteCopy.about.body` -> `siteCopy.hero.subheading` -> `home.overview`
  // -> the shared `IA_TAGLINE` -- so this block never needs the tagline
  // constant itself, only the one function that already resolves it.
  const statement = homeStatement(siteCopy, home.overview)
  const labHead = settings.labHead
  const showLabHeadCard = shouldShowLabHeadCard(settings)
  const Heading = headingLevel

  return (
    <div>
      {/* Sentence-case Archivo, not uppercase mono -- a kicker is exactly
          the label shape the micro-label budget rule targets. */}
      <div className="flex items-center gap-4">
        <span className="h-px w-9 bg-text" />
        <span className={MICRO_LABEL}>The University of Sydney</span>
      </div>
      {/* `break-words`: see PageTitle.tsx's canonical note. `text-balance`
          (spec §1.2, "keep text-wrap: balance on display headings")
          replaces `text-pretty` here -- this is the one display-role
          heading, and the display floor is sized so its longest word
          ("Neuroscience") fits at 320px. */}
      <Heading
        data-testid="home-identity-title"
        className="mt-[30px] max-w-[1180px] text-balance break-words text-display font-semibold"
      >
        {title}
      </Heading>
      {/* Two-column grid ([statement | lab-head card]) from `xl`, stacked
          below -- same `grid-cols-1` + explicit `xl:`-prefixed track
          pattern as Research.tsx's NARRATIVE_GRID / PersonPage.tsx's
          PROFILE_GRID: `grid-cols-1` zeroes the implicit stacked track's
          min-content floor so a long unbroken token (the lab head's
          email, an identifier) can't blow the column out past the
          viewport. One unprefixed `grid-template-columns` declaration
          plus one `xl:` declaration -- never two for the same property at
          the same breakpoint (constraints.md). `xl`, not `lg`: at `lg`
          the fixed 20rem card track leaves the statement narrower than
          its own 375px phone width, so the split waits for the wider
          breakpoint instead. Two entire, separate class strings for the
          "with card" / "without card" cases (IDENTITY_GRID / _SOLO
          below), same reasoning as Research.tsx's NARRATIVE_GRID/_SOLO
          split: with no lab-head card there is no second grid item, and
          an `xl:grid-cols-[minmax(0,1fr)_20rem]` track with only one
          child would still reserve the 20rem column as empty space
          instead of letting the statement use the full width. */}
      <div className={showLabHeadCard ? IDENTITY_GRID : IDENTITY_GRID_SOLO}>
        <p
          data-testid="home-statement"
          data-cms-verbatim
          className="max-w-[40rem] text-pretty break-words text-lead text-text-muted"
        >
          {statement}
        </p>
        {showLabHeadCard && labHead && <LabHeadCard labHead={labHead} />}
      </div>
    </div>
  )
}

const IDENTITY_GRID = 'mt-[38px] grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-14'
const IDENTITY_GRID_SOLO = 'mt-[38px] grid grid-cols-1'

// The lab-head card is itself the two-column grid (`grid-cols-[4rem_
// minmax(0,1fr)]`), not just its photo-plus-name row: the outer card and
// the `Link` share the identical column template (same 4rem/gap-x-5/
// minmax(0,1fr) split, on the same full-width row), so the role and email
// lines below -- placed at the outer grid's `col-start-2` -- line up
// exactly under the name without needing a second, independent alignment
// mechanism. Do not set the `Link` to `display: contents` to let the
// portrait `row-span` across the card -- that drops the link from the
// focus order in Chromium (caught by the hover/focus e2e below), so it
// stays a real, focusable box instead. `labHead?.name` is the only field
// this ever assumes is set (`showLabHeadCard` above already gates on it),
// so role and email each render only when non-blank, and
// `break-words`/`break-all` guard the two CMS-text lines against an
// unbroken token blowing out the 20rem card column.
function LabHeadCard({ labHead }: { labHead: NonNullable<SettingsPayload['labHead']> }) {
  const role = labHead.role?.trim()
  const email = labHead.email?.trim()
  return (
    <div
      className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-5 gap-y-2 border-l border-rule pl-6"
      data-testid="home-lab-head-card"
    >
      <Link
        href={resolveLabHeadHref(labHead)}
        // `justify-self-start max-w-full`: without it, this grid item
        // (`col-span-2` on a `minmax(0,1fr)` track) stretches to the
        // card's full width, so its hit area and focus ring extend well
        // past the portrait+name it actually wraps -- `justify-self-start`
        // shrinks it to its own content width instead, and `max-w-full`
        // keeps that from overflowing the card if the content is ever
        // wider than the column.
        className="group col-span-2 grid max-w-full grid-cols-[4rem_minmax(0,1fr)] items-center justify-self-start gap-x-5"
        data-testid="home-lab-head-link"
      >
        <PiPortrait64
          name={labHead.name ?? ''}
          img={
            labHead.image
              ? (urlForImage(labHead.image as SanityImage)?.width(128).height(128).fit('crop').url() ?? undefined)
              : undefined
          }
        />
        <span className="min-w-0 break-words text-[1.3125rem] font-semibold tracking-[-0.01em] transition-[color] duration-(--sem-motion-fast) ease-(--sem-ease) group-hover:text-link group-focus-visible:text-link">
          {labHead.name}
        </span>
      </Link>
      {role && (
        <div
          className="col-start-2 min-w-0 break-words text-[0.9375rem] text-text-muted"
          data-cms-verbatim
          data-testid="home-lab-head-role"
        >
          {role}
        </div>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          data-identifier
          data-cms-verbatim
          // `justify-self-start max-w-full`: same reason as the name
          // link's own comment above -- this grid item otherwise stretches
          // to the full card width, so the link's hit area would extend
          // well past the visible email text.
          className="col-start-2 inline-block min-w-0 max-w-full justify-self-start break-all font-mono text-[0.8125rem] text-link"
        >
          {email}
        </a>
      )}
    </div>
  )
}

// -- Block 2: Recent papers ------------------------------------------------

// Composes `LABEL` (tokens.ts) instead of hand-writing its geometry,
// matching PublicationsIndex.tsx's own `COLUMN_HEADS` (`${COLUMN_HEADS}
// ${LABEL}`).
const COLUMN_HEAD = `hidden ${PUBLICATION_GRID} pb-3 ${LABEL}`

function RecentWorkBlock({ publications, count }: { publications: Publication[]; count: number }) {
  // The newest paper gets its own lead row (more visual weight); the next
  // four render as ordinary ledger rows below it. `splitLead` handles the
  // empty case (`lead: null`) too, though `RecentWorkBlock` is never
  // rendered with an empty `publications` array -- `Home`'s own
  // `showRecentWork` gate already requires `publications.length > 0`.
  const { lead, rest } = splitLead(publications)
  return (
    <div data-testid="home-recent-work">
      {lead && <LeadPublication pub={lead} />}
      {/* `data-testid="ledger-head"`: the one place this block's uppercase
          mono is allowed -- e2e/label-budget.spec.ts excludes anything
          inside it from the micro-label budget. */}
      <div data-testid="ledger-head" className={COLUMN_HEAD}>
        <span>Year</span>
        <span>Title</span>
        <span>Journal</span>
        <span>Link</span>
      </div>
      {rest.map((pub) => (
        // `data-testid="pub-row"`: matches PublicationsIndex.tsx's own row
        // wrapper, so the ledger-cell overflow guard (`e2e/home.spec.ts`)
        // can target Home's rows the same way it targets `/publications`'s.
        <div key={pub.id} data-testid="pub-row">
          <PublicationRow pub={pub} variant="home" href={pub.href} />
        </div>
      ))}
      {/* Sentence case, not uppercase mono -- links to another route are
          sentence case per the brief. */}
      <Link href="/publications" className="mt-5 inline-block text-[14px] font-medium text-link">
        All {count} publication{count === 1 ? '' : 's'} →
      </Link>
    </div>
  )
}

// -- Block 3: Resources ---------------------------------------------------

// `buildResourceMeta` (KIND / SOURCE / DOI-or-URL) moved to
// resourceModel.ts (PR C Task 3 fix round 1, IMPORTANT 2) -- it was a
// verbatim duplicate of Resources.tsx's own copy, and the two would have
// silently drifted. Both screens import the one shared function now.

function ResourcesBlock({ resource }: { resource: HomeResourcePayload }) {
  return (
    <div data-testid="home-resources">
      <ResourceBlock title={resource.title ?? ''} meta={buildResourceMeta(resource)} />
      <Link href="/resources" className="mt-5 inline-block text-[14px] font-medium text-link">
        All resources →
      </Link>
    </div>
  )
}

// -- Block 4: Outreach (MAESTRO), inverse ---------------------------------

// The identifier prints "Register — <site without scheme>" verbatim --
// scheme stripped for display only, same `deriveLink` URL-label convention
// used everywhere else in this direction; the href keeps the full URL.
function siteLabel(site: string): string {
  return site.replace(/^https?:\/\//, '')
}

function OutreachBlock({ maestro }: { maestro: MaestroProjectPayload }) {
  return (
    <div data-testid="home-maestro">
      {/* `break-words` (see PageTitle.tsx's canonical note) -- the MAESTRO
          project title is CMS text this repo doesn't control the shape
          of. */}
      <div className="max-w-[720px] text-pretty break-words text-heading font-semibold" data-testid="maestro-title">
        {maestro.title}
      </div>
      <PortableBody blocks={maestro.overview} variant="inverse" />
      {maestro.site && (
        // No `data-identifier`: unlike PublicationRow/ResourceBlock's
        // identifiers, this anchor's rendered text is "Register — <label>",
        // not the bare identifier -- e2e/redesign-components.spec.ts's
        // generic `[data-identifier]` contract asserts the *whole* element
        // text (scheme/`www.` stripped) is contained in `href`, which a
        // "Register — " prefix would trip. Sentence case, not mono,
        // matching "All resources →"'s own link style.
        <a
          href={maestro.site}
          className="mt-5 inline-block break-all text-[14px] font-medium text-text-inverse underline underline-offset-4"
        >
          Register — {siteLabel(maestro.site)}
        </a>
      )}
    </div>
  )
}

// -- Block 5: The lab -------------------------------------------------------

// [members | support], one column below the breakpoint that introduces the
// three-column track -- same `grid-cols-1` + explicit-`lg:`-track pattern
// as every other CMS-text-holding grid in this direction (IDENTITY_GRID
// above, Research.tsx's NARRATIVE_GRID, People.tsx's SPOTLIGHT_GRID):
// without it, a long unbroken token sets the implicit stacked track's
// min-content width and the grid overflows below `lg`. The lab head now
// lives in the hero's own card (Block 1, `LabHeadCard`), not here.
const LAB_GRID = 'grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start lg:gap-x-12'

function TheLabBlock({
  memberCount,
  showMembersLine,
  supportPage,
}: {
  memberCount: number
  showMembersLine: boolean
  supportPage: SupportPagePayload | null
}) {
  return (
    <div className={LAB_GRID}>
      {/* Fix round 1, point 6 ruling: the members line renders only when
          `memberCount > 0` (computed by the caller, passed as
          `showMembersLine`) -- "0 — PEOPLE →" is not a useful link, and
          `settings.showPeople !== false` alone (the old condition) doesn't
          guarantee there's actually anyone to count. "The lab" block itself
          still renders whenever any of its three parts has content -- see
          `Home`'s own `showTheLab` calculation, which no longer treats
          `showPeople` as sufficient on its own either. */}
      {showMembersLine && (
        <div className="min-w-0" data-testid="home-member-count">
          <div className={`${MICRO_LABEL} mb-2.5`}>Current members</div>
          <Link href="/people" className="text-[24px] font-semibold">
            {memberCount} <span className="text-[13px] font-normal text-text-faint">— People →</span>
          </Link>
        </div>
      )}
      {supportPage && (
        <div className="min-w-0" data-testid="home-support">
          <div className={`${MICRO_LABEL} mb-3`}>Support</div>
          <Link href={`/${supportPage.slug}`} className="text-[14px] font-medium text-link">
            Support our research →
          </Link>
        </div>
      )}
    </div>
  )
}

export function Home({
  home,
  settings,
  siteName,
  siteCopy,
  publications,
  publicationCount,
  resource,
  maestro,
  profiles,
  roleGroups,
  supportPage,
  headingLevel,
}: {
  home: HomePagePayload
  settings: SettingsPayload
  siteName: string
  siteCopy: SiteCopyPayload | null
  publications: Publication[]
  publicationCount: number
  resource: HomeResourcePayload | null
  maestro: MaestroProjectPayload | null
  profiles: ProfilePayload[]
  roleGroups: RoleGroupPayload[]
  supportPage: SupportPagePayload | null
  /** Forwarded to Identity's own heading -- see PageTitle.tsx's identical
   * doc comment and People.tsx/Research.tsx's own `headingLevel` prop.
   * Only ever set by the /preview/components gallery, which (fix round 1)
   * now renders two `Home` instances alongside its own headings; the real
   * `/` route never passes this, so it always gets the correct `<h1>`. */
  headingLevel?: 'h1' | 'h2'
}) {
  const labHead = settings.labHead
  const showLabHeadCard = shouldShowLabHeadCard(settings)
  const showPeople = settings.showPeople !== false
  // Excludes the lab head from the count only when the hero's own
  // lab-head card actually renders (`showLabHeadCard`), not unconditionally
  // whenever `labHead` is merely set -- otherwise, with the card hidden
  // (`showLabHeadOnHome: false`), that person would appear nowhere on the
  // page yet still change the number, an internal inconsistency between
  // what this same render shows and what it counts. Gating the exclusion
  // on `showLabHeadCard` (this page's own "is the lab head visible here"
  // boolean) mirrors how `People.tsx` gates `excludeLabHead` on its own
  // `showSpotlight` -- the two pages' counts agree whenever
  // `showLabHeadOnHome` and `showLabHeadOnPeople` happen to carry the same
  // value (note `showSpotlight` itself, unlike `showLabHeadCard`, doesn't
  // additionally require a named lab head), which `e2e/home.spec.ts`
  // cross-checks directly against /people's own rendered meta rather than
  // re-deriving the rule.
  const memberCount = currentMemberCount(profiles, roleGroups, showLabHeadCard ? labHead?._id : null)
  // "0 — PEOPLE →" is never rendered -- the members line needs both the
  // page-level flag and an actual positive count.
  const showMembersLine = showPeople && memberCount > 0

  const showRecentWork = publications.length > 0 && settings.showPublications !== false
  const showResources = Boolean(resource)
  const showOutreach = Boolean(maestro)
  // "The lab" itself still renders whenever either of its two parts has
  // content -- the lab head now lives in the hero's own card (Block 1),
  // not here, so a `showPeople`-true page with zero current members and
  // no support page would otherwise render an empty `Section` (a label
  // with no content beneath it).
  const showTheLab = showMembersLine || Boolean(supportPage)

  // Each block carries its own React `key` (the identity block has no
  // visible `label` at all: it's the hero, not a labelled section).
  // `labelHeading` is set per block: `true` for "Recent papers"/"Outreach"/
  // "The lab" (none of `RecentWorkBlock`/`OutreachBlock`/`TheLabBlock`
  // render a heading of their own -- plain `<div>`s and mono labels), but
  // `false` for "Resources", since `ResourceBlock`'s own title is a real
  // `<h2>` and a second `<h2>` label here would be a redundant sibling
  // heading.
  const blocks: Array<{ key: string; label?: string; labelHeading?: boolean; inverse?: boolean; content: ReactNode }> = [
    {
      key: 'identity',
      content: (
        <IdentityBlock
          home={home}
          siteName={siteName}
          settings={settings}
          siteCopy={siteCopy}
          headingLevel={headingLevel}
        />
      ),
    },
  ]
  if (showRecentWork) {
    blocks.push({
      key: 'recent-work',
      label: 'Recent papers',
      labelHeading: true,
      content: <RecentWorkBlock publications={publications} count={publicationCount} />,
    })
  }
  if (showResources && resource) {
    blocks.push({ key: 'resources', label: 'Resources', content: <ResourcesBlock resource={resource} /> })
  }
  if (showOutreach && maestro) {
    blocks.push({
      key: 'outreach',
      label: 'Outreach',
      labelHeading: true,
      inverse: true,
      content: <OutreachBlock maestro={maestro} />,
    })
  }
  if (showTheLab) {
    blocks.push({
      key: 'the-lab',
      label: 'The lab',
      labelHeading: true,
      content: (
        <TheLabBlock memberCount={memberCount} showMembersLine={showMembersLine} supportPage={supportPage} />
      ),
    })
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <Section
          key={block.key}
          label={block.label}
          labelHeading={block.labelHeading}
          inverse={block.inverse}
          borderTop={index !== 0}
        >
          {block.content}
        </Section>
      ))}
    </div>
  )
}
