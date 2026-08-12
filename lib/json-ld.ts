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

interface PersonJsonLd {
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
