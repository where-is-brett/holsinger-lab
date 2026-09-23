import { describe, expect, it, vi } from 'vitest'

// researchModel imports lib/sanity.image, which imports lib/sanity.api,
// whose module-scope assertValue() throws if the NEXT_PUBLIC_SANITY_* env
// vars are unset -- same reasoning/mock as lib/sanity.image.test.ts, since
// `toResearchView` runs the real `urlForImage`/`@sanity/image-url` builder.
vi.mock('lib/sanity.api', () => ({
  dataset: 'production',
  projectId: 'test-project',
}))

import type { ResearchProjectPayload } from 'types'

import { enquiryEmail, researchKicker, toResearchView } from './researchModel'

// A real Sanity asset _id is `image-<hash>-<width>x<height>-<format>` --
// @sanity/image-url's crop-rect math parses the WxH straight out of this
// string, so it has to genuinely match `metadata.dimensions` below for a
// crop test to produce a sane rect.
const ASSET_ID = 'image-testhash0123456789abcdef0123456789ab-1000x800-jpg'

function basePayload(overrides: Partial<ResearchProjectPayload> = {}): ResearchProjectPayload {
  return {
    _id: 'project-1',
    title: 'A project',
    slug: 'a-project',
    overview: [],
    description: [],
    coverImage: null,
    start: null,
    tags: [],
    category: null,
    ...overrides,
  }
}

describe('researchKicker', () => {
  it('joins "Since {year}" and category with " · " when both are set', () => {
    expect(
      researchKicker({ start: '2023-06-01T00:00:00.000Z', category: 'Non-pharmacological interventions' })
    ).toBe('Since 2023 · Non-pharmacological interventions')
  })

  it('is just "Since {year}" when there is no category', () => {
    expect(researchKicker({ start: '2018-01-01T00:00:00.000Z', category: null })).toBe('Since 2018')
  })

  it('is just the category when there is no start date', () => {
    expect(researchKicker({ start: null, category: 'Non-pharmacological interventions' })).toBe(
      'Non-pharmacological interventions'
    )
  })

  it('is empty when neither is set', () => {
    expect(researchKicker({ start: null, category: null })).toBe('')
  })

  it.each([[undefined], [null], [''], ['   ']])(
    'treats %j as no start date',
    (start) => {
      expect(researchKicker({ start, category: 'Category' })).toBe('Category')
    }
  )

  it.each([[undefined], [null], [''], ['   ']])(
    'treats %j as no category',
    (category) => {
      expect(researchKicker({ start: '2020-01-01T00:00:00.000Z', category })).toBe('Since 2020')
    }
  )

  it('takes only the leading 4-digit year from a full ISO datetime', () => {
    expect(researchKicker({ start: '2019-11-05T08:30:00.000Z', category: null })).toBe('Since 2019')
  })

  it('trims surrounding whitespace off a category before joining', () => {
    expect(researchKicker({ start: '2023-01-01T00:00:00.000Z', category: '  Glia  ' })).toBe(
      'Since 2023 · Glia'
    )
  })
})

describe('enquiryEmail', () => {
  it('prefers a trimmed settings.contact.email', () => {
    expect(
      enquiryEmail({
        contact: { email: '  contact@example.org  ' },
        labHead: { email: 'labhead@example.org' },
      })
    ).toBe('contact@example.org')
  })

  it('falls back to a trimmed settings.labHead.email when contact.email is unset', () => {
    expect(enquiryEmail({ contact: null, labHead: { email: '  labhead@example.org  ' } })).toBe(
      'labhead@example.org'
    )
  })

  it('falls back to labHead.email when contact.email is whitespace-only', () => {
    expect(enquiryEmail({ contact: { email: '   ' }, labHead: { email: 'labhead@example.org' } })).toBe(
      'labhead@example.org'
    )
  })

  it('returns null when neither is set', () => {
    expect(enquiryEmail({ contact: null, labHead: null })).toBeNull()
  })

  it('returns null when both are whitespace-only', () => {
    expect(enquiryEmail({ contact: { email: '  ' }, labHead: { email: '  ' } })).toBeNull()
  })

  it.each([
    [{}],
    [{ contact: undefined, labHead: undefined }],
    [{ contact: { email: undefined }, labHead: { email: undefined } }],
    [{ contact: { email: null }, labHead: { email: null } }],
  ])('returns null for %j', (settings) => {
    expect(enquiryEmail(settings)).toBeNull()
  })
})

