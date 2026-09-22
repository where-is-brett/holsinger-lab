import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// lib/sanity.live imports lib/sanity.api, whose module-scope assertValue()
// throws if the Sanity env vars are unset -- the established workaround
// elsewhere in this repo (lib/metadata.test.ts, lib/json-ld.test.ts,
// lib/icons.test.ts, lib/sanity.image.test.ts) is to mock that transitive
// import with fixed values instead of loading it for real.
vi.mock('lib/sanity.api', () => ({
  dataset: 'production',
  projectId: 'test-project',
  apiVersion: '2023-06-21',
  readToken: '',
  useCdn: false,
}))

// `next-sanity/live`'s package.json `exports` map picks a different built
// module per bundler-supplied "condition" -- `react-server` (used by Next's
// own server compiler; confirmed by grepping the built `.next/server`
// output for a string only that condition's module emits -- see
// lib/sanity.live.ts's own comment) implements the real defineLive; the
// `default` condition (what Vitest's resolver picks, since it never sets a
// `react-server` condition) is a stub whose `defineLive` unconditionally
// throws ("defineLive can't be imported by a client component"). Deep-
// importing the real `react-server` build to run its actual internals under
// Vitest turns out to be its own rabbit hole (that build's own `next/headers`
// import doesn't resolve through Vitest's externalized-module path the way
// it does inside a real Next server), so this mocks `defineLive` itself
// instead with a lightweight fake -- deliberately, not as a workaround for
// something this module's own code needs. `defineLive`'s *internals* are
// `next-sanity`'s code, not this repo's, and already exercised for real by
// this branch's own `npm run build` and `npm run test:e2e` (both hit the
// genuine `react-server` build, since Next itself sets that condition).
// What this suite actually owns and must prove is the *routing decision* in
// lib/sanity.live.ts: on preview, every request bypasses `defineLive`
// entirely and goes through `previewSanityFetch`'s own `client.fetch` call
// (real -- `next-sanity`'s plain `createClient` is NOT mocked, so the
// `next.revalidate`/`next.tags` this test captures via a stubbed
// `globalThis.fetch` are exactly what a real preview deployment's request
// would carry); off preview, `sanityFetch` must be `defineLive`'s own
// returned function, completely untouched -- proven by reference identity
// against this mock's sentinel, which is a stronger guarantee than
// replicating `defineLive`'s internal request shape would be (that shape is
// next-sanity's implementation detail, not this repo's contract).
const fakeLiveSanityFetch = vi.fn(async () => ({ data: null, sourceMap: null, tags: [] }))
vi.mock('next-sanity/live', () => ({
  defineLive: vi.fn(() => ({
    sanityFetch: fakeLiveSanityFetch,
    SanityLive: () => null,
  })),
}))

