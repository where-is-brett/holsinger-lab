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

// Task 2 fix round 1 (review Important 2): `kind` is a fixed schema enum
// (`schemas/documents/resource.ts`'s `RESOURCE_KINDS`, all lower case --
// `'hardware' | 'protocol' | 'software' | 'dataset'`), not free CMS text,
// so constraints.md's "CMS text prints verbatim" rule doesn't cover it --
// it's a label, and the brief's own "sentence case" rule (and the label
// table's "the kind") both apply to it. The old numbered rail uppercased
// every label with CSS regardless of the string's own case, which hid
// this; removing that transform (Task 2) exposed the raw lower-case enum
// value rendering as-is (`<h2>hardware</h2>` on the live `/resources`
// page).
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

// Task 2 fix round 1 (review Minor 7) added a `groupByKind` here so
// `Resources.tsx` could render one `Section` per kind instead of one per
// resource, avoiding duplicate `<h2>` labels for two resources sharing a
// kind. Fix round 2 (controller ruling, option (b)) reverted that: grouping
// silently reordered the list relative to the query's own `title asc` order
// whenever kinds were interleaved, breaking `e2e/resources.spec.ts`'s
// "renders one block per resource document" check for a dataset that valid
// (re-review, "New Breakage 2") -- constraints.md's "every e2e assertion
// must hold for any valid dataset" rules that out. `Resources.tsx` is back
// to one `Section` per resource, in query order, with `kindLabel`'s output
// rendered as a `<p>` (not an `<h2>`) so duplicate labels are never a
// heading-order problem either. `groupByKind` and its tests are removed;
// `kindLabel` itself is kept and unchanged.

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
