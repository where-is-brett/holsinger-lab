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
  SupportPagePayload,
} from 'types'

import { currentMemberCount, plainTagline, resolveLabHeadHref, shouldShowLabHeadCard } from '../homeModel'
import { initialsOf } from '../peopleModel'
import { IMAGE_FILTER } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import type { Publication } from '../publicationModel'
import { PublicationRow } from '../PublicationRow'
import { ResourceBlock } from '../ResourceBlock'
import { buildResourceMeta } from '../resourceModel'
import { SectionRail } from '../SectionRail'
import { LABEL, STRIPE_BG } from '../tokens'

// Composition follows
// docs/redesign-experiment/design-system/ui_kits/site/Home.jsx (task brief
// "Visual authority"), spec §2 (rulings 2 and 4) / §6: five numbered
// blocks, each omitted when there's nothing to show, same "no gaps in the
// render-order numbering" pattern as Research.tsx / People.tsx. Home has
// zero editorial fields of its own (spec §6, constraints.md forbids
// touching `home.showcaseProjects`/`siteCopy`) -- every block is derived
// from other document types or `settings`.

const IA_TAGLINE = 'Advancing the Understanding and Treatment of Neurological Disorders through Molecular Research'

// -- Block 1: Identity -------------------------------------------------

function IdentityBlock({
  home,
  siteName,
  settings,
  headingLevel = 'h1',
}: {
  home: HomePagePayload
  siteName: string
  settings: SettingsPayload
  headingLevel?: 'h1' | 'h2'
}) {
  // Fix round 1, point 3: a Studio string field can collect a stray space
  // -- `.trim()` before the `||` fallback, same "whitespace-only counts as
  // unset" rule `resolveBranding` (lib/branding.ts) already applies to
  // `siteName` itself, so a whitespace-only `home.title` falls through to
  // `siteName` instead of rendering a blank `<h1>`.
  const title = home.title?.trim() || siteName
  const tagline = plainTagline(home.overview) ?? IA_TAGLINE
  const labHead = settings.labHead
  const showPiPanel = shouldShowLabHeadCard(settings) && Boolean(labHead)
  const Heading = headingLevel

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="h-px w-9 bg-text" />
        <span className="font-mono text-[12px] leading-none font-medium tracking-[0.2em] uppercase">
          The University of Sydney
        </span>
      </div>
      <Heading className="mt-[30px] max-w-[1180px] text-pretty break-words text-display font-semibold">
        {title}
      </Heading>
      {/* Two-column grid ([tagline | PI panel]) from `lg`, stacked below --
          same `grid-cols-1` + explicit `lg:`-prefixed track pattern as
          Research.tsx's NARRATIVE_GRID / PersonPage.tsx's PROFILE_GRID:
          `grid-cols-1` zeroes the implicit stacked track's min-content
          floor so a long unbroken token (the PI's email, an identifier)
          can't blow the column out past the viewport. One unprefixed
          `grid-template-columns` declaration plus one `lg:` declaration --
          never two for the same property at the same breakpoint
          (constraints.md). Two entire, separate class strings for the
          "with panel" / "without panel" cases (WITH_PANEL / SOLO below),
          same reasoning as Research.tsx's NARRATIVE_GRID/_SOLO split: with
          no PI panel there is no second grid item, and an `lg:grid-cols-
          [1fr_320px]` track with only one child would still reserve the
          320px column as empty space instead of letting the tagline use
          the full width. */}
      <div className={showPiPanel ? IDENTITY_GRID : IDENTITY_GRID_SOLO}>
        <p className="max-w-[560px] min-w-0 text-pretty break-words text-lead leading-[1.6] text-text-muted">
          {tagline}
        </p>
        {showPiPanel && labHead && (
          <div className="min-w-0 border-l border-rule pl-6" data-testid="home-pi-panel">
            <div className={LABEL}>Principal investigator</div>
            <Link href={resolveLabHeadHref(labHead)} className="mt-[9px] block text-[21px] font-semibold tracking-[-0.01em] break-words">
              {labHead.name}
            </Link>
            {labHead.email && (
              <a
                href={`mailto:${labHead.email}`}
                data-identifier
                className="mt-[7px] inline-block font-mono text-[11.5px] leading-[1.4] break-all text-link"
              >
                {labHead.email}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const IDENTITY_GRID = 'mt-[38px] grid grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_320px] lg:gap-x-14'
const IDENTITY_GRID_SOLO = 'mt-[38px] grid grid-cols-1'

// -- Block 2: Recent work ------------------------------------------------

const COLUMN_HEAD =
  'hidden lg:grid lg:grid-cols-[64px_1fr_230px_250px] lg:gap-x-[28px] pb-3 font-mono text-[11px] leading-none font-medium tracking-[0.12em] text-text-faint uppercase'

function RecentWorkBlock({ publications, count }: { publications: Publication[]; count: number }) {
  return (
    <div data-testid="home-recent-work">
      <div className={COLUMN_HEAD}>
        <span>Year</span>
        <span>Title</span>
        <span>Journal</span>
        <span className="flex justify-between">
          <span>Link</span>
          <span className="tracking-[0.08em]">Latest five · by date</span>
        </span>
      </div>
      {publications.map((pub) => (
        <PublicationRow key={pub.id} pub={pub} variant="home" href={pub.href} />
      ))}
      <Link
        href="/publications"
        className="mt-5 inline-block font-mono text-[12px] font-medium tracking-[0.1em] text-link uppercase"
      >
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
      <Link
        href="/resources"
        className="mt-5 inline-block font-mono text-[12px] font-medium tracking-[0.1em] text-link uppercase"
      >
        All resources →
      </Link>
    </div>
  )
}

// -- Block 4: Outreach (MAESTRO), inverse ---------------------------------

// The identifier prints "REGISTER — <site without scheme>" verbatim --
// scheme stripped for display only, same `deriveLink` URL-label convention
// used everywhere else in this direction; the href keeps the full URL.
function siteLabel(site: string): string {
  return site.replace(/^https?:\/\//, '')
}

function OutreachBlock({ maestro }: { maestro: MaestroProjectPayload }) {
  return (
    <div data-testid="home-maestro">
      <div className="max-w-[720px] text-pretty break-words text-heading font-semibold" data-testid="maestro-title">
        {maestro.title}
      </div>
      <PortableBody blocks={maestro.overview} variant="inverse" />
      {maestro.site && (
        // No `data-identifier`: unlike PublicationRow/ResourceBlock's
        // identifiers, this anchor's rendered text is "REGISTER — <label>",
        // not the bare identifier -- e2e/redesign-components.spec.ts's
        // generic `[data-identifier]` contract asserts the *whole* element
        // text (scheme/`www.` stripped) is contained in `href`, which a
        // "REGISTER — " prefix would trip. Nothing here sets
        // `text-transform: uppercase` on this element or an ancestor, so
        // there's no uppercasing risk to guard against either.
        <a
          href={maestro.site}
          className="mt-5 inline-block font-mono text-[12px] leading-none tracking-[0.08em] break-all text-text-inverse underline underline-offset-4"
        >
          REGISTER — {siteLabel(maestro.site)}
        </a>
      )}
    </div>
  )
}

// -- Block 5: The lab -------------------------------------------------------

// [PI | members | support], one column below the breakpoint that
// introduces the three-column track -- same `grid-cols-1` +
// explicit-`lg:`-track pattern as every other CMS-text-holding grid in
// this direction (IDENTITY_GRID above, Research.tsx's NARRATIVE_GRID,
// People.tsx's SPOTLIGHT_GRID): without it, a long unbroken token (the PI
// name, a role) sets the implicit stacked track's min-content width and
// the grid overflows below `lg`.
const LAB_GRID = 'grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start lg:gap-x-12'

// A dedicated 64px-square portrait, not PersonCard.tsx's `PortraitFrame`:
// that component's footprint is a fixed `aspect-[4/5]` box at `w-full`
// (People's 220px spotlight, the card grid's own fractional widths), and
// getting a *square* 64px box out of it would mean overriding either
// `aspect-[4/5]` or `w-full` from outside -- exactly the same-CSS-property
// collision constraints.md forbids (two utilities, `aspect-[4/5]` from
// PortraitFrame's own FOOTPRINT_IMAGE/FOOTPRINT_FALLBACK plus whatever
// square-forcing utility this call site would need to append, both
// targeting `aspect-ratio`/`width` at the same breakpoint). A small
// dedicated component, mirroring PortraitFrame's own two branches
// (image / initials-and-stripe fallback) at this one fixed size, avoids
// the collision entirely -- same reasoning as Research.tsx's
// NARRATIVE_GRID_SOLO and ResourceBlock.tsx's `twoColumn` ternary: a
// second whole shape, not a bolted-on override.
//
// Fix round 1, point 4: the image branch now composes PersonCard.tsx's own
// exported `IMAGE_FILTER` (grayscale/contrast/hover-reveal treatment)
// instead of a bare `object-cover`, so the PI's Home portrait matches
// every other portrait in this direction rather than rendering in plain
// colour. `IMAGE_FILTER` only ever targets `object-fit`/filter/transition
// -- never `width`/`height`/`aspect-ratio` -- so it composes cleanly onto
// this component's own `h-16 w-16` sizing with no property collision.
// `STRIPE_BG` (the no-portrait fallback background) also now comes from
// tokens.ts, the same hoist PersonCard.tsx/ResourceBlock.tsx's own
// comments describe -- this was a third verbatim copy of the same string.

function PiPortrait64({ name, img }: { name: string; img?: string }) {
  if (img) {
    return (
      <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-surface-raised">
        <Image src={img} alt={name} fill sizes="64px" className={IMAGE_FILTER} />
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

function TheLabBlock({
  showPiPanel,
  labHead,
  memberCount,
  showMembersLine,
  supportPage,
}: {
  showPiPanel: boolean
  labHead: SettingsPayload['labHead']
  memberCount: number
  showMembersLine: boolean
  supportPage: SupportPagePayload | null
}) {
  return (
    <div className={LAB_GRID}>
      {/* Fix round 2, point 1: the whole portrait-plus-name row is now the
          one `Link` (`group`), not just the name text beside a plain
          portrait `div` -- `IMAGE_FILTER`'s `group-hover:`/
          `group-focus-visible:` halves only ever match `.group:hover &`/
          `.group:focus-visible &`, which needs the *group element itself*
          (not a descendant) to be hovered/focused. With the name as its
          own separate `<Link>` inside a plain `div`, neither pseudo-class
          selector could ever match anything -- hovering the portrait
          hovered the outer `div` (no `group` class), and focusing the name
          focused the inner `Link` (also no `group` class), so the
          grayscale reveal was permanently inert regardless of mouse or
          keyboard. Making the `Link` itself the `group` (and wrapping the
          portrait inside it, same shape as PersonCard.tsx's own `href`
          branch) means hovering or keyboard-focusing the one real
          interactive element is exactly what triggers the reveal, and
          focus-visible reaches it because the focusable element and the
          group element are now the same node. The "Principal investigator"
          label moves above the row (still outside the `Link` -- only the
          name is the identifier per the task brief, "the name (linked)")
          rather than beside the portrait only, so this is additive to the
          existing "min-w-0 column" shape below, not a redesign of it. */}
      {showPiPanel && labHead && (
        <div className="min-w-0">
          <div className={`${LABEL} mb-2.5`}>Principal investigator</div>
          <Link
            href={resolveLabHeadHref(labHead)}
            className="group flex min-w-0 items-center gap-5"
          >
            <PiPortrait64
              name={labHead.name ?? ''}
              img={
                labHead.image
                  ? (urlForImage(labHead.image as SanityImage)?.width(128).height(128).fit('crop').url() ?? undefined)
                  : undefined
              }
            />
            <span className="min-w-0 break-words text-[24px] font-semibold tracking-[-0.01em]">
              {labHead.name}
            </span>
          </Link>
        </div>
      )}
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
          <div className={`${LABEL} mb-2.5`}>Current members</div>
          <Link href="/people" className="text-[24px] font-semibold">
            {memberCount}{' '}
            <span className="font-mono text-[12px] font-normal text-text-faint">— PEOPLE →</span>
          </Link>
        </div>
      )}
      {supportPage && (
        <div className="min-w-0" data-testid="home-support">
          <div className={`${LABEL} mb-3`}>Support</div>
          <Link
            href={`/${supportPage.slug}`}
            className="font-mono text-[13px] leading-[1.5] font-medium tracking-[0.06em] text-link uppercase"
          >
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
  const showPiPanel = shouldShowLabHeadCard(settings) && Boolean(labHead)
  const showPeople = settings.showPeople !== false
  // Fix round 1, IMPORTANT 1: excludes the lab head from the count only
  // when Home's own PI panel actually renders (`showPiPanel`), not
  // unconditionally whenever `labHead` is merely set. Before this fix,
  // with `labHead` set and `showLabHeadOnHome === false`, Home hid the PI
  // panel *and* still subtracted the PI from the count -- that person
  // appeared nowhere on the page, yet still changed the number, an
  // internal inconsistency between what this same render shows and what
  // it counts. Gating the exclusion on `showPiPanel` (this page's own
  // "is the PI visible here" boolean, mirroring how `People.tsx` gates
  // `excludeLabHead` on its own `showSpotlight`) keeps Home internally
  // consistent, and -- since `showPiPanel` and `People.tsx`'s
  // `showSpotlight` are both "labHead set AND the page's own show flag"
  // -- the two pages' counts agree whenever `showLabHeadOnHome` and
  // `showLabHeadOnPeople` happen to carry the same value, which
  // `e2e/home.spec.ts` now cross-checks directly against /people's own
  // rendered meta rather than re-deriving the rule.
  const memberCount = currentMemberCount(profiles, roleGroups, showPiPanel ? labHead?._id : null)
  // Fix round 1, point 6: "0 — PEOPLE →" is never rendered -- the members
  // line needs both the page-level flag and an actual positive count.
  const showMembersLine = showPeople && memberCount > 0

  const showRecentWork = publications.length > 0 && settings.showPublications !== false
  const showResources = Boolean(resource)
  const showOutreach = Boolean(maestro)
  // "The lab" itself still renders whenever any one of its three parts
  // has content -- no longer keyed off `showPeople` alone, since a
  // `showPeople`-true page with zero current members (and no PI panel, no
  // support page) would otherwise render an empty rail.
  const showTheLab = showPiPanel || showMembersLine || Boolean(supportPage)

  const blocks: Array<{ label: string; inverse?: boolean; content: ReactNode }> = [
    {
      label: 'Identity',
      content: (
        <IdentityBlock home={home} siteName={siteName} settings={settings} headingLevel={headingLevel} />
      ),
    },
  ]
  if (showRecentWork) {
    blocks.push({
      label: 'Recent work',
      content: <RecentWorkBlock publications={publications} count={publicationCount} />,
    })
  }
  if (showResources && resource) {
    blocks.push({ label: 'Resources', content: <ResourcesBlock resource={resource} /> })
  }
  if (showOutreach && maestro) {
    blocks.push({ label: 'Outreach', inverse: true, content: <OutreachBlock maestro={maestro} /> })
  }
  if (showTheLab) {
    blocks.push({
      label: 'The lab',
      content: (
        <TheLabBlock
          showPiPanel={showPiPanel}
          labHead={labHead}
          memberCount={memberCount}
          showMembersLine={showMembersLine}
          supportPage={supportPage}
        />
      ),
    })
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <SectionRail
          key={block.label}
          num={String(index + 1).padStart(2, '0')}
          label={block.label}
          inverse={block.inverse}
          borderTop={index !== 0}
        >
          {block.content}
        </SectionRail>
      ))}
    </div>
  )
}
