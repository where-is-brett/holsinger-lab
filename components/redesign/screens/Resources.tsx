import type { ResourcePayload } from 'types'

import { PageTitle } from '../PageTitle'
import { PortableBody } from '../PortableBody'
import { ResourceBlock } from '../ResourceBlock'
import { buildResourceMeta, groupByKind } from '../resourceModel'
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
  // Task 2 fix round 1 (review Important 2 / Minor 7): one `Section` per
  // `kind`, not per resource -- two resources sharing a kind now share one
  // `Section` (and one `<h2>` label) instead of each rendering its own
  // identical heading. `kindLabel` (resourceModel.ts) gives the label its
  // required sentence case ("Hardware", not the raw `kind` enum's
  // "hardware") -- the old numbered rail uppercased every label with CSS
  // regardless of case, which hid this; removing that transform (Task 2)
  // exposed the raw lower-case value.
  const groups = groupByKind(resources)

  return (
    <div>
      <PageTitle title="Resources" meta={`${n} resource${n === 1 ? '' : 's'}`} />
      {n === 0 ? (
        <Section>
          <p className="text-[14px] leading-[1.5] text-text-muted">No resources are listed yet.</p>
        </Section>
      ) : (
        // `labelHeading` true -- `ResourceBlock`'s own title renders as a
        // plain `<div data-testid="resource-block-title">`, not a heading,
        // so each kind's label is its section's only one.
        groups.map((group, index) => (
          <Section
            key={group.kind ?? 'unset'}
            label={group.label}
            labelHeading
            borderTop={index !== 0}
          >
            <div className="flex flex-col gap-10">
              {group.resources.map((resource) => (
                <ResourceBlock key={resource._id} title={resource.title ?? ''} meta={buildResourceMeta(resource)}>
                  {/* Fix round 1: aligned to PortableBody's own BIO_PARAGRAPH
                      measure (`max-w-[720px]`), not ResourceBlock's narrower
                      640px title column, so the summary and the howToObtain
                      portable text directly below it -- rendered through
                      that same component -- share one text measure rather
                      than the summary wrapping at a different width than
                      its own next paragraph. */}
                  {resource.summary && (
                    <p className="max-w-[720px] text-pretty break-words text-body text-text-muted">
                      {resource.summary}
                    </p>
                  )}
                  <PortableBody blocks={resource.howToObtain} />
                </ResourceBlock>
              ))}
            </div>
          </Section>
        ))
      )}
    </div>
  )
}
