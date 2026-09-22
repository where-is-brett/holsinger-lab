import type { ResourcePayload } from 'types'

import { PageTitle } from '../PageTitle'
import { PortableBody } from '../PortableBody'
import { deriveLink, formatRef } from '../publicationModel'
import { ResourceBlock, type ResourceBlockMeta } from '../ResourceBlock'
import { SectionRail } from '../SectionRail'

// Task 1 brief / spec §6, §2 ruling 1: one `/resources` index page, no
// per-resource route -- the IA gives resources no pages, and one item
// launches. Production carries zero `resource` documents today (spec §2),
// so this screen's populated state is only ever exercised against the
// `gallery-resources` fixture (app/preview/components/Gallery.tsx), never
// against real data yet.

// "journal ref · year" (Task 1 brief point 2) -- the same "journal ref"
// pairing PublicationRow.tsx already prints, with the year appended after a
// separating " · ". Each half is dropped rather than leaving a dangling
// separator when the linked publication is missing a piece.
function formatSource(journal: string, ref: string, year: string): string {
  const journalRef = [journal, ref].filter(Boolean).join(' ')
  return [journalRef, year].filter(Boolean).join(' · ')
}

function buildMeta(resource: ResourcePayload): ResourceBlockMeta[] {
  const meta: ResourceBlockMeta[] = [{ label: 'KIND', value: resource.kind ?? '' }]
  const pub = resource.publication
  if (pub) {
    const year = pub.date ? pub.date.slice(0, 4) : ''
    const ref = formatRef(pub.volume ?? null, pub.issue ?? null, pub.pages ?? null)
    // Fix round 1: `formatSource` alone can come back empty (no journal, no
    // ref, no year on file), which used to render a SOURCE row whose value
    // was a blank, but still clickable, link. Falling back to the
    // publication's own (trimmed) title keeps the link meaningful; if even
    // that is blank, the row is dropped entirely below -- never an empty
    // link.
    const source = formatSource(pub.journal ?? '', ref, year) || (pub.title ?? '').trim()
    if (source) {
      meta.push({
        label: 'SOURCE',
        value: source,
        href: pub.slug ? `/publications/${pub.slug}` : undefined,
      })
    }
    const link = deriveLink(pub.doi ?? null, pub.url ?? null)
    if (link) {
      meta.push({ label: link.kind, value: link.label, href: link.href })
    }
  }
  return meta
}

export function Resources({ resources }: { resources: ResourcePayload[] }) {
  const n = resources.length

  return (
    <div>
      <PageTitle title="Resources" meta={`${n} RESOURCE${n === 1 ? '' : 'S'}`} />
      {n === 0 ? (
        <SectionRail>
          <p className="text-[14px] leading-[1.5] text-text-muted">No resources are listed yet.</p>
        </SectionRail>
      ) : (
        resources.map((resource, index) => (
          <SectionRail
            key={resource._id}
            num={String(index + 1).padStart(2, '0')}
            label={resource.kind ?? ''}
            borderTop={index !== 0}
          >
            <ResourceBlock title={resource.title ?? ''} meta={buildMeta(resource)}>
              {/* Fix round 1: aligned to PortableBody's own BIO_PARAGRAPH
                  measure (`max-w-[720px]`), not ResourceBlock's narrower
                  640px title column, so the summary and the howToObtain
                  portable text directly below it -- rendered through that
                  same component -- share one text measure rather than the
                  summary wrapping at a different width than its own next
                  paragraph. */}
              {resource.summary && (
                <p className="max-w-[720px] text-pretty break-words text-body text-text-muted">
                  {resource.summary}
                </p>
              )}
              <PortableBody blocks={resource.howToObtain} />
            </ResourceBlock>
          </SectionRail>
        ))
      )}
    </div>
  )
}
