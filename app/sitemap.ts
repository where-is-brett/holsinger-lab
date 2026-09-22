import { WIX_ROUTES } from 'lib/paths'
import { siteUrl } from 'lib/site'
import type { MetadataRoute } from 'next'

export const revalidate = 60

export default function sitemap(): MetadataRoute.Sitemap {
  return WIX_ROUTES.map((p) => ({ url: `${siteUrl}${p}` }))
}
