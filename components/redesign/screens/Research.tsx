import Image from 'next/image'
import Link from 'next/link'

import { PageTitle } from '../PageTitle'
import { PortableBody } from '../PortableBody'
import type { ResearchProjectView } from '../researchModel'
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
//
// Fix round 1 ruling 1: this screen renders `ResearchProjectView`s only --
// `researchModel.ts`'s `toResearchView` is the one place a raw
// `ResearchProjectPayload` (whatever `researchProjectsQuery` returns) turns
// into what's actually rendered, cover URL included. The page maps real
// query results through it; the gallery fixture builds view models
// directly (fixtures.ts), so this component never has to know the
// difference between a live Sanity asset and a fixture one.

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

function ProjectKicker({ project }: { project: ResearchProjectView }) {
  if (!project.kicker && !project.tagLine) return null

  return (
    <div className="font-mono text-[11px] leading-[1.6] font-medium tracking-[0.1em] text-text-faint uppercase">
      {project.kicker}
      {project.kicker && project.tagLine ? ' — ' : ''}
      {project.tagLine && <span className="text-link">{project.tagLine}</span>}
    </div>
  )
}

function Narrative({ project }: { project: ResearchProjectView }) {
  const cover = project.cover

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
        {/* IMPORTANT 1 (fix round 1): the overview is lead-size body colour
            (`variant="lead"`), per the brief and the ui_kit's own `Narrative`
            body paragraph (`fontSize: "var(--text-lead)"`, no muted colour
            override) -- not the bio's smaller, muted default.

            `project.body` is `overview`, falling back to `description` when
            there's no overview (researchModel.ts's `resolveBody`) -- the
            two Wix-imported projects only carry `description`. This screen
            never reads either raw field itself; `PortableBody` already
            renders nothing when `blocks` is null, so the paragraph is
            omitted entirely for a project with neither. */}
        <PortableBody blocks={project.body} variant="lead" />
      </div>
      {cover && (
        <Image
          data-testid="research-cover"
          src={cover.src}
          alt={cover.alt}
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
// `enquiryEmail` returns one. Otherwise, when `showContactForm !== false`,
// a link "get in touch" → /contact. Otherwise the sentence ends at
// "welcome.". No "example wording" footnote -- that's mockup text (task
// brief point 3).
function Enquiries({ email, showContactForm }: { email: string | null; showContactForm?: boolean | null }) {
  return (
    <div
      data-testid="research-enquiries"
      className="max-w-[880px] text-pretty text-[23px] leading-[1.45] font-medium break-words"
    >
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
  headingLevel,
}: {
  projects: ResearchProjectView[]
  email: string | null
  showContactForm?: boolean | null
  /** Forwarded to PageTitle -- see its own doc comment and People.tsx's
   * identical prop. Fix round 2: the gallery now renders three `Research`
   * instances alongside its own `<h1>` (and People's own two), so every
   * instance here needs the same `<h2>` treatment those already get. The
   * real /research route never passes this, so it always gets the correct
   * `<h1>`. */
  headingLevel?: 'h1' | 'h2'
}) {
  const n = projects.length

  return (
    <div>
      <PageTitle
        title="Research"
        meta={`${n} ACTIVE PROJECT${n === 1 ? '' : 'S'}`}
        headingLevel={headingLevel}
      />
      {n === 0 ? (
        <SectionRail>
          <p className="text-[14px] leading-[1.5] text-text-muted">
            Research projects will be listed here soon.
          </p>
        </SectionRail>
      ) : (
        projects.map((project, index) => (
          <SectionRail
            key={project.id}
            num={String(index + 1).padStart(2, '0')}
            label={project.label}
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
