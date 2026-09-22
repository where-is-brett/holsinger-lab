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
      <h1 className="mt-[26px] max-w-[1060px] text-[2.3125rem] leading-[1.22] font-semibold tracking-[-0.012em] text-pretty">
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
        <div className="mt-5 flex flex-wrap gap-2">
          {pub.type && <Tag>{pub.type}</Tag>}
          {pub.topics.map((topic) => (
            <Tag key={topic}>{topic}</Tag>
          ))}
        </div>
      )}
    </>
  )
}

function AbstractBlock({ pub }: { pub: Publication }) {
  return (
    <>
      {pub.abstract.map((paragraph, index) => (
        <p
          key={index}
          className={`max-w-[840px] text-[1.0625rem] leading-[1.7] text-pretty ${index === 0 ? '' : 'mt-4'}`}
        >
          {paragraph}
        </p>
      ))}
    </>
  )
}

function CiteAndAccessBlock({ pub }: { pub: Publication }) {
  return (
    <div className="lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-x-(--spacing-gutter-lg)">
      {pub.linkHref !== '' && (
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
      <div className={pub.linkHref !== '' ? 'mt-8 lg:mt-0' : ''}>
        <div className={LABEL}>Formatted citation</div>
        <div className="mt-[14px] border border-rule px-[22px] py-5">
          <div className="font-mono text-[12.5px] leading-[1.75] normal-case!" data-identifier>
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
