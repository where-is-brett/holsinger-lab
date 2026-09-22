import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Separate file from fetch.test.ts on purpose. fetch.test.ts mocks
// `next-sanity`'s `createClient` entirely (a lightweight fake `.fetch`), so
// it can only ever prove wixFetch() *called* something with the right
// arguments -- not that those arguments land on the real request `@sanity/
// client` sends. That's exactly the gap that hid the redesign's original
// preview-freshness bug (see lib/sanity.live.ts's and lib/wix/fetch.ts's own
// comments on the trap): a client-level `next.revalidate` default genuinely
// exists and is honoured by `@sanity/client`'s own merge logic, but
// `defineLive`'s real content request hardcodes its own `next` object that
// replaces it wholesale -- a mock that stands in for the whole client can't
// distinguish "reached the client config" from "reached the actual outgoing
// fetch". This file uses the REAL `next-sanity`/`@sanity/client` code (only
// `lib/sanity.api`, for its env-var-gated config, and `next/headers`, for
// draftMode(), are mocked) and stubs `globalThis.fetch` to inspect the
// request-layer options the content query actually carries -- the same
// technique lib/sanity.live.test.ts uses for the redesign's own preview
// fetch.
vi.mock('lib/sanity.api', () => ({
  dataset: 'production',
  projectId: 'test-project',
  apiVersion: '2023-06-21',
  readToken: 'test-read-token',
  useCdn: false,
}))

// lib/wix/fetch.ts statically imports `sanityFetch` from lib/sanity.live,
// which calls next-sanity/live's `defineLive()` at module scope -- that
// throws under plain Vitest (see lib/wix/fixture.test.ts's own comment).
// Mocked here so the module can load at all; none of these tests exercise
// that branch (draft mode is always off, VERCEL_ENV is always 'preview').
vi.mock('lib/sanity.live', () => ({
  sanityFetch: async () => {
    throw new Error('sanityFetch (defineLive) was invoked; these tests only exercise the preview-client branch.')
  },
  SanityLive: () => null,
}))

const draftModeMock = vi.fn(async () => ({ isEnabled: false }))
vi.mock('next/headers', () => ({
  draftMode: draftModeMock,
}))

function stubFetch() {
  const calls: { url: string; init: RequestInit & { next?: { revalidate?: unknown; tags?: string[] } } }[] = []
  const fetchMock = vi.fn(async (url: string | URL, init: RequestInit = {}) => {
    calls.push({
      url: String(url),
      init: init as RequestInit & { next?: { revalidate?: unknown; tags?: string[] } },
    })
    const body = JSON.stringify({ ms: 1, query: '*', result: [] })
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

describe('wixFetch request-layer options (real @sanity/client, stubbed fetch)', () => {
  beforeEach(() => {
    vi.resetModules()
    draftModeMock.mockReset()
    draftModeMock.mockResolvedValue({ isEnabled: false })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('carries next.revalidate: 30 and next.tags: [] on the CONTENT request when no tags are passed', async () => {
    const calls = stubFetch()
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('WIX_FIXTURE', '')

    const { wixFetch } = await import('./fetch')
    await wixFetch('*[_type == "resource"]')

    expect(calls.length).toBeGreaterThan(0)
    for (const { init } of calls) {
      expect(init.next?.revalidate).toBe(30)
      expect(init.next?.tags).toEqual([])
    }
  })

  it('forwards caller-supplied tags onto the CONTENT request, not just a client default', async () => {
    const calls = stubFetch()
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('WIX_FIXTURE', '')

    const { wixFetch } = await import('./fetch')
    await wixFetch('*[_type == "resource"]', { tags: ['sanity:resource'] })

    expect(calls.length).toBeGreaterThan(0)
    for (const { init } of calls) {
      expect(init.next?.revalidate).toBe(30)
      expect(init.next?.tags).toEqual(['sanity:resource'])
    }
  })
})
