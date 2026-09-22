import { describe, expect, it, vi } from 'vitest'

// lib/wix/fetch.ts imports lib/sanity.api directly (for the preview client's
// config), whose module-scope assertValue() throws if the NEXT_PUBLIC_SANITY_*
// env vars are unset -- same reason lib/sanity.image.test.ts mocks it.
vi.mock('lib/sanity.api', () => ({
  dataset: 'production',
  projectId: 'test-project',
  apiVersion: '2023-06-21',
  readToken: '',
  useCdn: false,
}))

// See lib/wix/fixture.test.ts's own comment: lib/wix/fetch.ts statically
// imports `sanityFetch` from lib/sanity.live, which calls next-sanity's
// `defineLive()` at module scope -- that throws under plain Vitest, so it is
// mocked here too. `next-sanity`'s `createClient` is also mocked, so the
// preview-only client fetch.ts builds lazily can be observed without a real
// network call.
const sanityFetchMock = vi.fn(async (opts: { query: string; params?: unknown; stega?: boolean }) => ({
  data: { via: 'sanityFetch' as const, ...opts },
}))
vi.mock('lib/sanity.live', () => ({
  sanityFetch: (opts: unknown) => sanityFetchMock(opts as never),
  SanityLive: () => null,
}))

const previewFetchMock = vi.fn(async (query: string, params: unknown, options: unknown) => ({
  via: 'previewClient' as const,
  query,
  params,
  options,
}))
vi.mock('next-sanity', () => ({
  createClient: () => ({ fetch: previewFetchMock }),
}))

// draftMode() is async in the App Router; mutable so each test can toggle it
// without re-mocking. Defaults to disabled, matching a normal (non-Studio,
// non-Presentation) page load.
let draftModeEnabled = false
vi.mock('next/headers', () => ({
  draftMode: async () => ({ isEnabled: draftModeEnabled }),
}))

describe('wixFetch: preview deployments (VERCEL_ENV=preview) refresh on a short interval', () => {
  // These tests are about the non-fixture path (sanityFetch vs. the preview
  // client), so they must control WIX_FIXTURE themselves rather than inherit
  // whatever the environment happens to have -- .github/workflows/ci.yml sets
  // WIX_FIXTURE=1 at job level (for the e2e run against the fixture dataset),
  // and unit tests inherit that. wixFetch checks WIX_FIXTURE first and treats
  // anything other than the exact string '1' as "off" (`=== '1'`), so an
  // empty string here reliably disables it regardless of CI's job-level env.
  const setUp = () => {
    sanityFetchMock.mockClear()
    previewFetchMock.mockClear()
    draftModeEnabled = false
    vi.stubEnv('WIX_FIXTURE', '')
  }

  it('no VERCEL_ENV at all: options reach sanityFetch untouched, the preview client is never built', async () => {
    setUp()
    // vi.stubEnv() takes a string, not a way to unset -- delete/restore by hand
    // to actually exercise "the var isn't set", not "it's the string 'undefined'".
    const had = 'VERCEL_ENV' in process.env
    const original = process.env.VERCEL_ENV
    delete process.env.VERCEL_ENV
    try {
      const { wixFetch } = await import('./fetch')
      const result = await wixFetch<{ via: string }>('*[_type == "x"]', { params: { a: 1 }, stega: false })
      expect(sanityFetchMock).toHaveBeenCalledWith({ query: '*[_type == "x"]', params: { a: 1 }, stega: false })
      expect(previewFetchMock).not.toHaveBeenCalled()
      expect(result).toMatchObject({ via: 'sanityFetch' })
    } finally {
      if (had) process.env.VERCEL_ENV = original
      vi.unstubAllEnvs()
    }
  })

  it('VERCEL_ENV=production: options reach sanityFetch untouched, the preview client is never built', async () => {
    setUp()
    vi.stubEnv('VERCEL_ENV', 'production')
    try {
      const { wixFetch } = await import('./fetch')
      const result = await wixFetch<{ via: string }>('*[_type == "x"]', { params: { a: 1 }, stega: false })
      expect(sanityFetchMock).toHaveBeenCalledWith({ query: '*[_type == "x"]', params: { a: 1 }, stega: false })
      expect(previewFetchMock).not.toHaveBeenCalled()
      expect(result).toMatchObject({ via: 'sanityFetch' })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('VERCEL_ENV=preview, draft mode off: the fetch goes through the plain client with a 30s time-based revalidate and empty tags by default, sanityFetch is never called', async () => {
    setUp()
    vi.stubEnv('VERCEL_ENV', 'preview')
    try {
      const { wixFetch } = await import('./fetch')
      const result = await wixFetch<{ via: string }>('*[_type == "x"]', { params: { a: 1 } })
      expect(previewFetchMock).toHaveBeenCalledWith(
        '*[_type == "x"]',
        { a: 1 },
        { next: { revalidate: 30, tags: [] }, stega: false }
      )
      expect(sanityFetchMock).not.toHaveBeenCalled()
      expect(result).toMatchObject({ via: 'previewClient' })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('VERCEL_ENV=preview, draft mode off: caller-supplied tags reach the CONTENT request, matching lib/sanity.live.ts\'s previewSanityFetch shape', async () => {
    setUp()
    vi.stubEnv('VERCEL_ENV', 'preview')
    try {
      const { wixFetch } = await import('./fetch')
      await wixFetch<{ via: string }>('*[_type == "x"]', { params: { a: 1 }, tags: ['sanity:x'] })
      expect(previewFetchMock).toHaveBeenCalledWith(
        '*[_type == "x"]',
        { a: 1 },
        { next: { revalidate: 30, tags: ['sanity:x'] }, stega: false }
      )
      expect(sanityFetchMock).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('VERCEL_ENV=preview, draft mode ON (Fix round 2, High): sanityFetch is used -- the preview client must never be built, or Studio preview and visual editing break', async () => {
    setUp()
    draftModeEnabled = true
    vi.stubEnv('VERCEL_ENV', 'preview')
    try {
      const { wixFetch } = await import('./fetch')
      const result = await wixFetch<{ via: string }>('*[_type == "x"]', { params: { a: 1 }, stega: true })
      expect(sanityFetchMock).toHaveBeenCalledWith({ query: '*[_type == "x"]', params: { a: 1 }, stega: true })
      expect(previewFetchMock).not.toHaveBeenCalled()
      expect(result).toMatchObject({ via: 'sanityFetch' })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('WIX_FIXTURE=1 wins over VERCEL_ENV=preview (Fix round 3): the fixture branch is checked first, so neither sanityFetch nor the preview client is ever called', async () => {
    setUp()
    vi.stubEnv('WIX_FIXTURE', '1')
    vi.stubEnv('VERCEL_ENV', 'preview')
    try {
      const { wixFetch } = await import('./fetch')
      // The fixture branch really runs here (it reads the committed
      // data/wix/fixture.ndjson and evaluates the query with groq-js -- see
      // lib/wix/fixture.test.ts for that path's own coverage). This query
      // matches no document, so the real, meaningful result is an empty
      // array -- what matters for THIS test is which branch ran at all.
      const result = await wixFetch('*[_type == "no-such-type"]')
      expect(result).toEqual([])
      expect(sanityFetchMock).not.toHaveBeenCalled()
      expect(previewFetchMock).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
