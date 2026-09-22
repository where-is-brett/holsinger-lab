// Preview deploys served stale content (a resource that exists in the
// `wix-preview` dataset rendered as "0 RESOURCES" behind an `x-vercel-cache:
// HIT`) because the Sanity revalidation webhook only targets production --
// preview pages' `sanityFetch` calls only ever get cache tags that nothing
// ever invalidates on demand there. The fix is a shorter time-based
// revalidate window on preview, so a stale page self-heals within seconds
// instead of waiting on a webhook that will never fire.
//
// This pure switch -- 30s on preview, the existing 60s everywhere else -- is
// consumed from `lib/sanity.live.ts` as a `createClient({ fetch: { next:
// { revalidate: previewRevalidateSeconds() } } })` client-level default; see
// that file's own comment for why that's the one seam of the brief's three
// options that this `next-sanity` version and Next's route-config AST
// extraction actually support, and for the trail (types read, build error
// hit) that got there.
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
 * The revalidate window (seconds) `lib/sanity.live.ts`'s Sanity client
 * should use as its default `fetch` `next.revalidate`: a short 30s window on
 * Vercel preview deployments (`VERCEL_ENV === 'preview'`), where the
 * production-only webhook never fires on-demand tag revalidation, and the
 * existing 60s window everywhere else (production, local dev, CI, where
 * `VERCEL_ENV` is unset) -- matching every route's own `export const
 * revalidate = 60`, so production behaviour is unchanged.
 */
export function previewRevalidateSeconds(
  vercelEnv: string | undefined = process.env.VERCEL_ENV
): number {
  return vercelEnv === 'preview' ? PREVIEW_REVALIDATE_SECONDS : PRODUCTION_REVALIDATE_SECONDS
}
