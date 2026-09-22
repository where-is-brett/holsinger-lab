// Plain `.mjs` rather than `.ts` because `next.config.mjs` loads it directly
// in Node, before any TypeScript compilation happens.

/**
 * URLs that moved to a different route and must keep working for inbound
 * links. Served as 308s by `redirects()` in `next.config.mjs`, and left out
 * of `sitemap.xml`: advertising a URL that only redirects makes crawlers do
 * an extra hop and tells them the old URL is still canonical.
 *
 * A slug that only changed spelling within the same route belongs in that
 * route's `legacy*Slugs` map instead (e.g. `app/projects/[slug]/page.tsx`).
 *
 * @type {ReadonlyArray<{ source: string, destination: string }>}
 */
export const permanentRedirects = [
  // Dr Holsinger's bio used to be a `project` document; it now lives on the
  // lab head's `profile` (settings.labHead). Config redirects run before the
  // filesystem routes, so this wins even while the old project is published.
  {
    source: '/projects/about-dr-damian-holsinger',
    destination: '/people/damian-holsinger',
  },
]

const redirectedSources = new Set(permanentRedirects.map((r) => r.source))

/** @param {string} path */
export function isRedirectedPath(path) {
  return redirectedSources.has(path)
}
