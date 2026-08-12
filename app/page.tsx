import { toPlainText } from '@portabletext/react'
import { HomePage } from 'components/pages/home/HomePage'
import { resolveBranding } from 'lib/branding'
import { buildMetadata } from 'lib/metadata'
import { sanityFetch } from 'lib/sanity.live'
import { homePageQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { HomePagePayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

const fallbackPage: HomePagePayload = {
  _id: 'fallback-home',
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
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const page = (pageData as HomePagePayload | null) ?? fallbackPage
  return { settings, page }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, page } = await getData()
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: '/',
    siteName,
    title: page.title ?? undefined,
    description: page.overview ? toPlainText(page.overview) : '',
    // The generated `ogImage` shape leaves crop/hotspot bounds optional (honest to what GROQ
    // can statically guarantee); `Image` from 'sanity' assumes a fully-populated crop. Both the
    // old hand-written type and this cast trust that published images have complete data —
    // this preserves that same trust at the call site instead of baking it into the type.
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}

export default async function Page() {
  const { settings, page } = await getData()
  return <HomePage page={page} settings={settings} />
}
