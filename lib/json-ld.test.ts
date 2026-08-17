import { describe, expect, it, vi } from 'vitest'

// lib/sanity.image transitively imports lib/sanity.api, whose module-scope
// assertValue() throws if NEXT_PUBLIC_SANITY_* env vars are unset — same
// workaround lib/metadata.test.ts already uses (vi.mock, then a static
// import — Vitest hoists vi.mock calls above imports automatically, so
// this order is safe and matches established precedent in this codebase).
// buildPersonListJsonLd only calls urlForImage when profile.image is
// truthy, so a single fixed fake chain covers every test case that needs it.
vi.mock('lib/sanity.image', () => ({
  urlForImage: () => {
    const chain = {
      width: () => chain,
      height: () => chain,
      fit: () => chain,
      url: () => 'https://cdn.sanity.io/mock-image.jpg',
    }
    return chain
  },
}))

import type { Image } from 'sanity'
import type { ProfilePayload, PublicationPayload } from 'types'

import {
  buildOrganizationJsonLd,
  buildPersonJsonLd,
  buildPersonListJsonLd,
  buildScholarlyArticleListJsonLd,
  resolveOrganizationLogoUrl,
  serializeJsonLd,
} from './json-ld'
import { siteUrl } from './site'

describe('serializeJsonLd', () => {
  it('escapes "<" so an authored "</script>" cannot close the script tag early', () => {
    const serialized = serializeJsonLd({
      name: '</script><script>alert(1)</script>',
    })
    expect(serialized).not.toContain('</script>')
    expect(JSON.parse(serialized.replace(/\\u003c/g, '<'))).toEqual({
      name: '</script><script>alert(1)</script>',
    })
  })

  it('produces valid, parseable JSON for normal input', () => {
    expect(JSON.parse(serializeJsonLd({ a: 1, b: 'two' }))).toEqual({
      a: 1,
      b: 'two',
    })
  })
})

describe('buildOrganizationJsonLd', () => {
  it('returns a valid schema.org Organization from the supplied values', () => {
    const org = buildOrganizationJsonLd({
      name: 'Holsinger Lab',
      url: siteUrl,
      logo: 'https://cdn.sanity.io/images/proj/ds/logo-abc123-600x200.png',
    })
    expect(org['@context']).toBe('https://schema.org')
    expect(org['@type']).toBe('Organization')
    expect(org.name).toBe('Holsinger Lab')
    expect(org.url).toBe(siteUrl)
    expect(org.logo).toBe(
      'https://cdn.sanity.io/images/proj/ds/logo-abc123-600x200.png'
    )
  })

  it('uses the supplied name rather than any built-in constant', () => {
    const org = buildOrganizationJsonLd({
      name: 'A Different Lab',
      url: siteUrl,
    })
    expect(org.name).toBe('A Different Lab')
  })

  it('omits logo entirely when none is supplied', () => {
    const org = buildOrganizationJsonLd({ name: 'Holsinger Lab', url: siteUrl })
    expect('logo' in org).toBe(false)
  })

  it('serializes to valid JSON with no undefined fields', () => {
    const org = buildOrganizationJsonLd({
      name: 'Holsinger Lab',
      url: siteUrl,
      logo: 'https://cdn.sanity.io/images/proj/ds/logo-abc123-600x200.png',
    })
    expect(JSON.parse(JSON.stringify(org))).toEqual(org)
  })
})

describe('resolveOrganizationLogoUrl', () => {
  it('returns undefined when no logo is uploaded', () => {
    expect(resolveOrganizationLogoUrl(null)).toBeUndefined()
    expect(resolveOrganizationLogoUrl(undefined)).toBeUndefined()
  })

  it('resolves a Sanity CDN URL when a logo is uploaded', () => {
    const logo = { asset: { _ref: 'image-abc123-600x200-png' } } as Image
    expect(resolveOrganizationLogoUrl(logo)).toBe(
      'https://cdn.sanity.io/mock-image.jpg'
    )
  })
})

function makeProfile(overrides: Partial<ProfilePayload> = {}): ProfilePayload {
  return {
    _id: 'profile-1',
    image: null,
    orderRank: null,
    name: 'Ada Lovelace',
    role: 'Postdoctoral Fellow',
    roleGroup: null,
    email: null,
    phone: null,
    bio: null,
    slug: null,
    hasPage: null,
    fullBio: null,
    ...overrides,
  }
}

