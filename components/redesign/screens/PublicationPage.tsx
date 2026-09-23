import Link from 'next/link'
import type { ReactNode } from 'react'

import { CopyCitation } from '../CopyCitation'
import type { Publication } from '../publicationModel'
import { ResourceBlock } from '../ResourceBlock'
import { SectionRail } from '../SectionRail'
import { Tag } from '../Tag'
import { LABEL } from '../tokens'

// The identifier -- DOI or URL -- must print verbatim: never uppercased,
// never re-typed. Same guard as PublicationRow.tsx's IDENTIFIER constant
// (components.css's `.hl-identifier { text-transform: none !important; }`),
// reproduced here via Tailwind 4's trailing-bang form.
const IDENTIFIER = 'text-link normal-case! break-all'

// Generic explanatory line (spec §4.4) -- the ui_kit's "For the 9 papers
// without one" is mockup text pinned to today's dataset; this holds for any
// count.
const CANONICAL_LINK_EXPLANATION =
  "The DOI is the paper's permanent address. Where a paper has none, the recorded publisher URL stands in."

function PaperBlock({ pub }: { pub: Publication }) {
  return (
    <>
      <Link
        href="/publications"
        className="font-mono text-[11px] leading-none font-medium tracking-[0.1em] text-link uppercase"
      >
        ← All publications
      </Link>
      {/* Fix round 1, revisited by Task 1 ("Fonts and type scale") fix
          round 1: at 375px, SectionRail's content column narrows to
          roughly 233px, and a single long word (e.g. "Neuroprotective")
          set at this heading's large 2.3125rem font-size can be wider than
          that column on its own. The original fix was `break-words`
          (`overflow-wrap: break-word`), which stopped the horizontal
          overflow but split the word at an arbitrary character with no
          visual mark -- Brett's review flagged exactly this on Home's
          "Laborato/ry". Task 1 tried removing `break-words` in favour of
          `hyphens-auto` alone (`<html lang="en">` is already set, so
          hyphenation applies) -- but proved against the live dataset that
          this regresses: the DOI paper
          "INPP5D/SHIP1: Expression, Regulation and Roles in Alzheimer's
          Disease Pathophysiology" overflows at 320px with `hyphens-auto`
          alone, because Chromium's hyphenation engine renders
          "Pathophysiology" as one unbroken line instead of finding a break
          point -- e2e/publication-page.spec.ts's existing "no horizontal
          overflow" sweep caught it. `break-words` stays as the fallback:
          per the CSS Text spec, `overflow-wrap: break-word` only takes
          effect when a line has no other acceptable break (a space, or a
          hyphenation point), so a title that DOES hyphenate cleanly (most
          of them) is unaffected -- this only guards the ones that don't.
          `hyphens`/`overflow-wrap` are different CSS properties from each
          other and from `text-pretty` (`text-wrap`), so all three are
          additive, not a same-property collision. */}
      <h1 className="mt-[26px] max-w-[1060px] text-[2.3125rem] leading-[1.22] font-semibold tracking-[-0.012em] text-pretty break-words hyphens-auto">
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
        // pushes past the row's width even after SectionRail.tsx's min-w-0
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
      {pub.abstract.map((paragraph, index) => (
        <p
          key={index}
          className={`max-w-[840px] text-[1.0625rem] leading-[1.7] text-pretty break-words ${index === 0 ? '' : 'mt-4'}`}
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
          <div className={LABEL}>Canonical link — {pub.linkKind}</div>
          <a
            href={pub.linkHref}
            data-identifier
            className={`mt-[14px] inline-block font-mono text-[15px] leading-[1.5] font-medium ${IDENTIFIER}`}
          >
            {pub.linkHref}
          </a>
          <div className="mt-[14px] max-w-[380px] font-mono text-[11px] leading-[1.7] tracking-[0.02em] text-text-faint uppercase">
            {CANONICAL_LINK_EXPLANATION}
          </div>
        </div>
      )}
      <div className={hasLink ? 'mt-8 lg:mt-0' : ''}>
        <div className={LABEL}>Formatted citation</div>
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
            <CopyCitation cite={pub.cite} copiedLabel="✓ COPIED — CITATION ON CLIPBOARD" />
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
            { label: 'KIND', value: resource.kind ?? '—' },
            { label: 'MORE', value: 'Resources', href: '/resources' },
          ]}
        />
      ))}
    </div>
  )
}

// Blocks numbered in render order (spec §4.4), so an omitted block (Abstract
// when there's none, Resource when there are none -- both true for most of
// today's dataset) leaves no gap in the numbering rather than a skipped "03".
export function PublicationPage({ pub }: { pub: Publication }) {
  const blocks: Array<{ label: string; content: ReactNode }> = [
    { label: 'Paper', content: <PaperBlock pub={pub} /> },
  ]
  if (pub.abstract.length > 0) {
    blocks.push({ label: 'Abstract', content: <AbstractBlock pub={pub} /> })
  }
  blocks.push({ label: 'Cite & access', content: <CiteAndAccessBlock pub={pub} /> })
  if (pub.resources.length > 0) {
    blocks.push({ label: 'Resource', content: <ResourceSectionBlock pub={pub} /> })
  }

  return (
    <div>
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
