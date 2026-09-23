import { urlForImage } from 'lib/sanity.image'
import Link from 'next/link'
import type { Image } from 'sanity'
import type { ProfileBySlugPayload } from 'types'

import { PageTitle } from '../PageTitle'
import { initialsOf } from '../peopleModel'
import { PortraitFrame } from '../PersonCard'
import { PortableBody } from '../PortableBody'
import { Section } from '../Section'

// Task brief §5 point 1: `meta` is `role`, plus ` · roleDetail` when set,
// verbatim -- both CMS strings printed exactly as stored, never uppercased
// or otherwise "corrected" here (constraints.md, "CMS text prints
// verbatim"). PageTitle itself may render `meta` uppercased via CSS (a
// label-geometry choice, not a text transform this component performs), so
// the DOM text these two values are concatenated into stays byte-identical
// to the source fields.
function metaOf(person: ProfileBySlugPayload): string | undefined {
  if (!person.role) {
    return undefined
  }
  return person.roleDetail ? `${person.role} · ${person.roleDetail}` : person.role
}

// Same [220px portrait | text] grid as People.tsx's own SPOTLIGHT_GRID
// (task brief §5 point 2), stacked below `md`. One unprefixed `gap-6`
// (both axes, for the stacked case) plus one `md:` override each for
// `gap-x`/`gap-y` -- a responsive pair per property, never two utilities
// for the same property at the same breakpoint (constraints.md).
//
// `grid-cols-1` (unprefixed): without an explicit single-column track below
// `md`, the implicit grid track CSS creates for the two stacked children
// (portrait, text) sets its own min-content floor from the widest
// unbreakable run of text inside them -- not their max-content width, their
// min-content width, i.e. the narrowest that track can shrink to without
// breaking a single unbroken token -- so a long unbroken run in the bio
// (Damian Holsinger's live `fullBio` inlines his email as plain text) pushed
// the track past the viewport instead of being constrained to it. The
// shorter gallery fixture text in redesign-components.spec.ts didn't
// trigger this until fix round 1 gave it a matching unbreakable token.
// `grid-cols-1` compiles to `grid-template-columns: repeat(1, minmax(0,
// 1fr))`, which already zeroes that track's min-content floor on its own --
// the `min-w-0` below is belt-and-braces, not load-bearing for this fix.
// `grid-cols-1` and `md:grid-cols-[220px_1fr]` are one unprefixed
// declaration plus one `md:` declaration for the same property -- not a
// same-breakpoint collision.
const PROFILE_GRID = 'grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-x-11 md:gap-y-0'
const PROFILE_PORTRAIT = 'max-w-[220px] md:max-w-none'

const IDENTIFIER_LINK = 'mt-5 block font-mono text-[12.5px] text-link'

function ProfileBlock({ person }: { person: ProfileBySlugPayload }) {
  const img = person.image
    ? urlForImage(person.image as Image)?.width(440).height(550).fit('crop').url()
    : undefined
  const initials = initialsOf(person.name)

  return (
    <div className={PROFILE_GRID}>
      <PortraitFrame
        name={person.name ?? ''}
        img={img}
        initials={initials}
        sizes="220px"
        className={PROFILE_PORTRAIT}
      />
      {/* `min-w-0`: belt-and-braces, not load-bearing here -- `grid-cols-1`
          above already compiles to `minmax(0, 1fr)`, which zeroes this
          track's min-content floor on its own. Added anyway to match the
          existing convention (PageTitle.tsx's `<h1>`, SectionRail.tsx's
          content column) of guarding every grid/flex item that holds
          unpredictable CMS text, in case a future edit narrows the track
          back to a bare `1fr` without carrying this comment along. */}
      <div className="min-w-0">
        <PortableBody blocks={person.fullBio} bio={person.bio} />
        {person.email && (
          <a href={`mailto:${person.email}`} data-identifier className={IDENTIFIER_LINK}>
            {person.email}
          </a>
        )}
        {person.phone && (
          <a href={`tel:${person.phone}`} data-identifier className={IDENTIFIER_LINK}>
            {person.phone}
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * `/people/[slug]` -- restyled on the redesign primitives (task brief §5
 * point 5, spec §5 item 5). `page.tsx` keeps its fetch, metadata, JSON-LD
 * and `notFound` behaviour; this is the server-component screen it renders.
 */
export function PersonPage({ person }: { person: ProfileBySlugPayload }) {
  return (
    <div>
      <PageTitle title={person.name ?? ''} meta={metaOf(person)} />
      {/* Task 2: `labelHeading` true -- `ProfileBlock` has no heading of its
          own (just a bio and identifier links), so `Profile` is this
          section's only one. */}
      <Section label="Profile" labelHeading borderTop={false}>
        {/* Copied from PublicationPage.tsx's own back-link styling -- same
            "← All ..." mono-caps label geometry, linking back to the index
            route this detail page belongs under. */}
        <Link
          href="/people"
          className="font-mono text-[11px] leading-none font-medium tracking-[0.1em] text-link uppercase"
        >
          ← All people
        </Link>
        <div className="mt-[26px]">
          <ProfileBlock person={person} />
        </div>
      </Section>
    </div>
  )
}