describe('buildPersonListJsonLd', () => {
  it('builds one ListItem per named profile, 1-indexed', () => {
    const result = buildPersonListJsonLd([
      makeProfile({ _id: 'a', name: 'Ada Lovelace' }),
      makeProfile({ _id: 'b', name: 'Grace Hopper' }),
    ])
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('ItemList')
    expect(result.itemListElement).toHaveLength(2)
    expect(result.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Person',
        name: 'Ada Lovelace',
        jobTitle: 'Postdoctoral Fellow',
      },
    })
    expect(result.itemListElement[1].position).toBe(2)
  })

  it('omits profiles with no name, and does not leave a gap in position numbering', () => {
    const result = buildPersonListJsonLd([
      makeProfile({ _id: 'a', name: null }),
      makeProfile({ _id: 'b', name: 'Grace Hopper' }),
    ])
    expect(result.itemListElement).toHaveLength(1)
    expect(result.itemListElement[0].position).toBe(1)
    expect(result.itemListElement[0].item.name).toBe('Grace Hopper')
  })

  it('omits jobTitle when role is null', () => {
    const result = buildPersonListJsonLd([makeProfile({ role: null })])
    expect(result.itemListElement[0].item).not.toHaveProperty('jobTitle')
  })

  it('includes an image URL when the profile has an image', () => {
    const result = buildPersonListJsonLd([
      makeProfile({
        image: {
          _type: 'image',
          asset: { _ref: 'image-abc', _type: 'reference' },
        },
      }),
    ])
    expect(result.itemListElement[0].item.image).toBe(
      'https://cdn.sanity.io/mock-image.jpg'
    )
  })

  it('omits image when the profile has no image', () => {
    const result = buildPersonListJsonLd([makeProfile({ image: null })])
    expect(result.itemListElement[0].item).not.toHaveProperty('image')
  })

  it('returns an empty list for no profiles', () => {
    expect(buildPersonListJsonLd([]).itemListElement).toEqual([])
  })
})

describe('buildPersonJsonLd', () => {
  const url = `${siteUrl}/people/ada-lovelace`

  it('builds Person JSON-LD from a name alone', () => {
    const result = buildPersonJsonLd({ name: 'Ada Lovelace', url })
    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Ada Lovelace',
      url,
    })
  })

  it('includes jobTitle when role is given', () => {
    const result = buildPersonJsonLd({
      name: 'Ada Lovelace',
      role: 'Postdoctoral Fellow',
      url,
    })
    expect(result?.jobTitle).toBe('Postdoctoral Fellow')
  })

  it('includes an image URL when an image is given', () => {
    const result = buildPersonJsonLd({
      name: 'Ada Lovelace',
      role: 'Postdoctoral Fellow',
      image: {
        _type: 'image',
        asset: { _ref: 'image-abc', _type: 'reference' },
      },
      url,
    })
    expect(result?.image).toBe('https://cdn.sanity.io/mock-image.jpg')
  })

  it('returns null when there is no name to describe', () => {
    expect(buildPersonJsonLd({ name: null, url })).toBeNull()
    expect(buildPersonJsonLd({ name: '  ', url })).toBeNull()
  })
})

function makePublication(
  overrides: Partial<PublicationPayload> = {}
): PublicationPayload {
  return {
    _id: 'pub-1',
    title: 'A Study of Molecular Neuroscience',
    author: 'Holsinger K, Smith J',
    journal: 'Journal of Neuroscience',
    volume: null,
    issue: null,
    pages: null,
    abstract: null,
    url: 'https://doi.org/10.1000/example',
    doi: null,
    date: '2024-05-01',
    ...overrides,
  }
}

describe('buildScholarlyArticleListJsonLd', () => {
  it('builds one ListItem per titled publication, 1-indexed', () => {
    const result = buildScholarlyArticleListJsonLd([makePublication()])
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('ItemList')
    expect(result.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'ScholarlyArticle',
        headline: 'A Study of Molecular Neuroscience',
        author: { '@type': 'Person', name: 'Holsinger K, Smith J' },
        isPartOf: { '@type': 'Periodical', name: 'Journal of Neuroscience' },
        datePublished: '2024-05-01',
        url: 'https://doi.org/10.1000/example',
      },
    })
  })

  it('omits publications with no title, and does not leave a gap in position numbering', () => {
    const result = buildScholarlyArticleListJsonLd([
      makePublication({ title: null }),
      makePublication({ _id: 'pub-2', title: 'Real Title' }),
    ])
    expect(result.itemListElement).toHaveLength(1)
    expect(result.itemListElement[0].position).toBe(1)
    expect(result.itemListElement[0].item.headline).toBe('Real Title')
  })

  it('omits optional fields that are null', () => {
    const result = buildScholarlyArticleListJsonLd([
      makePublication({ author: null, journal: null, date: null, url: null }),
    ])
    const item = result.itemListElement[0].item
    expect(item).not.toHaveProperty('author')
    expect(item).not.toHaveProperty('isPartOf')
    expect(item).not.toHaveProperty('datePublished')
    expect(item).not.toHaveProperty('url')
    expect(item.headline).toBe('A Study of Molecular Neuroscience')
  })

  it('returns an empty list for no publications', () => {
    expect(buildScholarlyArticleListJsonLd([]).itemListElement).toEqual([])
  })
})
