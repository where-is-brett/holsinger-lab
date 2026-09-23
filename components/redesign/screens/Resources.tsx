import type { ResourcePayload } from 'types'

import { PageTitle } from '../PageTitle'
import { PortableBody } from '../PortableBody'
import { ResourceBlock } from '../ResourceBlock'
import { buildResourceMeta, kindLabel } from '../resourceModel'
import { Section } from '../Section'

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
      <PageTitle title="Resources" meta={`${n} resource${n === 1 ? '' : 's'}`} />
      {n === 0 ? (
        <Section>
          <p className="text-[14px] leading-[1.5] text-text-muted">No resources are listed yet.</p>
        </Section>
      ) : (
        // One `Section` per resource, in the query's own order (`title
        // asc`). `kindLabel` gives the label its sentence case, but it
        // renders as this `Section`'s default `<p>` (`labelHeading` unset),
        // not an `<h2>` -- two resources can share a kind, and a `<p>`
        // avoids duplicate `<h2>`s (a heading-order concern) where that
        // happens. `ResourceBlock`'s own title is the real heading for
        // each resource.
        resources.map((resource, index) => (
          <Section key={resource._id} label={kindLabel(resource.kind)} borderTop={index !== 0}>
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
          </Section>
        ))
      )}
    </div>
  )
}
