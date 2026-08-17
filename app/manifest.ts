import { resolveBranding } from 'lib/branding'
import { resolveIconUrl } from 'lib/icons'
import { buildManifest } from 'lib/manifest'
import { sanityFetch } from 'lib/sanity.live'
import { settingsQuery } from 'lib/sanity.queries'
import { fetchSettingsSafely } from 'lib/settings'
import { resolveThemeName } from 'lib/theme'
import type { MetadataRoute } from 'next'
import type { Image } from 'sanity'

export const revalidate = 60

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await fetchSettingsSafely(() =>
    sanityFetch({ query: settingsQuery, stega: false })
  )
  const { siteName, shortName } = resolveBranding(settings)
  const icon = settings.icon as Image | null | undefined

  return buildManifest({
    siteName,
    shortName,
    theme: resolveThemeName(settings.theme),
    icon192: resolveIconUrl(icon, 192),
    icon512: resolveIconUrl(icon, 512),
  })
}
