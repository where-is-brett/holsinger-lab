import { urlForImage } from 'lib/sanity.image'
import Image from 'next/image'
import Link from 'next/link'
import type { Image as SanityImage } from 'sanity'
import type { ResearchProjectPayload } from 'types'

import { PageTitle } from '../PageTitle'
import { PortableBody } from '../PortableBody'
import { researchKicker } from '../researchModel'
import { SectionRail } from '../SectionRail'

// Composition follows
// docs/redesign-experiment/design-system/ui_kits/site/Research.jsx (task
// brief "Visual authority"), spec §2/§6: one `SectionRail` per
// `defined(researchOrder)` project, in `researchOrder` order, then an
// inverse Enquiries band. Production has zero such projects today (spec
// §2) -- the populated state is only ever exercised against the
// `gallery-research` fixture (app/preview/components/Gallery.tsx), same
// situation Task 1's Resources screen documented for its own empty
// dataset.

// The [text | 380px cover] grid, stacked below `lg` (task brief point 2:
// "sits in a 380px right column from lg, stacked ... before that"). Same
// `grid-cols-1` + explicit `lg:`-prefixed track pattern as
// PersonPage.tsx's PROFILE_GRID / People.tsx's SPOTLIGHT_GRID --
// `grid-cols-1` zeroes the implicit stacked track's min-content floor so a
// long unbroken token in the overview text (portable text can carry one,
// same class of defect PortableBody's own BIO_PARAGRAPH comment
// documents) can't blow the column out past the viewport. One unprefixed
// `grid-template-columns` declaration plus one `lg:` declaration -- never
// two for the same property at the same breakpoint (constraints.md).
//
// Two entire, separate class strings (not one base plus an appended
// override) -- same reasoning as ResourceBlock.tsx's own `twoColumn`
// ternary: when there is no cover there is no second grid item at all, and
// a `lg:grid-cols-[1fr_380px]` track definition with only one child still
// reserves the 380px column as empty space, leaving the text short of full
// width. `NARRATIVE_GRID_SOLO` never declares a second track, so the text
// genuinely spans the full content column when a project has no cover
// (task brief point 2: "the narrative uses the full width, with no
// placeholder box").
const NARRATIVE_GRID =
  'grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:items-start lg:gap-x-(--spacing-gutter-lg)'
const NARRATIVE_GRID_SOLO = 'grid grid-cols-1'

function ProjectKicker({ project }: { project: ResearchProjectPayload }) {
  const kicker = researchKicker({ start: project.start, category: project.category })
  const tagLine = (project.tags ?? []).filter((t): t is string => Boolean(t)).join(' · ')

  if (!kicker && !tagLine) return null

  return (
    <div className="font-mono text-[11px] leading-[1.6] font-medium tracking-[0.1em] text-text-faint uppercase">
      {kicker}
      {kicker && tagLine ? ' — ' : ''}
      {tagLine && <span className="text-link">{tagLine}</span>}
    </div>
  )
}

// Covers are never cropped (constraints.md): `width`/`height` come straight
// from the asset's own `metadata.dimensions`, not a fixed box, so `next/image`
// renders it at its intrinsic ratio and `h-auto w-full` lets the box follow.
//
// Production has zero `defined(researchOrder)` projects today (spec §2), so
// the varied-aspect-ratio case is only exercised by the `gallery-research`
// fixture (app/preview/components/Gallery.tsx / fixtures.ts). That fixture
// needs real, differently-shaped images -- `urlForImage` always requests a
// Sanity asset's own native upload size (no width/height transform is
// applied in this component, deliberately, so real covers are never
// resized off their native ratio), so the same real Sanity photo can't be
// reused to fabricate four different aspect ratios. A `/`-prefixed asset id
// is this fixture's own escape hatch -- a plain placeholder PNG served from
// `/public/fixtures` (task brief: "a plain placeholder served from
// /public"), at genuinely those pixel dimensions -- and is served directly;
// a real Sanity asset id never starts with '/', so every live project still
// goes through `urlForImage`.
function coverAsset(project: ResearchProjectPayload) {
  const cover = project.coverImage
  const width = cover?.asset?.metadata?.dimensions?.width
  const height = cover?.asset?.metadata?.dimensions?.height
  if (!cover || !width || !height) return null
  const assetId = cover.asset?._id
  // `coverImage` is queried with a dereferencing `asset->{...}` (needed to
  // reach `metadata.dimensions`), which -- same as settingsQuery's logo/
  // logoDark (sanity.image.ts's own comment) -- replaces `asset._ref` with
  // `asset._id`, leaving no structural overlap with `Image`'s `Reference`
  // shape for a direct cast. `urlForImage` itself already accepts this
  // shape (checks `_ref` OR `_id`); only the TypeScript cast needs the
  // `unknown` detour.
  const src = assetId?.startsWith('/')
    ? assetId
    : urlForImage(cover as unknown as SanityImage)?.url()
  if (!src) return null
  return { src, width, height }
}

