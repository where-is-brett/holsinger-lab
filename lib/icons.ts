/**
 * CMS icon URL resolution, shared by `generateMetadata`'s favicon block and
 * `app/manifest.ts` -- one function, so the two can never resolve
 * `settings.icon` two different ways.
 */

import { urlForImage } from 'lib/sanity.image'
import type { Image } from 'sanity'

/**
 * A single icon URL at `size`×`size`, cropped to a square, or null if no
 * icon is uploaded. PNG is forced regardless of the source file's format --
 * favicons and manifest icons are read by browser chrome, not rendered in
 * page content, so `auto('format')` (which `urlForImage` applies by
 * default) would risk serving a browser a format it does not expect there.
 */
export function resolveIconUrl(
  icon: Image | null | undefined,
  size: number
): string | null {
  if (!icon) return null
  return (
    urlForImage(icon)
      ?.width(size)
      .height(size)
      .fit('crop')
      .format('png')
      .url() ?? null
  )
}
