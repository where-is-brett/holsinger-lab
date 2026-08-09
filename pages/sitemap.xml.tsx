// pages/sitemap.xml.tsx
import { isNoindexPath, siteUrl } from 'lib/site'
import type { GetServerSideProps } from 'next'

import { getAllPaths } from './api/revalidate'

function generateSitemapXml(paths: (string | undefined)[]): string {
  const urls = paths
    .filter((path): path is string => Boolean(path))
    .filter((path) => !isNoindexPath(path))
    .map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const paths = await getAllPaths()
  const xml = generateSitemapXml(paths)

  res.setHeader('Content-Type', 'application/xml')
  res.write(xml)
  res.end()

  return { props: {} }
}

export default function SitemapXml() {
  return null
}
