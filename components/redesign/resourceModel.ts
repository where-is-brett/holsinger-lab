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

// `kind` is a fixed schema enum (`schemas/documents/resource.ts`'s
// `RESOURCE_KINDS`: `'hardware' | 'protocol' | 'software' | 'dataset'`, all
// lower case), not free CMS text -- this table gives it a sentence-case
// display label instead of printing the raw enum value.
const RESOURCE_KIND_LABELS: Record<string, string> = {
  hardware: 'Hardware',
  protocol: 'Protocol',
  software: 'Software',
  dataset: 'Dataset',
}

/**
 * Sentence-case display label for a resource's `kind`, for use as a
 * `Section` label (`Resources.tsx`) -- never for `buildResourceMeta`'s own
 * `KIND` meta row below, which is a data value, not a label, and keeps
 * printing the raw enum verbatim. Falls back to "Resource" for an unset or
 * unrecognised kind, so every resource gets a real label instead of a
 * `Section` silently rendering none.
 */
export function kindLabel(kind: string | null | undefined): string {
  if (!kind) return 'Resource'
  return RESOURCE_KIND_LABELS[kind] ?? 'Resource'
}

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
  // Sentence-case labels ("Kind"/"Source") render as `<dt>`s, so their own
  // text is exactly what a screen reader announces. The Kind value goes
  // through `kindLabel` too, so it matches the same page's `Section` label
  // instead of printing the raw lower-case schema enum. `identifier` marks
  // Source and the DOI/URL row as identifier data; Kind's value is a fixed
  // schema enum, not CMS free text or an identifier, so it stays unmarked.
  const meta: ResourceBlockMeta[] = [{ label: 'Kind', value: kindLabel(resource.kind) }]
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
        label: 'Source',
        value: source,
        href: pub.slug ? `/publications/${pub.slug}` : undefined,
        identifier: true,
      })
    }
    const link = deriveLink(pub.doi ?? null, pub.url ?? null)
    if (link) {
      meta.push({ label: link.kind, value: link.label, href: link.href, identifier: true })
    }
  }
  return meta
}
