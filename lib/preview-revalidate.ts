// Preview deploys served stale content (a resource that exists in the
// `wix-preview` dataset rendered as "0 RESOURCES" behind an `x-vercel-cache:
// HIT`) because the Sanity revalidation webhook only targets production --
// preview pages' `sanityFetch` calls only ever get cache tags that nothing
// ever invalidates on demand there. The fix is a shorter time-based
// revalidate window on preview, so a stale page self-heals within seconds
// instead of waiting on a webhook that will never fire.
//
// This pure switch -- 30s on preview, the existing 60s everywhere else -- is
// consumed from `lib/sanity.live.ts`'s `previewSanityFetch`, a direct
// `client.fetch(query, params, { ..., next: { revalidate:
// previewRevalidateSeconds(), tags } })` call that bypasses `defineLive`'s
// own `sanityFetch` for anonymous (non-draft-mode) requests on preview
// deployments. An earlier attempt set this as a `createClient({ fetch: {
// next: { revalidate } } } })` client-level default instead -- that looked
// promising (the option genuinely exists and is honoured as a per-request
// fallback) but never actually worked: `defineLive`'s real content request
// hardcodes its own `next: { revalidate: false, tags }` override, which
// replaces a client-level default wholesale rather than merging with it, so
// the short window only ever reached a throwaway sync-tags request, never
// the one whose data reaches the page. See `lib/sanity.live.ts`'s own
// comment for the full trail (types read, that dead end, the build error
// that ruled out a route-config export too, and the draft-mode carve-out
// that came after this fix's first round shipped).
//
// Lives in its own module, not inline in `lib/sanity.live.ts`, so its test
// needs no mocking: `lib/sanity.live.ts` imports `lib/sanity.api`, whose
// module-scope `assertValue()` throws when the `NEXT_PUBLIC_SANITY_*` env
// vars are unset (the established workaround elsewhere in this repo -- see
// `lib/metadata.test.ts`, `lib/json-ld.test.ts`, `lib/icons.test.ts`,
// `lib/sanity.image.test.ts` -- is to mock that transitive import). This
// module has no such dependency.
const PRODUCTION_REVALIDATE_SECONDS = 60
const PREVIEW_REVALIDATE_SECONDS = 30

/**
 * The revalidate window (seconds) `lib/sanity.live.ts`'s `previewSanityFetch`
 * passes as its own `next.revalidate` on the content request it issues
 * directly: a short 30s window on Vercel preview deployments
 * (`VERCEL_ENV === 'preview'`), where the production-only webhook never
 * fires on-demand tag revalidation, and the existing 60s window everywhere
 * else (production, local dev, CI, where `VERCEL_ENV` is unset) -- matching
 * every route's own `export const revalidate = 60`, so production
 * behaviour is unchanged. Only reached for anonymous (non-draft-mode)
 * requests -- `previewSanityFetch` delegates to `defineLive`'s own
 * `sanityFetch` whenever draft mode is enabled, so a Studio preview session
 * never sees this shortened window at all, only the real thing.
 */
export function previewRevalidateSeconds(
  vercelEnv: string | undefined = process.env.VERCEL_ENV
): number {
  return vercelEnv === 'preview' ? PREVIEW_REVALIDATE_SECONDS : PRODUCTION_REVALIDATE_SECONDS
}
