import People from 'components/pages/people/People'
import { buildMetadata } from 'lib/metadata'
import {
  homePageTitleQuery,
  profileQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { ProfilePayload, SettingsPayload } from 'types'

export const revalidate = 60

const description =
  'Explore profiles of Peoples in the Laboratory of Molecular Neuroscience and Dementia. Learn about their roles, research interests, and more.'

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async () => {
  const [
    { data: homePageTitle },
    { data: settingsData },
    { data: profilesData },
  ] = await Promise.all([
    sanityFetch({ query: homePageTitleQuery, stega: false }),
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: profileQuery }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? {}
  const profiles = (profilesData as ProfilePayload[] | null) ?? []
  return {
    homePageTitle: (homePageTitle as string | null) ?? undefined,
    settings,
    profiles,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/people',
    baseTitle: homePageTitle,
    title: 'People',
    description,
    image: settings.ogImage,
  })
}

export default async function PeoplePage() {
  const { settings, profiles } = await getData()

  if (settings.showPeople === false) {
    notFound()
  }

  return <People settings={settings} profiles={profiles} />
}