// This is the request-layer proof the coordinator's fix round asked for --
// the build-manifest check a previous round relied on
// (`VERCEL_ENV=preview npm run build`'s route table showing "30s") only
// ever measured defineLive's throwaway sync-tags request, never the actual
// content request, which hardcoded `next: { revalidate: false, tags }` and
// so never actually shortened. Stubbing `globalThis.fetch` and inspecting
// the captured `init.next` on the request `previewSanityFetch` issues is
// the only way to see what request-layer options the content query itself
// actually carries.
function stubFetch() {
  const calls: { url: string; init: RequestInit & { next?: { revalidate?: unknown; tags?: string[] } } }[] = []
  const fetchMock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    calls.push({
      url: String(url),
      init: init as RequestInit & { next?: { revalidate?: unknown; tags?: string[] } },
    })
    const body = JSON.stringify({ ms: 1, query: '*', result: { stub: true } })
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

// `lib/sanity.live.ts` reads `process.env.VERCEL_ENV` once at module load
// (a deliberate runtime value, not a static route-config export -- see that
// file's own comment) to decide which `sanityFetch` implementation to
// export, so each case here needs its own fresh module instance: set the
// env var, `vi.resetModules()`, then dynamically `import()` the module.
async function loadSanityLive(vercelEnv: string | undefined) {
  vi.resetModules()
  if (vercelEnv === undefined) {
    delete process.env.VERCEL_ENV
  } else {
    vi.stubEnv('VERCEL_ENV', vercelEnv)
  }
  return await import('./sanity.live')
}

describe('sanityFetch request-layer revalidate', () => {
  const originalVercelEnv = process.env.VERCEL_ENV

  beforeEach(() => {
    vi.resetModules()
    fakeLiveSanityFetch.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV
    } else {
      process.env.VERCEL_ENV = originalVercelEnv
    }
  })

  it('carries next.revalidate: 30 on the content request when VERCEL_ENV is preview, and never touches defineLive', async () => {
    const calls = stubFetch()
    const { sanityFetch } = await loadSanityLive('preview')

    await sanityFetch({ query: '*[_type == "resource"]', stega: false })

    expect(calls.length).toBeGreaterThan(0)
    // Every request `previewSanityFetch` issues carries the short window --
    // there's exactly one (no separate sync-tags round trip, per this
    // module's own doc comment on what it deliberately doesn't replicate),
    // but asserting "every call" rather than "the last call" keeps this
    // from silently passing if that ever changes.
    for (const { init } of calls) {
      expect(init.next?.revalidate).toBe(30)
      expect(init.next?.tags).toEqual([])
    }
    expect(fakeLiveSanityFetch).not.toHaveBeenCalled()
  })

  it('delegates to defineLive\'s own sanityFetch, untouched, when VERCEL_ENV is production', async () => {
    stubFetch()
    const { sanityFetch } = await loadSanityLive('production')

    expect(sanityFetch).toBe(fakeLiveSanityFetch)

    await sanityFetch({ query: '*[_type == "resource"]', stega: false })
    expect(fakeLiveSanityFetch).toHaveBeenCalledTimes(1)
  })

  it('delegates to defineLive\'s own sanityFetch, untouched, when VERCEL_ENV is unset (local dev, CI, non-Vercel runs)', async () => {
    stubFetch()
    const { sanityFetch } = await loadSanityLive(undefined)

    expect(sanityFetch).toBe(fakeLiveSanityFetch)

    await sanityFetch({ query: '*[_type == "resource"]', stega: false })
    expect(fakeLiveSanityFetch).toHaveBeenCalledTimes(1)
  })

  it('forwards an explicit stega: false through previewSanityFetch rather than silently dropping it', async () => {
    const calls = stubFetch()
    const { sanityFetch } = await loadSanityLive('preview')

    await sanityFetch({ query: '*[_type == "resource"]', stega: false })

    // `@sanity/client`'s `_requestObservable` (node_modules/@sanity/client/
    // dist/index.js ~971-972) appends `resultSourceMap=withKeyArraySelector`
    // to the request URL's own query string only when stega is enabled --
    // it's *this* param reaching the wire that a stega-enabled request
    // actually needs (source maps are what let stega decorate the result
    // string-by-string). So its absence here is the request-layer proof
    // that `stega: false` really reached `client.fetch()`, not just that
    // the call didn't throw: if this wrapper silently forced `stega: true`
    // instead of honouring the caller's explicit `false` -- exactly the
    // regression the coordinator flagged as unacceptable -- this param
    // would appear.
    expect(calls.length).toBeGreaterThan(0)
    for (const { url } of calls) {
      expect(url).not.toContain('resultSourceMap')
    }
  })

  it('defaults to stega: false (not true) when the caller omits stega entirely', async () => {
    const calls = stubFetch()
    const { sanityFetch } = await loadSanityLive('preview')

    await sanityFetch({ query: '*[_type == "resource"]' })

    // Same proof as above, for the no-`stega`-key call shape several
    // real call sites use (e.g. app/page.tsx's `homePageQuery` fetch) --
    // `previewSanityFetch`'s `stega ?? false` must default it to `false`,
    // not leave it `undefined` in a way `client.fetch` might itself
    // default to `true`.
    for (const { url } of calls) {
      expect(url).not.toContain('resultSourceMap')
    }
  })
})
