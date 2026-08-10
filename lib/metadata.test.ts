import { describe, expect, it } from 'vitest'

import { buildMetadata } from './metadata'

describe('buildMetadata', () => {
  it('joins title and baseTitle with a pipe', () => {
    const metadata = buildMetadata({
      path: '/',
      title: 'Home',
      baseTitle: 'Holsinger Lab',
    })
    expect(metadata.title).toBe('Home | Holsinger Lab')
  })

  it('falls back to baseTitle alone when title is omitted', () => {
    const metadata = buildMetadata({ path: '/', baseTitle: 'Holsinger Lab' })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('falls back to the site name when neither title nor baseTitle is given', () => {
    const metadata = buildMetadata({ path: '/' })
    expect(metadata.title).toBe('Holsinger Lab')
  })

  it('builds an absolute canonical URL from siteUrl + path', () => {
    const metadata = buildMetadata({ path: '/about' })
    expect(metadata.alternates?.canonical).toBe(
      'https://holsingerlab.vercel.app/about'
    )
  })

  it('sets robots.index=false for a path in the noindex list', () => {
    const metadata = buildMetadata({ path: '/tutorial' })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('sets robots.index=false when noindex is explicitly true, even off the noindex list', () => {
    const metadata = buildMetadata({ path: '/', noindex: true })
    expect(metadata.robots).toEqual({ index: false })
  })

  it('leaves robots undefined for an indexable path', () => {
    const metadata = buildMetadata({ path: '/' })
    expect(metadata.robots).toBeUndefined()
  })

  it('carries description through to openGraph and twitter', () => {
    const metadata = buildMetadata({ path: '/about', description: 'A description' })
    expect(metadata.openGraph?.description).toBe('A description')
    expect(metadata.twitter?.description).toBe('A description')
  })

  it('omits images and uses the summary Twitter card when no image is given', () => {
    const metadata = buildMetadata({ path: '/' })
    expect(metadata.openGraph?.images).toBeUndefined()
    expect((metadata.twitter as any).card).toBe('summary')
  })
})
