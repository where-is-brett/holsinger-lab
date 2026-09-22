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

describe('wixFetch: preview deployments (VERCEL_ENV=preview) refresh on a short interval', () => {
  it('production/local (no VERCEL_ENV, or VERCEL_ENV=production): options reach sanityFetch untouched, the preview client is never built', async () => {
    sanityFetchMock.mockClear()
    previewFetchMock.mockClear()
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

  it('VERCEL_ENV=preview: the fetch goes through the plain client with a 30s time-based revalidate, sanityFetch is never called', async () => {
    sanityFetchMock.mockClear()
    previewFetchMock.mockClear()
    vi.stubEnv('VERCEL_ENV', 'preview')
    try {
      const { wixFetch } = await import('./fetch')
      const result = await wixFetch<{ via: string }>('*[_type == "x"]', { params: { a: 1 } })
      expect(previewFetchMock).toHaveBeenCalledWith(
        '*[_type == "x"]',
        { a: 1 },
        { next: { revalidate: 30 }, stega: false }
      )
      expect(sanityFetchMock).not.toHaveBeenCalled()
      expect(result).toMatchObject({ via: 'previewClient' })
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
