import { describe, expect, it, vi } from 'vitest'

// lib/sanity.image imports lib/sanity.api, whose module-scope assertValue()
// throws if the NEXT_PUBLIC_SANITY_* env vars are unset. Unlike
// lib/metadata.test.ts and lib/json-ld.test.ts -- which mock out
// lib/sanity.image itself, because neither ever exercises it -- this suite's
// whole point is to run the REAL urlForImage, so it mocks the layer below
// instead. Fixed project/dataset strings are enough for @sanity/image-url to
// build a URL; it never makes a network call.
vi.mock('lib/sanity.api', () => ({
  dataset: 'production',
  projectId: 'test-project',
}))

import { urlForImage } from './sanity.image'

describe('urlForImage', () => {
  it('resolves a plain reference-shaped asset (the common case: every image field except settings.logo/logoDark)', () => {
    // The shape every non-dereferenced image query in this codebase produces
    // -- e.g. labHead.image.asset, typed as SanityImageAssetReference with a
    // `_ref` string and no `_id`.
    const result = urlForImage({
      _type: 'image',
      asset: {
        _ref: 'image-abc123-800x600-png',
        _type: 'reference',
      },
    } as never)

    expect(result).toBeDefined()
  })

  it('resolves a dereferenced asset (settings.logo/logoDark, projected with asset->{...})', () => {
    // settingsQuery projects logo/logoDark with a GROQ `asset->{...}`
    // dereference so it can also reach metadata.dimensions.aspectRatio for
    // the logo's derived width. A `->` dereference replaces the reference
    // object with the full target document, so this shape has `_id`
    // (matching sanity.types.ts:836-862's generated `logo` type) and NO
    // `_ref` at all -- unlike every other image field in this codebase.
    const result = urlForImage({
      _type: 'image',
      asset: {
        _id: 'image-abc123-800x600-png',
        _type: 'sanity.imageAsset',
        _createdAt: '2026-01-01T00:00:00Z',
        _updatedAt: '2026-01-01T00:00:00Z',
        _rev: 'rev1',
        url: 'https://cdn.sanity.io/images/j3f9z8os/production/abc123-800x600.png',
        metadata: {
          dimensions: {
            aspectRatio: 1.3333333333333333,
          },
        },
      },
    } as never)

    expect(result).toBeDefined()
  })

  it('returns undefined when the asset has neither _ref nor _id', () => {
    // The guard's actual job: reject a genuinely malformed/absent asset
    // rather than passing it through to the image builder.
    const result = urlForImage({
      _type: 'image',
      asset: {},
    } as never)

    expect(result).toBeUndefined()
  })

  it('returns undefined when there is no asset at all', () => {
    const result = urlForImage({ _type: 'image' } as never)

    expect(result).toBeUndefined()
  })
})
