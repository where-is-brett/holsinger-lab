// Runs the site's real GROQ queries either against Sanity (normal path) or,
// with WIX_FIXTURE=1, against the committed fixture dataset -- so Part C's
// pages and components can be built and e2e-tested before the wix-preview
// Sanity dataset exists. See .superpowers/sdd/2026-09-22-wix-lookalike/
// task-C0-brief.md. Never set WIX_FIXTURE on Vercel.

import { sanityFetch } from 'lib/sanity.live'
import { draftMode } from 'next/headers'
import type { createClient } from 'next-sanity'

// Read once, cached at module level -- every call in fixture mode reuses it.
let fixtureDocs: Record<string, unknown>[] | null = null

async function loadFixtureDocs(): Promise<Record<string, unknown>[]> {
  if (fixtureDocs) return fixtureDocs
  const { readFileSync } = await import('node:fs')
  // Resolved relative to process.cwd() (Next runs from the project root),
  // not import.meta.url, because bundling moves this module elsewhere.
  const path = `${process.cwd()}/data/wix/fixture.ndjson`
  const raw = readFileSync(path, 'utf8')
  fixtureDocs = raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
  return fixtureDocs
}

/**
 * A Vercel preview deployment reads content through `wix-preview` (a
 * branch-scoped env var), but the Sanity revalidation webhook only targets
 * production -- so a preview deployment's cache tags are never invalidated,
 * and its ISR regenerations keep re-reading a stale Next Data Cache. There is
 * no per-call time-based revalidate option on `sanityFetch()` (the `defineLive`
 * client below): `DefinedFetchOptions` in next-sanity 13.3.3's
 * `dist/types.d.ts` only accepts `query`, `params`, `perspective`, `variant`,
 * `stega`, `tags` and `requestTag` -- no `next`/`revalidate`. That option
 * exists on a plain `@sanity/client`/`next-sanity` client's own `.fetch()`
 * (`ResponseQueryOptions.next`, which maps straight onto Next's `fetch`
 * `next.revalidate`), so preview reads bypass `sanityFetch` and go through a
 * second, plain client instead, with a short time-based revalidate as a
 * self-refreshing fallback. Production keeps `sanityFetch`'s tag-based
 * invalidation (plus the page-level `revalidate = 60`) untouched.
 *
 * This is the same trap `lib/sanity.live.ts`'s `previewSanityFetch` and
 * `lib/preview-revalidate.ts` document for the redesign's own preview reads
 * (merged from `redesign/integration`, PR #43 "portrait colour + preview
 * freshness"): a per-call `next.revalidate` genuinely reaches the request
 * layer (`@sanity/client`'s `requestOptions()`, node_modules/@sanity/client/
 * dist/index.js ~694, merges `{ ...config.fetch, ...overrides.fetch }` with
 * the per-call object last), but `defineLive`'s own content request
 * hardcodes `next: { revalidate: false, tags }` on itself -- so a
 * *client-level* `createClient({ fetch: { next: { revalidate } } } })`
 * default would be replaced wholesale on the one request whose data actually
 * reaches the page, and would only ever reach `defineLive`'s throwaway
 * sync-tags request instead. This file's `client.fetch(query, params, {
 * next: { revalidate: PREVIEW_REVALIDATE_SECONDS, tags }, ... })` call below
 * avoids that trap by construction: `next` is passed as a *per-call*
 * override directly on the one `.fetch()` call this file issues, never
 * through a client-level `fetch` default, so there is no second request for
 * `defineLive` (or anything else) to clobber it on. Confirmed by tracing
 * `@sanity/client`'s `_fetch()` (dist/index.js ~717): it destructures
 * `next`/`cache` off the per-call `options` argument and rebuilds
 * `reqOpts.fetch = { cache, next }`, which `requestOptions()` then merges
 * as `overrides.fetch` -- i.e. our value, landing last.
 *
 * Only taken outside draft mode (Fix round 2, High): `sanityFetch` resolves
 * BOTH `perspective` and `stega` from `draftMode()` when neither is passed
 * explicitly (see `DefinedFetchOptions`'s own docs), so a preview deployment
 * in draft mode -- reached from ITS OWN Studio, `/api/draft` having already
 * flipped the cookie, `RootLayout` already rendering `PreviewBanner` and
 * `VisualEditing` -- must keep going through `sanityFetch`. This branch's
 * `perspective: 'published'` and `stega: false` are hardcoded and would
 * otherwise show Damian a "preview" banner over published-only content with
 * no source map for the visual-editing overlays to bind to. Draft mode also
 * already forces dynamic rendering, so a time-based fetch revalidate would be
 * meaningless there regardless.
 *
 * VERIFIED (Step 3 of the freshness-reconcile task, not assumed): a real
 * `VERCEL_ENV=preview NEXT_PUBLIC_SANITY_DATASET=wix-preview npm run build
 * --webpack` and a read of the resulting `.next/prerender-manifest.json`
 * shows `initialRevalidateSeconds: 30` -- this constant, not 60 -- on all 7
 * Wix routes (`/`, `/contact`, `/media`, `/news`, `/publications`,
 * `/research`, `/team`), even though every one of those routes' own
 * `page.tsx` (and `app/layout.tsx`) still exports `export const revalidate
 * = 60`. Next computes a route's effective ISR window as the MINIMUM of its
 * static `revalidate` export and every fetch-level `next.revalidate` value
 * encountered while rendering it (a fetch-level revalidate can only shorten
 * a route's window, never lengthen it) -- so this 30s constant, not the
 * page-level 60, is what actually bounds preview staleness for an anonymous
 * visitor. An earlier draft of this comment claimed the opposite ("the real
 * bound is 'at most about 60s', not this constant") on the assumption that a
 * fetch-level revalidate only takes effect *after* the page-level window
 * elapses; the manifest disproves that. Passing
 * `tags` here (defaulted to `[]` when the caller doesn't supply any, same
 * shape as `lib/sanity.live.ts`'s `previewSanityFetch`) doesn't make
 * `<SanityLive />` (rendered in RootLayout) live on this path -- it still
 * revalidates by `sanity:*` cache tag via its own tag-sync mechanism, which
 * this plain client's `.fetch()` never participates in -- but it does mean a
 * caller that eventually passes real tags gets on-demand invalidation
 * working *when* the webhook does fire (e.g. if production's webhook is ever
 * pointed at this dataset too), instead of silently discarding them. The
 * timed revalidate remains preview's only *guaranteed* refresh mechanism.
 *
 * `lib/sanity.api` and `next-sanity`'s `createClient` are imported
 * dynamically, inside `getPreviewClient()`, rather than at module scope.
 * This does NOT let a fixture build skip `lib/sanity.api`'s env-var check --
 * this file already statically imports `lib/sanity.live`, which statically
 * imports `lib/sanity.api`, so `assertValue()` runs either way once this
 * module loads. The dynamic import only matters under Vitest, where
 * `lib/sanity.live` (and therefore its `lib/sanity.api` import) is mocked
 * out entirely -- a static import here would bypass that mock and throw.
 */