function Narrative({ project }: { project: ResearchProjectPayload }) {
  const cover = coverAsset(project)

  return (
    <div className={cover ? NARRATIVE_GRID : NARRATIVE_GRID_SOLO}>
      <div className="min-w-0">
        <ProjectKicker project={project} />
        <h2
          data-testid="research-project-title"
          className="mt-4 max-w-[640px] text-pretty break-words text-heading font-semibold"
        >
          {project.title}
        </h2>
        <div className="mt-[22px] max-w-[680px]">
          <PortableBody blocks={project.overview} />
        </div>
      </div>
      {cover && (
        <Image
          data-testid="research-cover"
          src={cover.src}
          alt={project.title ?? ''}
          width={cover.width}
          height={cover.height}
          sizes="(min-width: 1024px) 380px, 100vw"
          className="h-auto w-full"
        />
      )}
    </div>
  )
}

// The IA's single enquiry line (spec §6): "Student and collaboration
// enquiries are welcome —", then the email as a `mailto:` identifier when
// `enquiryEmail` returns one, else a "get in touch" link to /contact when
// `showContactForm !== false`, else the sentence just ends. No "example
// wording" footnote -- that's mockup text (task brief point 3).
function Enquiries({ email, showContactForm }: { email: string | null; showContactForm?: boolean | null }) {
  return (
    <div className="max-w-[880px] text-pretty text-[23px] leading-[1.45] font-medium break-words">
      Student and collaboration enquiries are welcome
      {email ? (
        <>
          {' — '}
          <a
            href={`mailto:${email}`}
            className="font-mono text-[20px] leading-[1.4] break-all text-link-inverse underline underline-offset-[5px]"
            data-identifier
          >
            {email}
          </a>
        </>
      ) : showContactForm !== false ? (
        <>
          {' — '}
          <Link href="/contact" className="text-link-inverse underline underline-offset-[5px]">
            get in touch
          </Link>
        </>
      ) : (
        '.'
      )}
    </div>
  )
}

export function Research({
  projects,
  email,
  showContactForm,
}: {
  projects: ResearchProjectPayload[]
  email: string | null
  showContactForm?: boolean | null
}) {
  const n = projects.length

  return (
    <div>
      <PageTitle title="Research" meta={`${n} ACTIVE PROJECT${n === 1 ? '' : 'S'}`} />
      {n === 0 ? (
        <SectionRail>
          <p className="text-[14px] leading-[1.5] text-text-muted">
            Research projects will be listed here soon.
          </p>
        </SectionRail>
      ) : (
        projects.map((project, index) => (
          <SectionRail
            key={project._id}
            num={String(index + 1).padStart(2, '0')}
            label={project.tags?.[0] || 'Project'}
            borderTop={index !== 0}
          >
            <Narrative project={project} />
          </SectionRail>
        ))
      )}
      <SectionRail num={String(n + 1).padStart(2, '0')} label="Enquiries" inverse>
        <Enquiries email={email} showContactForm={showContactForm} />
      </SectionRail>
    </div>
  )
}
