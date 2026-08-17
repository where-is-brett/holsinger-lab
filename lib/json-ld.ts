import { urlForImage } from 'lib/sanity.image'
import type { Image } from 'sanity'
import type { ProfilePayload, PublicationPayload } from 'types'

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export interface OrganizationJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Organization'
  name: string
  url: string
  logo?: string
}

export function buildOrganizationJsonLd({
  name,
  url,
  logo,
}: {
  name: string
  url: string
  /**
   * Optional: schema.org treats Organization.logo as recommended, not
   * required. Phase 4D supplies a Sanity CDN URL when the lab has uploaded a
   * logo and omits it otherwise, rather than pointing structured data at a
   * placeholder.
   */
  logo?: string
}): OrganizationJsonLd {
  const organization: OrganizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
  }
  if (logo) {
    organization.logo = logo
  }
  return organization
}

/**
 * Resolves the JSON-LD Organization's logo to a Sanity CDN URL, or returns
 * undefined so the caller omits it entirely -- schema.org treats
 * Organization.logo as recommended, not required, and pointing structured
 * data at `public/logo.svg` (which reads "HOLSINGLER", a shipped typo) is
 * worse than omitting it. Capped at 600px: this is structured-data
 * metadata, not a rendered asset, so the full-resolution original is
 * unnecessary weight.
 */
export function resolveOrganizationLogoUrl(
  logo: Image | null | undefined
): string | undefined {
  if (!logo) return undefined
  return urlForImage(logo)?.width(600).url()
}

export interface PersonJsonLd {
  '@type': 'Person'
  name: string
  jobTitle?: string
  image?: string
}

export interface PersonListJsonLd {
  '@context': 'https://schema.org'
  '@type': 'ItemList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    item: PersonJsonLd
  }>
}

export function buildPersonListJsonLd(
  profiles: ProfilePayload[]
): PersonListJsonLd {
  const named = profiles.filter(
    (profile): profile is ProfilePayload & { name: string } =>
      typeof profile.name === 'string' && profile.name.trim().length > 0
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: named.map((profile, index) => {
      const item: PersonJsonLd = { '@type': 'Person', name: profile.name }

      if (profile.role) {
        item.jobTitle = profile.role
      }

      // See app/page.tsx for why this cast exists: the generated image
      // shape leaves crop/hotspot bounds optional, while `Image` from
      // 'sanity' assumes them fully populated.
      const imageUrl =
        profile.image &&
        urlForImage(profile.image as Image)
          ?.width(800)
          .height(800)
          .fit('crop')
          .url()
      if (imageUrl) {
        item.image = imageUrl
      }

      return { '@type': 'ListItem' as const, position: index + 1, item }
    }),
  }
}

export interface SinglePersonJsonLd extends PersonJsonLd {
  '@context': 'https://schema.org'
  url: string
}

/**
 * Person JSON-LD for a single person page. Returns null when there is no
 * name to describe -- schema.org requires it, and the caller (Task 7) only
 * reaches this from data already guarded by `!profile` in the route, so
 * this is defensive completeness rather than an expected path.
 */
export function buildPersonJsonLd({
  name,
  role,
  image,
  url,
}: {
  name?: string | null
  role?: string | null
  image?: Image | null
  url: string
}): SinglePersonJsonLd | null {
  if (!name || !name.trim()) {
    return null
  }

  const person: SinglePersonJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
  }

  if (role) {
    person.jobTitle = role
  }

  const imageUrl =
    image && urlForImage(image)?.width(800).height(800).fit('crop').url()
  if (imageUrl) {
    person.image = imageUrl
  }

  return person
}

interface ScholarlyArticleJsonLd {
  '@type': 'ScholarlyArticle'
  headline: string
  author?: { '@type': 'Person'; name: string }
  isPartOf?: { '@type': 'Periodical'; name: string }
  datePublished?: string
  url?: string
}

export interface ScholarlyArticleListJsonLd {
  '@context': 'https://schema.org'
  '@type': 'ItemList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    item: ScholarlyArticleJsonLd
  }>
}

export function buildScholarlyArticleListJsonLd(
  publications: PublicationPayload[]
): ScholarlyArticleListJsonLd {
  const titled = publications.filter(
    (publication): publication is PublicationPayload & { title: string } =>
      typeof publication.title === 'string' &&
      publication.title.trim().length > 0
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: titled.map((publication, index) => {
      const item: ScholarlyArticleJsonLd = {
        '@type': 'ScholarlyArticle',
        headline: publication.title,
      }

      if (publication.author) {
        item.author = { '@type': 'Person', name: publication.author }
      }
      if (publication.journal) {
        item.isPartOf = { '@type': 'Periodical', name: publication.journal }
      }
      if (publication.date) {
        item.datePublished = publication.date
      }
      if (publication.url) {
        item.url = publication.url
      }

      return { '@type': 'ListItem' as const, position: index + 1, item }
    }),
  }
}