const PREVIEW_REVALIDATE_SECONDS = 30
let previewClient: ReturnType<typeof createClient> | null = null
async function getPreviewClient() {
  if (!previewClient) {
    const { apiVersion, dataset, projectId, readToken, useCdn } = await import('lib/sanity.api')
    const { createClient } = await import('next-sanity')
    previewClient = createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn,
      perspective: 'published',
      token: readToken || undefined,
      stega: { studioUrl: '/studio' },
    })
  }
  return previewClient
}

export async function wixFetch<T>(
  query: string,
  opts?: { params?: Record<string, unknown>; stega?: boolean; tags?: string[] }
): Promise<T | null> {
  if (process.env.WIX_FIXTURE === '1') {
    const { parse, evaluate } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'groq-js')
    const dataset = await loadFixtureDocs()
    const tree = parse(query)
    const result = await evaluate(tree, { dataset, params: opts?.params })
    return (await result.get()) as T
  }
  if (process.env.VERCEL_ENV === 'preview' && !(await draftMode()).isEnabled) {
    const client = await getPreviewClient()
    return client.fetch<T>(query, opts?.params ?? {}, {
      next: { revalidate: PREVIEW_REVALIDATE_SECONDS, tags: opts?.tags ?? [] },
      stega: opts?.stega ?? false,
    })
  }
  return (
    await sanityFetch({ query, params: opts?.params, stega: opts?.stega, tags: opts?.tags })
  ).data as T
}
