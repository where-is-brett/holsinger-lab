import { getAllPaths } from 'lib/paths'
import { isRedirectedPath } from 'lib/redirects.mjs'
import { isNoindexPath, siteUrl } from 'lib/site'
import type { MetadataRoute } from 'next'

export const revalidate = 60

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await getAllPaths()
  return paths
    .filter((path): path is string => Boolean(path))
    .filter((path) => !isNoindexPath(path))
    .filter((path) => !isRedirectedPath(path))
    .map((path) => ({ url: `${siteUrl}${path}` }))
}
