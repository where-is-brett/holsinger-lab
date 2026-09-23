import { urlForImage } from 'lib/sanity.image'
import type { Image as SanityImage } from 'sanity'
import type { ResearchProjectPayload } from 'types'

// Pure helpers for the `/research` screen (Task 2 brief). Kept separate from
// the screen itself, same split as publicationModel.ts / peopleModel.ts, so
// every branch is unit-testable without rendering. `ResearchProjectPayload`
// comes from `types` (same convention as `PublicationPayload` in
// publicationModel.ts), not redeclared here.

/**
 * "Since {year}", the category, both joined by " · ", or whichever half is
 * present. `""` when neither is set. `start` is `duration.start`, an ISO
 * datetime string (schemas/objects/duration) -- only the leading 4-digit
 * year is used. Both halves are trimmed; whitespace-only counts as missing,
 * matching `enquiryEmail`'s rule below.
 */
export function researchKicker(p: { start?: string | null; category?: string | null }): string {
  const start = p.start?.trim()
  const year = start ? start.slice(0, 4) : ''
  const since = year ? `Since ${year}` : ''
  const category = p.category?.trim() ?? ''
  return [since, category].filter(Boolean).join(' · ')
}

/**
 * The enquiry email: `settings.contact.email`, else `settings.labHead.email`,
 * else `null`. Both are trimmed; a whitespace-only value counts as missing,
 * not as "set to blank" -- there is no such thing as a blank email address.
 */
export function enquiryEmail(settings: {
  contact?: { email?: string | null } | null
  labHead?: { email?: string | null } | null
}): string | null {
  const contactEmail = settings.contact?.email?.trim()
  if (contactEmail) return contactEmail
  const labHeadEmail = settings.labHead?.email?.trim()
  if (labHeadEmail) return labHeadEmail
  return null
}

export interface ResearchProjectCover {
  src: string
  width: number
  height: number
  alt: string
}

export interface ResearchProjectView {
  id: string
  title: string
  /** The section label: the first tag, or "Project" when there are none. */
  label: string
  /** `researchKicker`'s own output ("Since {year}", category, both, or ""). */
  kicker: string
  /** Tags joined with " · ", rendered in link colour. "" when there are none. */
  tagLine: string
  /**
   * The one portable-text field the screen renders, resolved once here --
   * see `toResearchView`'s own comment for why. `Research.tsx` never reads
   * `overview`/`description` itself.
   */
  body: ResearchProjectPayload['overview'] | ResearchProjectPayload['description']
  cover: ResearchProjectCover | null
}

/**
 * Fix round 1 ruling 1: `coverImage` never goes through the screen directly
 * any more -- this is the one place that turns it into a real, delivered
 * `src` plus the box it will actually render at. `null` when there's no
 * cover, no `metadata.dimensions`, or `urlForImage` can't resolve a URL
 * (no `_ref`/`_id` on the asset).
 *
 * When the editor set an image `crop` in the Studio, `width`/`height` are
 * scaled down by `(1 - left - right)` / `(1 - top - bottom)` -- the
 * fraction of the native asset the crop actually keeps.
 *
 * Fix round 2 correction: `@sanity/image-url` *does* apply the crop even
 * with no `width`/`height` requested at all -- its own `fit()` returns
 * `rect: source.crop` (the crop, already converted to a pixel rect)
 * whenever neither dimension is given, and that rect is what ends up in
 * the URL's own `rect=` param. The reason this still explicitly requests
 * `width`/`height` (with `fit('crop')`) when there's a crop is different:
 * the library computes the crop rect's own pixel size independently
 * (rounding `left`/`top` first, then deriving `width`/`height` from what's
 * left), which is not guaranteed to land on the exact same pixel as this
 * function's own `(1 - left - right)` math above -- an off-by-one would
 * mean the bytes Sanity actually delivers are a different size than the
 * `width`/`height` this view hands to `next/image`, which is exactly the
 * "shifts on load" defect this exists to prevent. Requesting the same
 * explicit `width`/`height` this function already computed forces Sanity
 * to deliver exactly that many pixels, so the box and the bytes always
 * agree. With no crop, `width`/`height` are the asset's own native
 * `metadata.dimensions` unchanged -- the exact bytes `urlForImage(...).url()`
 * (no size params) delivers, so the box never shifts on load either
 * (constraints.md: covers are never cropped by this component itself --
 * only ever what the editor already chose in Sanity).
 */
function coverView(p: ResearchProjectPayload): ResearchProjectCover | null {
  const coverImage = p.coverImage
  const nativeWidth = coverImage?.asset?.metadata?.dimensions?.width
  const nativeHeight = coverImage?.asset?.metadata?.dimensions?.height
  if (!coverImage || !nativeWidth || !nativeHeight) return null

  // `coverImage` is queried with a dereferencing `asset->{...}` (needed to
  // reach `metadata.dimensions`), which -- same as settingsQuery's logo/
  // logoDark (sanity.image.ts's own comment) -- replaces `asset._ref` with
  // `asset._id`, leaving no structural overlap with `Image`'s `Reference`
  // shape for a direct cast. `urlForImage` itself already accepts this
  // shape (checks `_ref` OR `_id`); only the TypeScript cast needs the
  // `unknown` detour.
  const builder = urlForImage(coverImage as unknown as SanityImage)
  if (!builder) return null

  const crop = coverImage.crop
  if (!crop) {
    const src = builder.url()
    if (!src) return null
    return { src, width: nativeWidth, height: nativeHeight, alt: p.title ?? '' }
  }

  const width = Math.round(nativeWidth * (1 - (crop.left ?? 0) - (crop.right ?? 0)))
  const height = Math.round(nativeHeight * (1 - (crop.top ?? 0) - (crop.bottom ?? 0)))
  const src = builder.width(width).height(height).fit('crop').url()
  if (!src) return null
  return { src, width, height, alt: p.title ?? '' }
}

/**
 * `overview` when it has at least one block, else `description`, else
 * `null`. Both fields come back from a `groq` fetch as `undefined`,
 * `null`, or `[]` when unset -- all three count as "no overview" here, not
 * just `null`/`undefined` (a Studio editor clearing a portable-text field
 * to empty leaves `[]`, not `null`). Exists because the two Wix-imported
 * projects (researchOrder 3/4) carry their copy in `description`, not
 * `overview` -- the field the original two projects (researchOrder 1/2)
 * both have, with identical text. Without this fallback the imported
 * projects render title-only.
 */
function resolveBody(p: ResearchProjectPayload): ResearchProjectView['body'] {
  if (p.overview && p.overview.length > 0) return p.overview
  if (p.description && p.description.length > 0) return p.description
  return null
}

/** The one function `Research` (the screen) renders from -- see its own comment. */
export function toResearchView(p: ResearchProjectPayload): ResearchProjectView {
  const tags = (p.tags ?? []).filter((t): t is string => Boolean(t))
  return {
    id: p._id,
    title: p.title ?? '',
    label: tags[0] || 'Project',
    kicker: researchKicker({ start: p.start, category: p.category }),
    tagLine: tags.join(' · '),
    body: resolveBody(p),
    cover: coverView(p),
  }
}
