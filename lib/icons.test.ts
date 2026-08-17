import { describe, expect, it, vi } from 'vitest'

// Same reasoning and shape as lib/json-ld.test.ts's mock: lib/sanity.image
// transitively imports lib/sanity.api, whose module-scope assertValue()
// throws if Sanity env vars are unset. A self-referential chain object
// supports any order/combination of builder calls before `.url()`, so one
// mock covers both this module's `.width().url()` and the rest of the
// codebase's `.width().height().fit().url()`.
vi.mock('lib/sanity.image', () => ({
  urlForImage: () => {
    const chain = {
      width: () => chain,
      height: () => chain,
      fit: () => chain,
      format: () => chain,
      url: () => 'https://cdn.sanity.io/mock-icon.png',
    }
    return chain
  },
}))

import { resolveIconUrl } from 'lib/icons'
import type { Image } from 'sanity'

describe('resolveIconUrl', () => {
  it('returns null when no icon is uploaded', () => {
    expect(resolveIconUrl(null, 32)).toBeNull()
    expect(resolveIconUrl(undefined, 32)).toBeNull()
  })

  it('resolves a Sanity CDN URL when an icon is uploaded', () => {
    const icon = { asset: { _ref: 'image-abc123-512x512-png' } } as Image
    expect(resolveIconUrl(icon, 32)).toBe('https://cdn.sanity.io/mock-icon.png')
  })

  it('resolves the same URL shape at every requested size', () => {
    const icon = { asset: { _ref: 'image-abc123-512x512-png' } } as Image
    for (const size of [16, 32, 180, 192, 512]) {
      expect(resolveIconUrl(icon, size)).toBe(
        'https://cdn.sanity.io/mock-icon.png'
      )
    }
  })
})
