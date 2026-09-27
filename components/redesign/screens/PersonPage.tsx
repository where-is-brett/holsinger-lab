import { urlForImage } from 'lib/sanity.image'
import Link from 'next/link'
import type { Image } from 'sanity'
import type { ProfileBySlugPayload } from 'types'

import { Button } from '../Button'
import { PageTitle } from '../PageTitle'
import { initialsOf } from '../peopleModel'
import { PortraitFrame } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import type { Publication } from '../publicationModel'
import { PublicationRow } from '../PublicationRow'
import { Section } from '../Section'

// `role`, plus ` · roleDetail` when set -- both CMS strings, printed
// verbatim, never uppercased or otherwise "corrected" here
// (constraints.md, "CMS text prints verbatim").
function metaOf(person: ProfileBySlugPayload): string | undefined {
  if (!person.role) {
    return undefined
  }
  return person.roleDetail ? `${person.role} · ${person.roleDetail}` : person.role
}

// [220px portrait | text] from `md`, stacked below it. `grid-cols-1` gives the
// stacked track a zero min-content floor, so an unbroken token in the bio (an
// inline email address) can't push the page wider than the viewport.
const PROFILE_GRID = 'grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-x-11 md:gap-y-0'
const PROFILE_PORTRAIT = 'max-w-[220px] md:max-w-none'

const IDENTIFIER_LINK = 'mt-5 block font-mono text-[12.5px] text-link'
// The address beside the email button is data, not a second link to the same place.
const EMAIL_ADDRESS = 'mt-3 font-mono text-[12.5px] leading-[1.5] break-all text-text-muted'

function ProfileBlock({ person }: { person: ProfileBySlugPayload }) {
  const img = person.image
    ? urlForImage(person.image as Image)?.width(440).height(550).fit('crop').url()
    : undefined
  const email = person.email?.trim() || null

  return (
    <div className={PROFILE_GRID}>
      <PortraitFrame
        name={person.name ?? ''}
        img={img}
        initials={initialsOf(person.name)}
        sizes="220px"
        className={PROFILE_PORTRAIT}
      />
      {/* `min-w-0`: this column holds unpredictable CMS text. */}
      <div className="min-w-0">
        <PortableBody blocks={person.fullBio} bio={person.bio} />
        {email && (
          <div className="mt-6">
            <Button href={`mailto:${email}`}>Send an email</Button>
            <p className={EMAIL_ADDRESS} data-identifier data-cms-verbatim>
              {email}
            </p>
          </div>
        )}
        {person.phone && (
          <a href={`tel:${person.phone}`} data-identifier data-cms-verbatim className={IDENTIFIER_LINK}>
            {person.phone}
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * `/people/[slug]`. `page.tsx` owns the fetch, metadata, JSON-LD and
 * `notFound`; `publications` arrive already filtered to this person
 * (`publicationsByPerson`) and bolding their surname.
 */
export function PersonPage({
  person,
  publications,
  headingLevel,
}: {
  person: ProfileBySlugPayload
  publications: Publication[]
  /** `'h2'` only in the /preview/components gallery, which has its own `<h1>`. */
  headingLevel?: 'h1' | 'h2'
}) {
  return (
    <div>
      <PageTitle title={person.name ?? ''} meta={metaOf(person)} headingLevel={headingLevel} />
      {/* The profile block has no heading of its own, so the label is its heading. */}
      <Section label="Profile" labelHeading borderTop={false}>
        <Link href="/people" className="text-[13px] leading-none font-medium text-link">
          ← All people
        </Link>
        <div className="mt-[26px]">
          <ProfileBlock person={person} />
        </div>
      </Section>
      {publications.length > 0 && (
        <Section label={`Publications (${publications.length})`} labelHeading>
          <div data-testid="person-publications">
            {publications.map((pub) => (
              <PublicationRow key={pub.id} pub={pub} href={pub.href} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
