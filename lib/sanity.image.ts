import { createImageUrlBuilder } from '@sanity/image-url'
import { dataset, projectId } from 'lib/sanity.api'
import type { Image } from 'sanity'

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

export const urlForImage = (source: Image) => {
  // Most callers pass a plain reference (`asset._ref`), but settingsQuery
  // projects logo/logoDark with a dereferencing `asset->{...}` (needed to
  // reach metadata.dimensions.aspectRatio for the logo's derived width) --
  // GROQ's `->` replaces the reference with the full target document, so
  // that shape has `asset._id` and no `_ref` at all. This helper is shared
  // by every image field in the codebase, so it has to accept both shapes.
  const asset = source?.asset as { _ref?: string; _id?: string } | undefined
  if (!asset?._ref && !asset?._id) {
    return undefined
  }

  return imageBuilder?.image(source).auto('format').fit('max')
}

/**
 * A Sanity asset id/ref encodes its intrinsic pixel dimensions, e.g.
 * "image-<hash>-2394x1769-png". `.fit('max')` already refuses to upscale
 * past this, but requesting a width far beyond it is still wasted work
 * (redundant srcSet entries, cache churn) -- callers that build their own
 * `.width()` should cap it against this first. Returns null if the id/ref
 * doesn't match the expected shape (defensive -- should not happen for a
 * real Sanity image asset).
 */
export function intrinsicImageWidth(assetIdOrRef: string | null | undefined): number | null {
  const match = assetIdOrRef?.match(/-(\d+)x(\d+)-/)
  return match ? Number(match[1]) : null
}
