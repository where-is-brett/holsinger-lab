// Runs the site's real GROQ queries either against Sanity (normal path) or,
// with WIX_FIXTURE=1, against the committed fixture dataset -- so Part C's
// pages and components can be built and e2e-tested before the wix-preview
// Sanity dataset exists. See .superpowers/sdd/2026-09-22-wix-lookalike/
// task-C0-brief.md. Never set WIX_FIXTURE on Vercel.

import { sanityFetch } from 'lib/sanity.live'
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
 * `lib/sanity.api` and `next-sanity`'s `createClient` are imported
 * dynamically, inside `getPreviewClient()`, rather than at module scope --
 * `lib/sanity.api`'s module-scope `assertValue()` throws if the
 * NEXT_PUBLIC_SANITY_* env vars are unset, which fixture mode (WIX_FIXTURE=1,
 * used for tests and pre-dataset builds -- see the module comment above)
 * never sets and must not require.
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
  opts?: { params?: Record<string, unknown>; stega?: boolean }
): Promise<T | null> {
  if (process.env.WIX_FIXTURE === '1') {
    const { parse, evaluate } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'groq-js')
    const dataset = await loadFixtureDocs()
    const tree = parse(query)
    const result = await evaluate(tree, { dataset, params: opts?.params })
    return (await result.get()) as T
  }
  if (process.env.VERCEL_ENV === 'preview') {
    const client = await getPreviewClient()
    return client.fetch<T>(query, opts?.params ?? {}, {
      next: { revalidate: PREVIEW_REVALIDATE_SECONDS },
      stega: opts?.stega ?? false,
    })
  }
  return (
    await sanityFetch({ query, params: opts?.params, stega: opts?.stega })
  ).data as T
}
