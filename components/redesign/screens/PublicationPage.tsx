import Link from 'next/link'
import type { ReactNode } from 'react'

import { CopyCitation } from '../CopyCitation'
import type { Publication } from '../publicationModel'
import { ResourceBlock } from '../ResourceBlock'
import { Section } from '../Section'
import { Tag } from '../Tag'
import { MICRO_LABEL } from '../tokens'

// The identifier -- DOI or URL -- must print verbatim: never uppercased,
// never re-typed. Same guard as PublicationRow.tsx's IDENTIFIER constant
// (components.css's `.hl-identifier { text-transform: none !important; }`),
// reproduced here via Tailwind 4's trailing-bang form.
const IDENTIFIER = 'text-link normal-case! break-all'

// Task 3: the ui_kit's "The DOI is the paper's permanent address. Where a
// paper has none, the recorded publisher URL stands in." explanation is
// developer-facing copy explaining the system's own fallback rule, not
// content for a visitor -- removed outright, not converted.

function PaperBlock({ pub }: { pub: Publication }) {
  return (
    <>
      <Link href="/publications" className="text-[13px] leading-none font-medium text-link">
        ← All publications
      </Link>
      {/* `break-words`/`hyphens-auto`: see PageTitle.tsx's canonical note.
          Live proof site, fix round 2: the DOI paper "INPP5D/SHIP1:
          Expression, Regulation and Roles in Alzheimer's Disease
          Pathophysiology" is title-case, so "Pathophysiology" never
          hyphenates (Blink skips capitalised words) -- at the old fixed
          2.3125rem/37px size it was 42px too wide for this column at
          320px and overflowed. This role's size is now `clamp(1.75rem,
          4.5vw,2.3125rem)`: same floor and slope as `--text-title`
          (reusing the "title" level's own fit budget -- "Pathophysiology"
          measured 218px against a 246px column at the 28px floor,
          task-1-report.md), same 2.3125rem ceiling as before once the
          viewport is wide enough that 4.5vw exceeds it -- so desktop is
          unchanged, and this is still a documented exception to the
          generic `--text-title` token (a smaller ceiling for these longer
          scientific titles), just a fluid one now instead of fixed. */}
      <h1
        data-testid="paper-title"
        className="mt-[26px] max-w-[1060px] text-[clamp(1.75rem,4.5vw,2.3125rem)] leading-[1.22] font-semibold tracking-[-0.012em] text-pretty break-words hyphens-auto"
      >
        {pub.title}
      </h1>
      <p className="mt-5 max-w-[900px] text-[16px] leading-[1.6] text-text-muted">
        {pub.authorsPre}
        <strong className="font-semibold text-text">{pub.authorsPI}</strong>
        {pub.authorsPost}
      </p>
      <div className="mt-[18px] font-mono text-[13px] leading-[1.6] text-text-muted">
        {[pub.journal, pub.ref, pub.dateLabel].filter(Boolean).join(' · ')}
      </div>
      {(pub.type || pub.topics.length > 0) && (
        // Fix round 1 tried `overflow-x-auto` here to contain a single long
        // topic tag (Tag's chip is `whitespace-nowrap` by default --
        // tokens.ts, fixed geometry -- so one long enough label, e.g. the
        // real topic "Metabolism, oxidative stress & neuroprotection",
        // pushes past the row's width even after Section.tsx's min-w-0
        // fix stops the page-wide blowout). Round 2: that scrollable region
        // had nothing focusable inside it (axe's
        // `scrollable-region-focusable`) and looked visually cut off on a
        // phone. `Tag`'s new `wrap` prop is the real fix -- the chip wraps
        // its own text and grows taller instead of needing to scroll or
        // overflow, so this row no longer needs `overflow-x-auto` at all.
        <div className="mt-5 flex flex-wrap gap-2">
          {pub.type && <Tag wrap>{pub.type}</Tag>}
          {pub.topics.map((topic) => (
            <Tag key={topic} wrap>
              {topic}
            </Tag>
          ))}
        </div>
      )}
    </>
  )
}

function AbstractBlock({ pub }: { pub: Publication }) {
  return (
    <>
      {/* Fix round 3: the same defect as PaperBlock's `<h1>` above (see its
          round-1 comment), just not caught there because the overflow
          check only ran at 375px, not 320px, until this round. A real
          abstract's long unbreakable token -- here, a genotype string like
          "C57BL/6-Tspotm1GuMu(GuwiyangWurra))" -- is wider than the ~246px
          this column narrows to at 320px, and `text-pretty` alone
          (`text-wrap`) doesn't stop that; `break-words` (`overflow-wrap`)
          is a different property, so it's additive here too. */}
      {/* Task 1 fix round 2: this was `text-[1.0625rem] leading-[1.7]` --
          the right font-size (17px) but the wrong line-height (spec §1.2's
          reading size is 17px/1.6, not 1.7). Swapped for the `text-body`
          token itself so this can never drift from the token again. */}
      {pub.abstract.map((paragraph, index) => (
        <p
          key={index}
          className={`max-w-[840px] text-body text-pretty break-words ${index === 0 ? '' : 'mt-4'}`}
        >
          {paragraph}
        </p>
      ))}
    </>
  )
}

