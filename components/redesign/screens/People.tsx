import { PortableText, type PortableTextComponents } from '@portabletext/react'
import type { ArbitraryTypedObject, PortableTextBlock } from '@portabletext/types'
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
const SPOTLIGHT_GRID = 'grid gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-x-11 md:gap-y-0'
const SPOTLIGHT_PORTRAIT = 'max-w-[220px] md:max-w-none'

// Mono caps, faint -- ui_kit's "Head of laboratory · Principal investigator"
// label geometry, reusing the LABEL token rather than hand-rolling the same
// font-mono/uppercase/tracking triad again.
const SPOTLIGHT_LABEL_CLASS = LABEL

// Bio paragraphs: ui_kit's muted body style (font-size/line-height come from
// the paired `--text-body`/`--text-body--line-height` theme tokens, same as
// PageTitle's `text-title` companion pairing), capped at the ui_kit's 720px
// measure, wrapping naturally.
const BIO_PARAGRAPH = 'mt-4 max-w-[720px] text-pretty text-body text-text-muted'
// hl-link-style underlined link (this repo never ported the docs design
// system's literal `.hl-link` class into styles/index.css -- see PublicationPage.tsx's
// own IDENTIFIER constant for the same "reproduce the intent with Tailwind
// utilities" approach elsewhere in this direction).
const BIO_LINK = 'text-link underline'

const BIO_COMPONENTS: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p className={BIO_PARAGRAPH}>{children}</p>,
  },
  marks: {
    link: ({ children, value }) => (
      <a href={value?.href} className={BIO_LINK} rel="noreferrer noopener">
        {children}
      </a>
    ),
  },
}

const PROFILE_LINK_LABEL = 'mt-5 inline-block font-mono text-[12px] font-medium tracking-[0.1em] text-link uppercase'
const EMAIL_LINK = 'mt-5 block font-mono text-[12.5px] text-link normal-case!'

const SECTION_HEADING_ROW = 'mb-5 flex items-baseline gap-3.5 border-t border-rule pt-[18px]'
const SECTION_TITLE = `${LABEL_BASE} text-text-faint`
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

function labHeadBioBlocks(
  labHead: LabHead
): (PortableTextBlock | ArbitraryTypedObject)[] | null {
  if (labHead.fullBio && labHead.fullBio.length > 0) {
    return labHead.fullBio
  }
  return null
}

function SpotlightBlock({ labHead }: { labHead: LabHead }) {
  const img = labHead.image
    ? urlForImage(labHead.image as Image)?.width(440).height(550).fit('crop').url()
    : undefined
  const initials = initialsOf(labHead.name)
  const bioBlocks = labHeadBioBlocks(labHead)
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
      <div>
        <div className={SPOTLIGHT_LABEL_CLASS}>Head of laboratory · Principal investigator</div>
        <h2 className="mt-3 text-heading">{labHead.name}</h2>
        {bioBlocks ? (
          <PortableText value={bioBlocks} components={BIO_COMPONENTS} />
        ) : (
          labHead.bio && <p className={BIO_PARAGRAPH}>{labHead.bio}</p>
        )}
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
              <span data-testid="people-section-title" className={SECTION_TITLE}>
                {section.title}
              </span>
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
            <span key={profile._id}>
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
  // "The trailing ungrouped section counts as a group only if it has a
  // title" -- groupByRoleGroup already nulls the catch-all's title when it's
  // the only section left, so counting titled sections handles both cases:
  // a real roleGroup's title, and the "Other" catch-all's title when it sits
  // alongside at least one other section.
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
