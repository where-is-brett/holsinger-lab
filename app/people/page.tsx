import People from 'components/pages/people/People'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  profileQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { ProfilePayload, SettingsPayload } from 'types'

export const revalidate = 60

const description =
  'Explore profiles of Peoples in the Laboratory of Molecular Neuroscience and Dementia. Learn about their roles, research interests, and more.'

const getData = cache(async () => {
  const client = getClient()
  const [homePageTitle, settings, profiles] = await Promise.all([
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<ProfilePayload[]>(profileQuery),
  ])
  return {
    homePageTitle: homePageTitle ?? undefined,
    settings: settings ?? {},
    profiles: profiles ?? [],
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
