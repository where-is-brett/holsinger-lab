import type { ResourcePayload } from 'types'

import { PageTitle } from '../PageTitle'
import { PortableBody } from '../PortableBody'
import { ResourceBlock } from '../ResourceBlock'
import { buildResourceMeta } from '../resourceModel'
import { SectionRail } from '../SectionRail'

// Task 1 brief / spec §6, §2 ruling 1: one `/resources` index page, no
// per-resource route -- the IA gives resources no pages, and one item
// launches. Production carries zero `resource` documents today (spec §2),
// so this screen's populated state is only ever exercised against the
// `gallery-resources` fixture (app/preview/components/Gallery.tsx), never
// against real data yet.

// `formatSource`/`buildResourceMeta` moved to `resourceModel.ts` (PR C
// Task 3 fix round 1, IMPORTANT 2) -- Home.tsx builds the identical
// KIND/SOURCE/DOI-or-URL meta rows for its own single first resource, and
// the two were a verbatim duplicate that would have silently drifted.

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
            <ResourceBlock title={resource.title ?? ''} meta={buildResourceMeta(resource)}>
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
