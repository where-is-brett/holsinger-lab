/**
 * Pure builder for the web app manifest. No Sanity, no `next/*` fetch --
 * `app/manifest.ts` resolves settings and CMS icon URLs, then hands the
 * results here so the shape stays testable with plain literals, the same
 * reasoning as `lib/layout-branding.ts`.
 */

import type { ThemeName } from 'lib/theme'
import { themeColorFor } from 'lib/theme'
import type { MetadataRoute } from 'next'

export function buildManifest({
  siteName,
  shortName,
  theme,
  icon192,
  icon512,
}: {
  siteName: string
  shortName: string
  theme: ThemeName
  icon192: string | null
  icon512: string | null
}): MetadataRoute.Manifest {
  // The manifest's chrome colour and the viewport's theme-color meta tag
  // (generateViewport, Task 5) both read this -- one source, so they cannot
  // drift apart the way the pre-4D static manifest and static viewport did.
  const themeColor = themeColorFor(theme).light

  return {
    name: siteName,
    short_name: shortName,
    icons: [
      {
        src: icon192 ?? '/favicon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: icon512 ?? '/favicon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: themeColor,
    background_color: themeColor,
    display: 'standalone',
  }
}
