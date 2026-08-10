import Publications from 'components/pages/publications/Publications'
import Layout from 'components/shared/Layout'
import { buildMetadata } from 'lib/metadata'
import {
  homePageTitleQuery,
  publicationsQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { PublicationPayload, SettingsPayload } from 'types'

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
    sanityFetch({ query: publicationsQuery, stega: false }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? {}
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
    image: settings.ogImage,
  })
}

export default async function PublicationsPage() {
  const { settings, publications } = await getData()

  if (!publications || settings.showPublications === false) {
    notFound()
  }

  return (
    <Layout settings={settings}>
      <Publications publications={publications} />
    </Layout>
  )
}
