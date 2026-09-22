import { previewRevalidateSeconds } from 'lib/preview-revalidate'
import { apiVersion, dataset, projectId, readToken, useCdn } from 'lib/sanity.api'
import { createClient } from 'next-sanity'
import type { DefinedFetchType } from 'next-sanity/live'
import { defineLive } from 'next-sanity/live'

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  perspective: 'published',
  stega: { studioUrl: '/studio' },
})

const { sanityFetch: liveSanityFetch, SanityLive } = defineLive({
  client,
  serverToken: readToken || false,
  browserToken: false,
})

export { SanityLive }

// Preview deploys served stale content (a resource that exists in the
// `wix-preview` dataset rendered as "0 RESOURCES" behind an `x-vercel-cache:
// HIT`) because the Sanity revalidation webhook only targets production --
// preview pages' `sanityFetch` calls only ever get cache tags that nothing
// ever invalidates on demand there.
//
// FIRST ATTEMPT (WRONG -- kept here as a recorded dead end, since the round
// that shipped it passed every check that round ran and still didn't fix
// the bug): route `export const revalidate` can't read `process.env.
// VERCEL_ENV` at all -- Next's `extractExportedConstValue`
// (node_modules/next/dist/esm/build/analysis/extract-const-value.js) only
// understands literals, and rejects CallExpression/ConditionalExpression/
// MemberExpression outright ("Invalid segment configuration export
// detected" at build time, confirmed by trying it). So a client-level
// `createClient({ fetch: { next: { revalidate } } } })` default looked like
// the next-best seam -- and it genuinely does reach `@sanity/client`'s
// request layer as the fallback when a call has no override
// (`requestOptions()`'s `overrides.fetch || config.fetch`,
// node_modules/@sanity/client/dist/index.js ~694). But `defineLive`'s own
// `sanityFetch` issues **two** requests per call
// (node_modules/next-sanity/dist/live/conditions/react-server/index.js
// ~31-60 -- this package resolves the `react-server` condition here, not
// `next-js`, since this repo's next.config.mjs never sets
// `cacheComponents`; confirmed by grepping the built `.next/server` output
// for the sync-tags request's literal tag suffix, which only the
// `react-server` module emits): a throwaway sync-tags request (no `next`
// override, so it *did* pick up the client-level default -- and its lower
// revalidate is what a previous round's `VERCEL_ENV=preview npm run build`
// route-manifest check actually measured, misreading it as proof the fix
// worked), and the real content request, which hardcodes
// `next: { revalidate: false, tags: cacheTags }`. `@sanity/client` merges
// `{ ...config.fetch, ...overrides.fetch }` with the per-call object
// last (same `requestOptions()`), so that hardcoded object replaces the
// client-level default wholesale on the one request whose data actually
// reaches the page -- `revalidate: false` is Next's infinite-cache value,
// and since the Data Cache key doesn't fold in `tags`, that entry never
// expires and nothing ever invalidates it on preview. Reverted; the
// `fetch: { next: { revalidate } } }` config option is gone from
// `createClient()` below.
//
// THE FIX: bypass `defineLive`'s `sanityFetch` entirely on preview and
// issue the content query directly through the plain `client` above, with
// an explicit `next: { revalidate: previewRevalidateSeconds(), tags }` this
// time putting the short revalidate on the request that actually carries
// the page's data. `isPreview` is read once per server instance (a runtime
// value, not a static export, so none of the AST restriction above
// applies), so every request in a preview deployment goes through
// `previewSanityFetch`; every request everywhere else goes through
// `defineLive`'s own `liveSanityFetch`, completely unchanged.
//
// What preview gives up: `previewSanityFetch` doesn't replicate
// `defineLive`'s cookie-resolved `perspective`/`variant`/`stega` defaults
// (`resolveCookiePerspective`/`resolveCookieVariant`, and the
// `serverToken && studioUrlDefined ? draftMode().isEnabled : false` stega
// default) or its sync-tags round trip, and `<SanityLive />`'s live
// EventSource connection still renders on preview but has nothing to act
// on for content fetched this way, since `previewSanityFetch` never calls
// `cacheTag`-equivalent bookkeeping the way the on-demand-revalidation path
// expects. Concretely: Studio-driven draft/live-preview sessions and
// Presentation Tool's real-time updates lose their immediacy on preview
// deployments specifically -- a preview page now shows a draft or a just-
// published edit within 30s instead of instantly. That's the accepted
// trade named in the brief ("losing live updates there is acceptable").
// What does NOT regress: every caller's own explicit `stega` option
// (several call sites pass `stega: false` deliberately, e.g. any field
// that reaches an href/meta tag verbatim) is forwarded through unchanged --
// `stega: options.stega ?? false` only substitutes a default for callers
// that omit it, exactly mirroring `defineLive`'s own eventual fallback to
// `false` outside an active draft-mode session (the common case for a
// public preview visit), never silently overriding an explicit `false` or
// `true`.
const isPreview = process.env.VERCEL_ENV === 'preview'

const previewSanityFetch: DefinedFetchType = (async ({
  query,
  params = {},
  perspective,
  variant,
  stega,
  tags = [],
  requestTag = 'next-loader.fetch',
}) => {
  const { result, resultSourceMap } = await client.fetch(query, await params, {
    filterResponse: false,
    perspective,
    variant,
    stega: stega ?? false,
    returnQuery: false,
    tag: requestTag,
    next: { revalidate: previewRevalidateSeconds(), tags },
  })
  return { data: result, sourceMap: resultSourceMap ?? null, tags }
}) as DefinedFetchType

export const sanityFetch: DefinedFetchType = isPreview ? previewSanityFetch : liveSanityFetch
