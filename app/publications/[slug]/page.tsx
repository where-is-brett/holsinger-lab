import { toPublication } from 'components/redesign/publicationModel'
import { PublicationPage } from 'components/redesign/screens/PublicationPage'
import { JsonLd } from 'components/shared/JsonLd'
import Layout from 'components/shared/Layout'
import { resolveBranding } from 'lib/branding'
import { buildScholarlyArticleJsonLd } from 'lib/json-ld'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { sanityFetch } from 'lib/sanity.live'
import {
  homePageTitleQuery,
  publicationBySlugQuery,
  publicationPaths,
  settingsQuery,
} from 'lib/sanity.queries'
import { truncateAtWordBoundary } from 'lib/text'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { PublicationPathsResult } from 'sanity.types'
import type { PublicationPayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async (slug: string) => {
  const [{ data: settingsData }, { data: homePageTitle }, { data: publicationData }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
      sanityFetch({
        query: publicationBySlugQuery,
        params: { slug },
        stega: false,
      }),
    ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const publication = publicationData as PublicationPayload | null
  return {
    settings,
    publication,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<PublicationPathsResult>(publicationPaths)
  return slugs.filter((slug): slug is string => Boolean(slug)).map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { settings, publication, homePageTitle } = await getData(slug)
  if (!publication || settings.showPublications === false) {
    return {}
  }
  const { siteName } = resolveBranding(settings)
  const pub = toPublication(publication)
  return buildMetadata({
    path: `/publications/${slug}`,
    siteName,
    baseTitle: homePageTitle,
    title: pub.title,
    description: truncateAtWordBoundary(pub.abstract[0] ?? '', 160) || undefined,
    // See app/page.tsx for why this cast exists: the generated image shape leaves crop/hotspot
    // bounds optional, while `Image` from 'sanity' assumes them fully populated.
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}

export default async function PublicationSlugPage({ params }: Props) {
  const { slug } = await params
  const { settings, publication } = await getData(slug)

  if (!publication || settings.showPublications === false) {
    notFound()
  }

  return (
    <Layout settings={settings} childrenStyles="px-0">
      <JsonLd data={buildScholarlyArticleJsonLd(publication)} />
      <PublicationPage pub={toPublication(publication)} />
    </Layout>
  )
}
