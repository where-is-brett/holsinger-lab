export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://holsingerlab.vercel.app'
).replace(/\/$/, '')

export const siteName = 'Holsinger Lab'

/**
 * Routes that are published for lab members but should not surface in search
 * results — internal CMS documentation, not reader-facing content.
 *
 * Both consumers must stay in sync: `buildMetadata` (lib/metadata.ts) emits
 * `noindex` for these paths and `sitemap.xml` omits them. Advertising a
 * noindex URL in a sitemap sends crawlers contradictory signals, so neither
 * half works alone.
 */
const noindexPaths = new Set(['/tutorial'])

/** Normalises a path the way both consumers need it: no query string, no trailing slash. */
function normalizePath(path: string): string {
  const withoutQueryOrHash = path.split(/[?#]/)[0]
  return withoutQueryOrHash.length > 1
    ? withoutQueryOrHash.replace(/\/$/, '')
    : withoutQueryOrHash
}

export function isNoindexPath(path: string): boolean {
  return noindexPaths.has(normalizePath(path))
}
