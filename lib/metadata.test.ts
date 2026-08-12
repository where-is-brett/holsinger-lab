import { describe, expect, it, vi } from 'vitest'

// buildMetadata (transitively) imports lib/sanity.image, which imports
// lib/sanity.api — whose module-scope assertValue() throws if Sanity env
// vars are unset. None of these tests exercise the `image` argument, so
// stub the import out entirely rather than requiring real env vars.
vi.mock('lib/sanity.image', () => ({ urlForImage: vi.fn() }))

import { buildMetadata } from './metadata'

describe('buildMetadata', () => {
  it('joins title and baseTitle with a pipe', () => {
    const metadata = buildMetadata({
      path: '/',
      siteName: 'Holsinger Lab',
      title: 'Home',
      baseTitle: 'Holsinger Lab',
    })
    expect(metadata.title).toBe('Home | Holsinger Lab')
  })

  it('falls back to baseTitle alone when title is omitted', () => {
    const metadata = buildMetadata({
      path: '/',
      siteName: 'Holsinger Lab',
      baseTitle: 'Holsinger Lab',
    })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('falls back to the site name when neither title nor baseTitle is given', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'Holsinger Lab' })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('uses the supplied site name rather than any built-in constant', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'A Different Lab' })
    expect(metadata.title).toBe('A Different Lab')
    expect(metadata.openGraph?.siteName).toBe('A Different Lab')
  })

  it('builds an absolute canonical URL from siteUrl + path', () => {
    const metadata = buildMetadata({ path: '/about', siteName: 'Holsinger Lab' })
    expect(metadata.alternates?.canonical).toBe(
      'https://holsingerlab.vercel.app/about'
    )
  })

  it('sets robots.index=false for a path in the noindex list', () => {
    const metadata = buildMetadata({
      path: '/tutorial',
      siteName: 'Holsinger Lab',
    })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('sets robots.index=false when noindex is explicitly true, even off the noindex list', () => {
    const metadata = buildMetadata({
      path: '/',
      siteName: 'Holsinger Lab',
      noindex: true,
    })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('leaves robots undefined for an indexable path', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'Holsinger Lab' })
    expect(metadata.robots).toBeUndefined()
  })

  it('carries description through to openGraph and twitter', () => {
    const metadata = buildMetadata({
      path: '/about',
      siteName: 'Holsinger Lab',
      description: 'A description',
    })
    expect(metadata.openGraph?.description).toBe('A description')
    expect(metadata.twitter?.description).toBe('A description')
  })

  it('omits images and uses the summary Twitter card when no image is given', () => {
    const metadata = buildMetadata({ path: '/', siteName: 'Holsinger Lab' })
    expect(metadata.openGraph?.images).toBeUndefined()
    expect((metadata.twitter as { card?: string })?.card).toBe('summary')
  })
})
