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