describe('toResearchView', () => {
  it('carries id/title/label/kicker/tagLine/body through, with cover null when there is no coverImage', () => {
    const view = toResearchView(
      basePayload({
        title: 'Glial activity as a marker of disease',
        overview: [{ _type: 'block', _key: 'b1', children: [] }],
        start: '2018-01-01T00:00:00.000Z',
        category: null,
        tags: ['Astrocytes', 'Microglia'],
        coverImage: null,
      })
    )
    expect(view.id).toBe('project-1')
    expect(view.title).toBe('Glial activity as a marker of disease')
    expect(view.label).toBe('Astrocytes')
    expect(view.kicker).toBe('Since 2018')
    expect(view.tagLine).toBe('Astrocytes · Microglia')
    expect(view.body).toEqual([{ _type: 'block', _key: 'b1', children: [] }])
    expect(view.cover).toBeNull()
  })

  it('carries slug through from the payload', () => {
    expect(toResearchView(basePayload({ slug: 'alpha' })).slug).toBe('alpha')
  })

  it('slug is null when the payload has none', () => {
    expect(toResearchView(basePayload({ slug: null })).slug).toBeNull()
  })

  it('label falls back to "Project" and tagLine is "" when there are no tags', () => {
    const view = toResearchView(basePayload({ tags: [] }))
    expect(view.label).toBe('Project')
    expect(view.tagLine).toBe('')
  })

  it('cover is null when coverImage has no metadata.dimensions', () => {
    const view = toResearchView(
      basePayload({
        coverImage: {
          _type: 'image',
          asset: { _id: ASSET_ID, metadata: null },
        } as ResearchProjectPayload['coverImage'],
      })
    )
    expect(view.cover).toBeNull()
  })

  it('cover is null when the asset has neither _ref nor _id (no resolvable URL)', () => {
    const view = toResearchView(
      basePayload({
        coverImage: {
          _type: 'image',
          asset: { _id: '', metadata: { dimensions: { width: 1000, height: 800, aspectRatio: 1.25 } } },
        } as ResearchProjectPayload['coverImage'],
      })
    )
    expect(view.cover).toBeNull()
  })

  it('cover has the native metadata dimensions, unscaled, when there is no crop', () => {
    const view = toResearchView(
      basePayload({
        title: 'Uncropped project',
        coverImage: {
          _type: 'image',
          asset: { _id: ASSET_ID, metadata: { dimensions: { width: 1000, height: 800, aspectRatio: 1.25 } } },
        } as ResearchProjectPayload['coverImage'],
      })
    )
    expect(view.cover).not.toBeNull()
    expect(view.cover?.width).toBe(1000)
    expect(view.cover?.height).toBe(800)
    expect(view.cover?.alt).toBe('Uncropped project')
    expect(view.cover?.src).toBeTruthy()
    // No editorial crop on this fixture, so no width/height transform is
    // requested; Sanity delivers the asset at its native size. (Fix round 2
    // correction: this is not because @sanity/image-url ignores a crop
    // without explicit dimensions -- it doesn't, its `fit()` still returns
    // `rect: source.crop` and that becomes the URL's `rect=` param. There
    // simply is no `crop` on this fixture's `coverImage` to apply.)
    expect(view.cover?.src).not.toMatch(/[?&]w=/)
    expect(view.cover?.src).not.toMatch(/[?&]h=/)
  })

  it('cover dimensions are scaled by (1 - left - right) / (1 - top - bottom) when there is a crop, and the request carries matching w/h/fit=crop', () => {
    const view = toResearchView(
      basePayload({
        coverImage: {
          _type: 'image',
          asset: { _id: ASSET_ID, metadata: { dimensions: { width: 1000, height: 800, aspectRatio: 1.25 } } },
          crop: { _type: 'sanity.imageCrop', left: 0.1, right: 0.1, top: 0.05, bottom: 0.05 },
        } as ResearchProjectPayload['coverImage'],
      })
    )
    // width: 1000 * (1 - 0.1 - 0.1) = 800; height: 800 * (1 - 0.05 - 0.05) = 720.
    expect(view.cover?.width).toBe(800)
    expect(view.cover?.height).toBe(720)
    expect(view.cover?.src).toMatch(/[?&]w=800\b/)
    expect(view.cover?.src).toMatch(/[?&]h=720\b/)
    expect(view.cover?.src).toMatch(/[?&]fit=crop\b/)
  })
})

// `body` fallback (fix round 3): the two Wix-imported projects on
// `wix-preview` (researchOrder 3/4) carry their text in `description`, with
// no `overview` at all -- the original two projects (researchOrder 1/2)
// have both fields, with identical text. Without this fallback the imported
// projects render title-only.
describe('toResearchView body fallback (overview vs description)', () => {
  const overviewBlock = { _type: 'block' as const, _key: 'ov1', children: [] }
  const descriptionBlock = { _type: 'block' as const, _key: 'de1', children: [] }

  it('uses overview when it has at least one block, even if description is also set', () => {
    const view = toResearchView(
      basePayload({
        overview: [overviewBlock],
        description: [descriptionBlock],
      })
    )
    expect(view.body).toEqual([overviewBlock])
  })

  it('falls back to description when overview is an empty array', () => {
    const view = toResearchView(
      basePayload({
        overview: [],
        description: [descriptionBlock],
      })
    )
    expect(view.body).toEqual([descriptionBlock])
  })

  it('falls back to description when overview is missing (null/undefined)', () => {
    const view = toResearchView(
      basePayload({
        overview: null,
        description: [descriptionBlock],
      })
    )
    expect(view.body).toEqual([descriptionBlock])
  })

  it('is null when both overview and description are missing or empty', () => {
    expect(toResearchView(basePayload({ overview: [], description: [] })).body).toBeNull()
    expect(toResearchView(basePayload({ overview: null, description: null })).body).toBeNull()
    expect(
      toResearchView(basePayload({ overview: undefined, description: undefined })).body
    ).toBeNull()
  })

  it('is null when description is also an empty array and overview is missing', () => {
    const view = toResearchView(basePayload({ overview: null, description: [] }))
    expect(view.body).toBeNull()
  })
})
