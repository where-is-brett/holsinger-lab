import { vi } from 'vitest'

// lib/sanity.live.ts calls next-sanity's `defineLive()` at module scope, and
// `defineLive` throws unconditionally unless the importing module resolves
// under Next.js's own bundler (the `react-server`/`next-js` package.json
// export conditions, which alias things like `next/headers` and `next/cache`
// that only exist inside Next's build -- there is no way to satisfy them
// under plain Vitest). So any test that imports lib/sanity.live, even
// transitively, needs it mocked; doing it here (rather than per test file,
// like lib/sanity.image.test.ts mocks lib/sanity.api) covers every current
// and future test that reaches it without editing spec-mandated test files.
vi.mock('lib/sanity.live', () => ({
  sanityFetch: async () => {
    throw new Error(
      'sanityFetch (the real Sanity client) was invoked in a test. ' +
        'Only fixture mode (WIX_FIXTURE=1, via lib/wix/fetch.ts) is expected to run under Vitest.'
    )
  },
  SanityLive: () => null,
}))
