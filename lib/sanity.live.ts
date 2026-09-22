import { previewRevalidateSeconds } from 'lib/preview-revalidate'
import { apiVersion, dataset, projectId, readToken, useCdn } from 'lib/sanity.api'
import { draftMode } from 'next/headers'
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
// THE FIX: bypass `defineLive`'s `sanityFetch` entirely on preview, for
// anonymous requests only, and issue the content query directly through
// the plain `client` above, with an explicit `next: { revalidate:
// previewRevalidateSeconds(), tags }` this time putting the short
// revalidate on the request that actually carries the page's data.
// `isPreview` is read once per server instance (a runtime value, not a
// static export, so none of the AST restriction above applies).
//
// FIX ROUND 2 CORRECTION: the first version of this fix bypassed
// `defineLive` unconditionally on preview, including for draft-mode
// requests -- and its own comment here claimed drafts merely "lag by 30s".
// That was wrong: `previewSanityFetch` never resolved the draft-mode
// perspective, passed no token, and forced `stega: false` on any caller
// that omits it (e.g. app/page.tsx's `homePageQuery` fetch, where
// `defineLive` would otherwise default `stega` to
// `(await draftMode()).isEnabled`). A Studio preview session on a preview
// deployment -- exactly where a non-technical editor like Damian would use
// it, via the embedded Studio (`plugins/previewPane`,
// `app/api/draft/route.ts`) and `app/layout.tsx`'s `draftMode()`-gated
// `<PreviewBanner />`/`<VisualEditing />` -- would have rendered published
// content forever and lost click-to-edit overlays entirely, not just
// slowed down. `previewSanityFetch` now checks draft mode itself, first,
// and delegates the *entire* request to `liveSanityFetch` (unmodified --
// same cookie-resolved perspective/variant/stega, same token, same
// `<SanityLive />` cache-tag bookkeeping) whenever it's on. Calling
// `draftMode()` here unconditionally, even during static prerendering, is
// safe and matches existing behaviour: `defineLive`'s own `sanityFetch`
// already calls it via `resolveCookiePerspective`/`resolveCookieVariant`
// whenever `serverToken` is set (true in this repo -- see
// `SANITY_API_READ_TOKEN` in `.env.local`) on every call that omits an
// explicit `perspective`, which is most of them -- and this repo's routes
// still prerender as static/SSG (confirmed by `npm run build`'s own route
// table), so Next's static generation already tolerates a Dynamic API call
// here without forcing the route dynamic.
//
// So, on a preview deployment: draft-mode requests (Studio preview
// sessions, Presentation Tool, click-to-edit) get exactly `defineLive`'s
// live behaviour, unchanged -- real-time updates, the drafts perspective,
// stega. Anonymous requests (a public visitor, or Damian checking the
// preview URL without draft mode on) get the 30s revalidate window -- the
// actual bug this fix targets, since a stale preview page is a problem for
// anonymous visitors, not for an active Studio session that already
// bypasses this path entirely.
//
// What does NOT regress on the anonymous path: every caller's own explicit
// `stega` option (several call sites pass `stega: false` deliberately,
// e.g. any field that reaches an href/meta tag verbatim) is forwarded
// through unchanged -- `stega: options.stega ?? false` only substitutes a
// default for callers that omit it. Outside an active draft-mode session
// that default is correct: `defineLive` itself only ever defaults `stega`
// to `true` when draft mode is on (the branch this wrapper now delegates
// away entirely), so `false` is the right default for every anonymous
// request regardless.
const isPreview = process.env.VERCEL_ENV === 'preview'

const previewSanityFetch: DefinedFetchType = (async (options) => {
  if ((await draftMode()).isEnabled) {
    return liveSanityFetch(options)
  }
  const {
    query,
    params = {},
    perspective,
    variant,
    stega,
    tags = [],
    requestTag = 'next-loader.fetch',
  } = options
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
