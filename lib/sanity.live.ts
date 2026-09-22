import { previewRevalidateSeconds } from 'lib/preview-revalidate'
import { apiVersion, dataset, projectId, readToken, useCdn } from 'lib/sanity.api'
import { createClient } from 'next-sanity'
import { defineLive } from 'next-sanity/live'

// Every route's `export const revalidate = 60` (a Next.js route segment
// config) sets that route's ISR window, but the export's value is extracted
// by parsing the route file's AST for a literal -- Next's
// `extractExportedConstValue` (node_modules/next/dist/esm/build/analysis/
// extract-const-value.js) only understands literals (string/number/boolean/
// null/array/object/template-literal-without-expressions/TS assertions), and
// explicitly rejects any `CallExpression`, `ConditionalExpression` or
// `MemberExpression` node ("Unsupported node type"). A first attempt at this
// fix set every route's `revalidate` to `previewRevalidateSeconds()`
// (a call) and `npm run build` failed immediately with "Invalid segment
// configuration export detected" -- confirming route `revalidate` cannot
// read `process.env.VERCEL_ENV` at all, let alone branch on it. So the route
// segment config, brief's third option, is not usable here.
//
// The working seam is `createClient`'s own `fetch` option (`ClientConfig`
// in `node_modules/@sanity/client/dist/index.d.ts` -- deprecated in favour
// of per-call `cache`/`next`, but still read as the request's default): the
// client's own `requestOptions()` builds every request's `fetch` init as
// `overrides.fetch || config.fetch`
// (`node_modules/@sanity/client/dist/index.js`), and `defineLive`'s internal
// `sanityFetch` (`node_modules/next-sanity/dist/live/conditions/next-js/
// index.js`) never passes a `fetch`/`cache`/`next` override of its own, so
// this client-level default reaches every request untouched. `defineLive`
// clones this client with `withConfig({allowReconfigure: false, useCdn:
// true, perspective: 'published', stega: false})`, which shallow-merges over
// `thisConfig` and never touches `fetch`, so it survives that clone too.
// This is the brief's second option -- "a client-level default" -- and it's
// genuinely a runtime value (evaluated when this module's top-level code
// runs), not a static export, so it isn't subject to the AST restriction
// above at all.
//
// `next: { revalidate }` on a `fetch()` call is a real Next.js primitive
// (not invented here): Next's Data Cache takes the *minimum* of a route's
// segment-config `revalidate` and every fetch's own `next.revalidate` as
// that route's effective ISR window. Passing `previewRevalidateSeconds()`
// here (60 in production, matching every route's own `revalidate = 60`
// literal -- a no-op; 30 in preview, below it) shortens preview's effective
// window without touching any route file or production's behaviour.
const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn,
  perspective: 'published',
  stega: { studioUrl: '/studio' },
  fetch: { next: { revalidate: previewRevalidateSeconds() } },
})

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: readToken || false,
  browserToken: false,
})
