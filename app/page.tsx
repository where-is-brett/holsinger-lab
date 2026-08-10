import { toPlainText } from '@portabletext/react'
import { HomePage } from 'components/pages/home/HomePage'
import { buildMetadata } from 'lib/metadata'
import { sanityFetch } from 'lib/sanity.live'
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

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async () => {
  const [{ data: settingsData }, { data: pageData }] = await Promise.all([
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: homePageQuery }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? {}
  const page = (pageData as HomePagePayload | null) ?? fallbackPage
  return { settings, page }
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
