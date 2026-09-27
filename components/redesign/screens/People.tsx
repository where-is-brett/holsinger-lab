import { urlForImage } from 'lib/sanity.image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Image } from 'sanity'
import type { ProfilePayload, RoleGroupPayload, SettingsPayload } from 'types'

import { PageTitle } from '../PageTitle'
import {
  excludeLabHead,
  flattenMembers,
  formatPeopleMeta,
  groupByRoleGroup,
  initialsOf,
  type MemberCard,
  memberCount,
  profileSaysMore,
  roleLine,
  shouldShowLabHeadSpotlight,
  splitAlumni,
} from '../peopleModel'
import { PersonCard, PortraitFrame } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import { Section } from '../Section'

// [220px portrait | text] from `md`; stacked below it, with the portrait
// capped at 220px so it doesn't run full-bleed on a phone. `grid-cols-1`
// gives the stacked track a zero min-content floor, so an unbroken token in
// the bio (an inline email address) can't widen the page.
const SPOTLIGHT_GRID = 'grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-x-11 md:gap-y-0'
const SPOTLIGHT_PORTRAIT = 'max-w-[220px] md:max-w-none'
const PROFILE_LINK = 'mt-5 inline-block text-[14px] font-medium text-link'
const EMAIL_LINK = 'mt-5 block font-mono text-[12.5px] text-link'

// One continuous grid: 2 columns on phones, 3 from `md`, 6 from `lg`. Each
// card carries its own group label, so groups flow on with no half-empty
// rows.
const CARD_GRID = 'grid grid-cols-2 gap-x-6 gap-y-7 md:grid-cols-3 lg:grid-cols-6'

// A name list: 1 column on phones, 3 from `md`, 4 from `lg`.
const ALUMNI_GRID = 'grid grid-cols-1 gap-x-6 gap-y-2.5 md:grid-cols-3 lg:grid-cols-4'
const ALUMNI_NAME = 'text-body break-words'
// An underline, not colour alone, marks a linked name among plain ones (axe's
// link-in-text-block rule).
const ALUMNI_LINK = 'text-link underline'

type LabHead = NonNullable<SettingsPayload['labHead']>

function SpotlightBlock({ labHead, publicationCount }: { labHead: LabHead; publicationCount: number }) {
  const img = labHead.image
    ? urlForImage(labHead.image as Image)?.width(440).height(550).fit('crop').url()
    : undefined
  const hasPage = Boolean(labHead.hasPage && labHead.slug)
  const showProfileLink =
    hasPage && profileSaysMore({ publicationCount, bio: labHead.bio, fullBio: labHead.fullBio })
  // The short `bio` when there is one; the profile page carries `fullBio`.
  const shortBio = labHead.bio?.trim() ? labHead.bio : null

  return (
    <div data-testid="people-spotlight" data-name={labHead.name ?? ''} className={SPOTLIGHT_GRID}>
      <PortraitFrame
        name={labHead.name ?? ''}
        img={img}
        initials={initialsOf(labHead.name)}
        sizes="220px"
        className={SPOTLIGHT_PORTRAIT}
      />
      {/* `min-w-0`: this column holds unpredictable CMS text. */}
      <div className="min-w-0">
        <h2 className="text-heading break-words">{labHead.name}</h2>
        {shortBio ? <PortableBody bio={shortBio} /> : <PortableBody blocks={labHead.fullBio} />}
        {labHead.email && (
          <a href={`mailto:${labHead.email}`} data-identifier data-cms-verbatim className={EMAIL_LINK}>
            {labHead.email}
          </a>
        )}
        {showProfileLink && (
          <Link href={`/people/${labHead.slug}`} className={PROFILE_LINK}>
            Profile and publications →
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
  return profile.image ? urlForImage(profile.image as Image)?.width(400).height(500).fit('crop').url() : undefined
}

function MembersBlock({ cards }: { cards: MemberCard<ProfilePayload>[] }) {
  return (
    <div data-testid="people-members" className={CARD_GRID}>
      {cards.map(({ profile, group }) => (
        <div key={profile._id} data-testid="person-card" data-name={profile.name ?? ''} data-group={group ?? ''}>
          <PersonCard
            name={profile.name ?? ''}
            group={group}
            role={roleLine(profile.role, group)}
            detail={profile.roleDetail}
            img={cardImg(profile)}
            initials={initialsOf(profile.name)}
            href={cardHref(profile)}
          />
        </div>
      ))}
    </div>
  )
}

function AlumniBlock({ alumni }: { alumni: ProfilePayload[] }) {
  return (
    // `role="list"`: list-style removal (via ALUMNI_GRID's own reset, or the
    // browser default for a styled grid) drops list semantics for VoiceOver
    // on WebKit -- this restores it explicitly rather than relying on the
    // element's own tag.
    <ul data-testid="people-alumni" role="list" className={ALUMNI_GRID}>
      {alumni.map((profile) => {
        const href = cardHref(profile)
        const name = profile.name ?? ''
        return (
          <li key={profile._id} data-testid="alumni-name" data-name={name} className={ALUMNI_NAME}>
            {href ? (
              <Link href={href} className={ALUMNI_LINK}>
                {name}
              </Link>
            ) : (
              name
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function People({
  settings,
  profiles,
  roleGroups,
  labHeadPublicationCount = 0,
  headingLevel,
}: {
  settings: SettingsPayload
  profiles: ProfilePayload[]
  roleGroups: RoleGroupPayload[]
  /** The lab head's paper count (`countPublicationsByPerson`), for the spotlight's profile-link rule. */
  labHeadPublicationCount?: number
  /** Forwarded to PageTitle -- see its own doc comment. Only ever set by the
   * /preview/components gallery, which renders instances of this screen
   * alongside its own `<h1>`. The real /people route never passes this, so
   * it always gets the correct `<h1>`. */
  headingLevel?: 'h1' | 'h2'
}) {
  const showSpotlight = shouldShowLabHeadSpotlight(settings)
  const labHead = settings.labHead
  // The lab head leaves the grid only when the spotlight actually renders --
  // with the spotlight hidden
  // (labHead unset, or showLabHeadOnPeople off), the PI appears in the grid
  // like anyone else, so nobody disappears from the page.
  const gridProfiles = showSpotlight && labHead ? excludeLabHead(profiles, labHead._id) : profiles
  const { members, alumni } = splitAlumni(groupByRoleGroup(gridProfiles, roleGroups))
  const cards = flattenMembers(members)

  // The trailing ungrouped catch-all is always unheaded
  // (groupByRoleGroup gives it `title: null` unconditionally) and never
  // counted as a group -- counting titled sections here is what keeps it
  // out of `g` without any special-casing of the 'other' id.
  const meta = formatPeopleMeta({
    showSpotlight,
    n: memberCount(members),
    g: members.filter((section) => section.title).length,
  })

  // The spotlight has its own heading (the lab head's name). Members and
  // Alumni have none of their own -- one continuous grid/list per section --
  // so their `Section` label is the section's only heading (finding-11
  // closure: no stacked inner label repeating it).
  const blocks: Array<{ label: string; labelHeading: boolean; content: ReactNode }> = []
  if (showSpotlight && labHead) {
    blocks.push({
      label: 'Lab head',
      labelHeading: false,
      content: <SpotlightBlock labHead={labHead} publicationCount={labHeadPublicationCount} />,
    })
  }
  if (cards.length > 0) {
    blocks.push({ label: 'Members', labelHeading: true, content: <MembersBlock cards={cards} /> })
  }
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
