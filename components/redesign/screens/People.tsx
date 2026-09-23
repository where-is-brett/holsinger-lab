import { urlForImage } from 'lib/sanity.image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Image } from 'sanity'
import type { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'

import { PageTitle } from '../PageTitle'
import {
  excludeLabHead,
  formatPeopleMeta,
  groupByRoleGroup,
  initialsOf,
  memberCount,
  type RoleGroupSection,
  shouldShowLabHeadSpotlight,
  splitAlumni,
} from '../peopleModel'
import { PersonCard, PortraitFrame } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import { Section } from '../Section'
import { MICRO_LABEL } from '../tokens'

// Composition follows docs/redesign-experiment/design-system/ui_kits/site/People.jsx
// (task brief §"Visual authority"). Blocks render as an ordered list of
// `Section`s, same pattern as PublicationPage.tsx's own `blocks` array --
// an omitted block (no spotlight when settings.labHead is unset, no Alumni
// section when the group is empty) simply isn't pushed.

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

// Task 3: sentence-case Archivo, reusing the MICRO_LABEL token rather than
// hand-rolling the same font-sans/13px/500 triad again -- was mono-caps
// uppercase (LABEL) before, which the micro-label budget rule now forbids
// for anything that isn't a data column head.
const SPOTLIGHT_LABEL_CLASS = MICRO_LABEL

const PROFILE_LINK_LABEL = 'mt-5 inline-block text-[14px] font-medium text-link'
// No `normal-case!`: nothing on the ancestor chain sets `text-transform:
// uppercase` for this element (unlike PublicationPage.tsx's IDENTIFIER,
// which guards against `.hl-identifier`'s global `text-transform: none
// !important` rule being needed against an uppercase ancestor) -- fix round
// 1 removed it as dead weight.
const EMAIL_LINK = 'mt-5 block font-mono text-[12.5px] text-link'

const SECTION_HEADING_ROW = 'mb-5 flex items-baseline gap-3.5 border-t border-rule pt-[18px]'
// Task 3: sentence-case Archivo, not uppercase mono (was LABEL_BASE) -- a
// role-group title is real CMS content (constraints.md's "CMS text prints
// verbatim"), so forcing it into caps was always presentational overreach,
// and it also blew the micro-label budget on /people whenever more than a
// couple of groups render. `break-words` stays: a long `title` can still
// overflow this column (see PageTitle.tsx's canonical note; `hyphens-auto`
// removed in the final-review fix round -- it was never inert here, since
// the text isn't forced upper-case, but it hyphenated inconsistently
// across platforms for no benefit the word-fit budget doesn't already
// cover).
const SECTION_TITLE = `${MICRO_LABEL} break-words`
// The member-count badge next to it: same mono digits as before, just no
// `text-transform` -- a bare number renders identically either way, but the
// computed style still reported 'uppercase' (LABEL_BASE), which counted
// toward the budget regardless of there being no letters to transform.
const SECTION_COUNT = 'font-mono text-[11px] leading-none font-medium text-link'

// 2 columns on phone, 3 from `md`, 6 from `lg` (spec §5 point 3). Gap matches
// the ui_kit's "28px 24px" (row, column): `gap-y-7`/`gap-x-6` are Tailwind's
// exact 28px/24px steps, so no arbitrary value is needed.
const CARD_GRID = 'grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-3 lg:grid-cols-6'

const ALUMNI_LABEL = MICRO_LABEL
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
          and `Section.tsx`'s existing convention of guarding every
          grid/flex item that holds unpredictable CMS text, in case a future
          edit narrows the track back to a bare `1fr`. */}
      <div className="min-w-0">
        <div className={SPOTLIGHT_LABEL_CLASS}>Head of laboratory · Principal investigator</div>
        {/* `break-words` (see PageTitle.tsx's canonical note; `hyphens-auto`
            removed in the final-review fix round) -- a name is CMS text. */}
        <h2 className="mt-3 text-heading break-words">{labHead.name}</h2>
        <PortableBody blocks={labHead.fullBio} bio={labHead.bio} />
        {labHead.email && (
          <a href={`mailto:${labHead.email}`} data-identifier data-cms-verbatim className={EMAIL_LINK}>
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
  const meta = formatPeopleMeta({ showSpotlight, n, g })

  // Task 2: `labelHeading` per block -- `Lab head` and `Members` already
  // have their own in-content heading (`SpotlightBlock`'s labHead-name
  // `<h2>`; each role group's own `<h2 data-testid="people-section-title">`
  // inside `MembersBlock`), so their `Section` label stays a `<p>`.
  // `Alumni` has none (`AlumniBlock` is just a mono label plus a
  // paragraph), so its label is the section's only heading.
  const blocks: Array<{ label: string; labelHeading?: boolean; content: ReactNode }> = []
  if (showSpotlight && labHead) {
    blocks.push({ label: 'Lab head', content: <SpotlightBlock labHead={labHead} /> })
  }
  blocks.push({ label: 'Members', content: <MembersBlock sections={members} /> })
  if (alumni.length > 0) {
    blocks.push({ label: 'Alumni', labelHeading: true, content: <AlumniBlock alumni={alumni} /> })
  }

  return (
    <div>
      <PageTitle title="People" meta={meta} headingLevel={headingLevel} />
      {blocks.map((block, index) => (
        <Section key={block.label} label={block.label} labelHeading={block.labelHeading} borderTop={index !== 0}>
          {block.content}
        </Section>
      ))}
    </div>
  )
}
