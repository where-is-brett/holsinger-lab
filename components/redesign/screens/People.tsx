import { urlForImage } from 'lib/sanity.image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Image } from 'sanity'
import type { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'

import { PageTitle } from '../PageTitle'
import {
  excludeLabHead,
  groupByRoleGroup,
  initialsOf,
  memberCount,
  type RoleGroupSection,
  shouldShowLabHeadSpotlight,
  splitAlumni,
} from '../peopleModel'
import { PersonCard, PortraitFrame } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import { SectionRail } from '../SectionRail'
import { LABEL, LABEL_BASE } from '../tokens'

// Composition follows docs/redesign-experiment/design-system/ui_kits/site/People.jsx
// (task brief §"Visual authority"). Blocks are numbered in render order, with
// no gaps -- same pattern as PublicationPage.tsx's own `blocks` array -- so an
// omitted block (no spotlight when settings.labHead is unset, no Alumni
// section when the group is empty) never leaves a skipped number.

// The 220px portrait column, from `md`; stacked below it with the portrait
// itself capped at the same 220px width so it doesn't stretch full-bleed on
// a phone (spec §5 point 2). `gap-x-11` is Tailwind's 2.75rem step -- exactly
// the ui_kit's 44px column gap -- so no arbitrary value is needed. One
// unprefixed `gap-6` (both axes, for the stacked case) plus one `md:`
// override each for `gap-x`/`gap-y`: a responsive pair per property, not two
// utilities fighting for the same property at the same breakpoint
// (constraints.md).
//
// Fix round 1 (PR B Task 3): `grid-cols-1` (unprefixed), paired with the
// existing `md:grid-cols-[220px_1fr]` -- without an explicit single-column
// track below `md`, the implicit grid track CSS creates for the two stacked
// children (portrait, text) sets its own min-content width from the widest
// unbreakable run of text inside them, rather than being constrained to the
// viewport. A long unbroken token in the bio (an inline email address --
// exactly what the live Damian Holsinger `fullBio` contains, and what the
// gallery fixture's own bio now includes, see fixtures.ts) pushes that
// min-content past 320px and the page overflows. Same defect, same fix as
// `PersonPage.tsx`'s `PROFILE_GRID` (task-3 report) -- caught there first
// against live data, then reproduced here once the gallery fixture carried
// the same shape of token.
const SPOTLIGHT_GRID = 'grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-x-11 md:gap-y-0'
const SPOTLIGHT_PORTRAIT = 'max-w-[220px] md:max-w-none'

// Mono caps, faint -- ui_kit's "Head of laboratory · Principal investigator"
// label geometry, reusing the LABEL token rather than hand-rolling the same
// font-mono/uppercase/tracking triad again.
const SPOTLIGHT_LABEL_CLASS = LABEL

const PROFILE_LINK_LABEL = 'mt-5 inline-block font-mono text-[12px] font-medium tracking-[0.1em] text-link uppercase'
// No `normal-case!`: nothing on the ancestor chain sets `text-transform:
// uppercase` for this element (unlike PublicationPage.tsx's IDENTIFIER,
// which guards against `.hl-identifier`'s global `text-transform: none
// !important` rule being needed against an uppercase ancestor) -- fix round
// 1 removed it as dead weight.
const EMAIL_LINK = 'mt-5 block font-mono text-[12.5px] text-link'

const SECTION_HEADING_ROW = 'mb-5 flex items-baseline gap-3.5 border-t border-rule pt-[18px]'
// `hyphens-auto` is inert here (an all-caps mono label -- LABEL_BASE
// uppercases it -- and Blink hyphenates neither all-caps nor capitalised
// words), kept only for consistency with every other heading;
// `break-words` is what actually keeps a long roleGroup `title` from
// overflowing (see PageTitle.tsx's canonical note).
const SECTION_TITLE = `${LABEL_BASE} text-text-faint break-words hyphens-auto`
const SECTION_COUNT = `${LABEL_BASE} text-link`

// 2 columns on phone, 3 from `md`, 6 from `lg` (spec §5 point 3). Gap matches
// the ui_kit's "28px 24px" (row, column): `gap-y-7`/`gap-x-6` are Tailwind's
// exact 28px/24px steps, so no arbitrary value is needed.
const CARD_GRID = 'grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-3 lg:grid-cols-6'

const ALUMNI_LABEL = LABEL
const ALUMNI_PARAGRAPH = 'max-w-[820px] text-pretty text-body text-text-muted'
// `underline` (not just `text-link`): axe's link-in-text-block rule flags an
// inline link that relies on colour alone against its surrounding muted
// prose -- confirmed empirically against the gallery fixture's alumni
// paragraph. An underline is the one visual cue that always satisfies it
// regardless of the two colours' actual contrast ratio.
const ALUMNI_LINK = 'text-link underline'

type LabHead = NonNullable<SettingsPayload['labHead']>

function SpotlightBlock({ labHead }: { labHead: LabHead }) {
  const img = labHead.image
    ? urlForImage(labHead.image as Image)?.width(440).height(550).fit('crop').url()
    : undefined
  const initials = initialsOf(labHead.name)
  const href = labHead.hasPage && labHead.slug ? `/people/${labHead.slug}` : null

  return (
    <div data-testid="people-spotlight" data-name={labHead.name ?? ''} className={SPOTLIGHT_GRID}>
      <PortraitFrame
        name={labHead.name ?? ''}
        img={img}
        initials={initials}
        sizes="220px"
        className={SPOTLIGHT_PORTRAIT}
      />
      {/* `min-w-0`: belt-and-braces alongside `grid-cols-1` above --
          `grid-cols-1` alone already compiles to `grid-template-columns:
          repeat(1, minmax(0, 1fr))`, which zeroes the track's own
          min-content floor, so this isn't strictly required for the
          overflow this fix addresses. Added anyway to match `PageTitle.tsx`
          and `SectionRail.tsx`'s existing convention of guarding every
          grid/flex item that holds unpredictable CMS text, in case a future
          edit narrows the track back to a bare `1fr`. */}
      <div className="min-w-0">
        <div className={SPOTLIGHT_LABEL_CLASS}>Head of laboratory · Principal investigator</div>
        {/* Task 1 fix round 1: `break-words` kept alongside `hyphens-auto`
            (see PageTitle.tsx's note) -- a name is CMS text. */}
        <h2 className="mt-3 text-heading break-words hyphens-auto">{labHead.name}</h2>
        <PortableBody blocks={labHead.fullBio} bio={labHead.bio} />
        {labHead.email && (
          <a href={`mailto:${labHead.email}`} data-identifier className={EMAIL_LINK}>
            {labHead.email}
          </a>
        )}
        {href && (
          <Link href={href} className={PROFILE_LINK_LABEL}>
            Full profile →
          </Link>
        )}
      </div>
    </div>
  )
}

function cardHref(profile: ProfilePayload): string | null {
  return profile.hasPage && profile.slug ? `/people/${profile.slug}` : null
}

function cardImg(profile: ProfilePayload): string | undefined {
  return profile.image
    ? urlForImage(profile.image as Image)?.width(400).height(500).fit('crop').url()
    : undefined
}

function MembersBlock({ sections }: { sections: RoleGroupSection<ProfilePayload>[] }) {
  return (
    <div data-testid="people-members" className="flex flex-col gap-9">
      {sections.map((section) => (
        <div key={section.id} data-testid="people-section">
          {section.title && (
            <div className={SECTION_HEADING_ROW}>
              {/* Fix round 1: a real `h2`, not a `span` -- screen-reader users
                  navigate a page's headings list, and a role-group title
                  ("Research Scientist", "Lab Alumni", ...) is exactly the
                  kind of section landmark that belongs in it. Same visual
                  style as before (SECTION_TITLE is unchanged); Tailwind's
                  Preflight already zeroes `h2`'s default margin, so no
                  layout shift. Heading order stays valid: this sits under
                  the page's own `h1`/PageTitle and the spotlight's `h2`
                  (labHead name), never skipping a level, and repeated `h2`s
                  at the same level (one per section) are not a heading-order
                  violation. */}
              <h2 data-testid="people-section-title" className={SECTION_TITLE}>
                {section.title}
              </h2>
              <span className={SECTION_COUNT}>{section.profiles.length}</span>
            </div>
          )}
          <div className={CARD_GRID}>
            {section.profiles.map((profile) => (
              <div key={profile._id} data-testid="person-card" data-name={profile.name ?? ''}>
                <PersonCard
                  name={profile.name ?? ''}
                  role={profile.role ?? ''}
                  detail={profile.roleDetail}
                  img={cardImg(profile)}
                  initials={initialsOf(profile.name)}
                  href={cardHref(profile)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AlumniBlock({ alumni }: { alumni: ProfilePayload[] }) {
  return (
    <div data-testid="people-alumni">
      <div className={`${ALUMNI_LABEL} mb-4`}>Recent lab alumni</div>
      <p className={ALUMNI_PARAGRAPH}>
        {alumni.map((profile, index) => {
          const href = cardHref(profile)
          const name = profile.name ?? ''
          return (
            // `data-name` (fix round 1): a name can itself contain ", " (a
            // suffix like "Smith, Jr."), so an e2e test reading this
            // paragraph's rendered text and splitting on ", " could
            // misparse it. `data-name` on each entry gives a test the exact
            // name string directly, with no parsing.
            <span key={profile._id} data-testid="alumni-name" data-name={name}>
              {index > 0 && ', '}
              {href ? (
                <Link href={href} className={ALUMNI_LINK}>
                  {name}
                </Link>
              ) : (
                name
              )}
            </span>
          )
        })}
      </p>
    </div>
  )
}

function formatMeta({
  showSpotlight,
  n,
  g,
}: {
  showSpotlight: boolean
  n: number
  g: number
}): string {
  const membersLabel = n === 1 ? 'CURRENT MEMBER' : 'CURRENT MEMBERS'
  const groupsLabel = g === 1 ? 'GROUP' : 'GROUPS'
  return `${showSpotlight ? 'LAB HEAD + ' : ''}${n} ${membersLabel} · ${g} ${groupsLabel}`
}

export function People({
  settings,
  profiles,
  roleGroups,
  headingLevel,
}: {
  settings: SettingsPayload
  profiles: ProfilePayload[]
  roleGroups: RoleGroupPayload[]
  /** Forwarded to PageTitle -- see its own doc comment. Only ever set by the
   * /preview/components gallery, which renders two instances of this screen
   * alongside its own `<h1>`. The real /people route never passes this, so
   * it always gets the correct `<h1>`. */
  headingLevel?: 'h1' | 'h2'
}) {
  const showSpotlight = shouldShowLabHeadSpotlight(settings)
  const labHead = settings.labHead
  // The lab head is only excluded from the grid when the spotlight actually
  // renders (spec §5 point 3, task brief block 3) -- with the spotlight
  // hidden (labHead unset, or showLabHeadOnPeople off), the PI appears in
  // its own section like anyone else, so nobody disappears from the page.
  const gridProfiles =
    showSpotlight && labHead ? excludeLabHead(profiles, labHead._id) : profiles
  const sections = groupByRoleGroup(gridProfiles, roleGroups)
  const { members, alumni } = splitAlumni(sections)

  const n = memberCount(members)
  // Spec §5.3 ruling: the trailing ungrouped catch-all is always unheaded
  // (groupByRoleGroup gives it `title: null` unconditionally) and never
  // counted as a group -- counting titled sections here is what keeps it
  // out of `g` without any special-casing of the 'other' id.
  const g = members.filter((section) => section.title).length
  const meta = formatMeta({ showSpotlight, n, g })

  const blocks: Array<{ label: string; content: ReactNode }> = []
  if (showSpotlight && labHead) {
    blocks.push({ label: 'Lab head', content: <SpotlightBlock labHead={labHead} /> })
  }
  blocks.push({ label: 'Members', content: <MembersBlock sections={members} /> })
  if (alumni.length > 0) {
    blocks.push({ label: 'Alumni', content: <AlumniBlock alumni={alumni} /> })
  }

  return (
    <div>
      <PageTitle title="People" meta={meta} headingLevel={headingLevel} />
      {blocks.map((block, index) => (
        <SectionRail
          key={block.label}
          num={String(index + 1).padStart(2, '0')}
          label={block.label}
          borderTop={index !== 0}
        >
          {block.content}
        </SectionRail>
      ))}
    </div>
  )
}
