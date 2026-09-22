import type { HomeResourcePayload, ResourcePayload } from 'types'

import { deriveLink, formatRef } from './publicationModel'
import type { ResourceBlockMeta } from './ResourceBlock'

// PR C Task 3 fix round 1, IMPORTANT 2: `Resources.tsx` and `Home.tsx` both
// build a `ResourceBlock`'s meta rows (KIND / SOURCE / DOI-or-URL) from a
// `resource` document -- `resourcesQuery` and `homeResourceQuery` share the
// exact same projection (`homeResourceQuery` is `resourcesQuery`'s own
// projection, `[0]`), so this is the one place that turns either payload
// into meta rows. Both screens import from here instead of each carrying
// its own copy that can silently drift (Resources.tsx's own now-removed
// copy already carried a fix-round comment nobody would have seen repeated
// in Home.tsx).

/**
 * "journal ref · year", each half dropped rather than leaving a dangling
 * separator when the linked publication is missing a piece.
 */
export function formatSource(journal: string, ref: string, year: string): string {
  const journalRef = [journal, ref].filter(Boolean).join(' ')
  return [journalRef, year].filter(Boolean).join(' · ')
}

/**
 * One signature covers both projections: `ResourcePayload` (the
 * `/resources` list) and `HomeResourcePayload` (Home's own single first
 * resource) are structurally identical -- same fields, same nullability --
 * because both queries share `resourcesQuery`'s projection verbatim.
 */
export function buildResourceMeta(resource: ResourcePayload | HomeResourcePayload): ResourceBlockMeta[] {
  const meta: ResourceBlockMeta[] = [{ label: 'KIND', value: resource.kind ?? '' }]
  const pub = resource.publication
  if (pub) {
    const year = pub.date ? pub.date.slice(0, 4) : ''
    const ref = formatRef(pub.volume ?? null, pub.issue ?? null, pub.pages ?? null)
    // A resource whose linked publication has no journal, ref or date on
    // file would otherwise render a SOURCE row whose value is blank but
    // still clickable -- falling back to the publication's own (trimmed)
    // title keeps the link meaningful; if even that is blank, the row is
    // dropped entirely below, never rendered as an empty link.
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
