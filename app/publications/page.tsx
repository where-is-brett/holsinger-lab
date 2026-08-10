import Publications from 'components/pages/publications/Publications'
import { JsonLd } from 'components/shared/JsonLd'
import Layout from 'components/shared/Layout'
import { buildScholarlyArticleListJsonLd } from 'lib/json-ld'
import { buildMetadata } from 'lib/metadata'
import { sanityFetch } from 'lib/sanity.live'
import {
  homePageTitleQuery,
  publicationsQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { PublicationPayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

const description =
  'Explore the publications by the Laboratory of Molecular Neuroscience and Dementia. Discover the latest advancements and insights in neuroscience, molecular biology, and dementia research, authored by our esteemed team of scientists and researchers.'

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async () => {
  const [
    { data: settingsData },
    { data: homePageTitle },
    { data: publicationsData },
  ] = await Promise.all([
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: homePageTitleQuery, stega: false }),
    sanityFetch({ query: publicationsQuery }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const publications = publicationsData as PublicationPayload[] | null
  return {
    settings,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
    publications,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/publications',
    baseTitle: homePageTitle,
    title: 'Publications',
    description,
    // See app/page.tsx for why this cast exists: the generated image shape leaves crop/hotspot
    // bounds optional, while `Image` from 'sanity' assumes them fully populated.
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}

export default async function PublicationsPage() {
  const { settings, publications } = await getData()

  if (!publications || settings.showPublications === false) {
    notFound()
  }

  return (
    <Layout settings={settings}>
      <JsonLd data={buildScholarlyArticleListJsonLd(publications)} />
      <Publications publications={publications} />
    </Layout>
  )
}
