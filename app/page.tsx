import { toPlainText } from '@portabletext/react'
import { HomePage } from 'components/pages/home/HomePage'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { homePageQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { cache } from 'react'
import type { HomePagePayload, SettingsPayload } from 'types'

export const revalidate = 60

const fallbackPage: HomePagePayload = {
  title: '',
  overview: [],
  showcaseProjects: [],
}

const getData = cache(async () => {
  const client = getClient()
  const [settings, page] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<HomePagePayload | null>(homePageQuery),
  ])
  return { settings: settings ?? {}, page: page ?? fallbackPage }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, page } = await getData()
  return buildMetadata({
    path: '/',
    title: page.title,
    description: page.overview ? toPlainText(page.overview) : '',
    image: settings.ogImage,
  })
}

export default async function Page() {
  const { settings, page } = await getData()
  return <HomePage page={page} settings={settings} />
}