function CiteAndAccessBlock({ pub }: { pub: Publication }) {
  // Fix round 1: the two-track grid used to be unconditional, so with no
  // canonical link (linkHref === '') the citation column -- the only child
  // -- sat in the grid's first 1fr track instead of spanning the full
  // width. The grid (and the citation column's stacked-spacing reset) now
  // only apply when there's a link to show beside it; with none, this is a
  // plain block and the citation column takes the full content width.
  const hasLink = pub.linkHref !== ''
  return (
    <div
      data-testid="pub-cite-access"
      className={hasLink ? 'lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-x-(--spacing-gutter-lg)' : ''}
    >
      {hasLink && (
        <div>
          {/* Task 3: sentence-case Archivo, not uppercase mono (was LABEL) --
              this is a genuine label, not a data column head, so the
              micro-label budget rule applies. */}
          <div className={MICRO_LABEL}>Canonical link — {pub.linkKind}</div>
          <a
            href={pub.linkHref}
            data-identifier
            className={`mt-[14px] inline-block font-mono text-[15px] leading-[1.5] font-medium ${IDENTIFIER}`}
          >
            {pub.linkHref}
          </a>
        </div>
      )}
      <div className={hasLink ? 'mt-8 lg:mt-0' : ''}>
        <div className={MICRO_LABEL}>Formatted citation</div>
        <div className="mt-[14px] border border-rule px-[22px] py-5" data-testid="pub-citation-box">
          {/* Fix round 1: `pub.cite` (lib/citation.ts's `formatApaCitation`)
              ends with a bare DOI/publisher URL -- a single unbreakable
              ~40-50 character token with no spaces. At this box's narrow
              mobile width that URL alone is wider than the column, so
              (same mechanism as the `<h1>` above) `break-words` is needed
              to let it wrap rather than force a page-wide horizontal
              scroll. */}
          <div
            className="font-mono text-[12.5px] leading-[1.75] break-words normal-case!"
            data-identifier
            data-testid="pub-cite-text"
          >
            {pub.cite}
          </div>
          <div className="mt-4">
            <CopyCitation cite={pub.cite} copiedLabel="✓ Copied — citation on clipboard" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ResourceSectionBlock({ pub }: { pub: Publication }) {
  return (
    <div className="flex flex-col gap-10">
      {pub.resources.map((resource) => (
        <ResourceBlock
          key={resource.id}
          title={resource.title}
          meta={[
            { label: 'Kind', value: resource.kind ?? '—' },
            { label: 'More', value: 'Resources', href: '/resources' },
          ]}
        />
      ))}
    </div>
  )
}

// Blocks render as an ordered list of `Section`s (spec §4.4); an omitted
// block (Abstract when there's none, Resource when there are none -- both
// true for most of today's dataset) simply isn't pushed.
export function PublicationPage({ pub }: { pub: Publication }) {
  // Task 2: `Paper`'s `Section` label stays a `<p>` -- `PaperBlock` already
  // renders the page's real `<h1 data-testid="paper-title">`, so its label
  // isn't the section's only heading. `Abstract` and `Cite and access` have
  // no heading of their own (plain paragraphs / mono labels), so their
  // labels are `<h2>`s. `Resource` stays a `<p>` (fix round 2):
  // `ResourceBlock`'s own title is now a real `<h2>`, so a second `<h2>`
  // label here would be a redundant, sibling heading.
  const blocks: Array<{ label: string; labelHeading?: boolean; content: ReactNode }> = [
    { label: 'Paper', content: <PaperBlock pub={pub} /> },
  ]
  if (pub.abstract.length > 0) {
    blocks.push({ label: 'Abstract', labelHeading: true, content: <AbstractBlock pub={pub} /> })
  }
  blocks.push({ label: 'Cite and access', labelHeading: true, content: <CiteAndAccessBlock pub={pub} /> })
  if (pub.resources.length > 0) {
    blocks.push({ label: 'Resource', content: <ResourceSectionBlock pub={pub} /> })
  }

  return (
    <div>
      {blocks.map((block, index) => (
        <Section key={block.label} label={block.label} labelHeading={block.labelHeading} borderTop={index !== 0}>
          {block.content}
        </Section>
      ))}
    </div>
  )
}
