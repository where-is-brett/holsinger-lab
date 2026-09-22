import { Resources } from 'components/redesign/screens/Resources'
import Layout from 'components/shared/Layout'
import { resolveBranding } from 'lib/branding'
import { buildMetadata } from 'lib/metadata'
import { sanityFetch } from 'lib/sanity.live'
import { homePageTitleQuery, resourcesQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { ResourcePayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

const description =
  'Hardware, protocols, software and datasets made available by the Laboratory of Molecular Neuroscience and Dementia to other researchers.'

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, matching app/publications/page.tsx's own
// documented fallback.
const getData = cache(async () => {
  const [
    { data: settingsData },
    { data: homePageTitle },
    { data: resourcesData },
  ] = await Promise.all([
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: homePageTitleQuery, stega: false }),
    // `stega: false`, matching /publications: this data feeds the SOURCE/
    // DOI/URL meta hrefs and their verbatim labels -- none of which should
    // carry invisible Presentation-mode stega characters.
    sanityFetch({ query: resourcesQuery, stega: false }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const resources = (resourcesData as ResourcePayload[] | null) ?? []
  return {
    settings,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
    resources,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: '/resources',
    siteName,
    baseTitle: homePageTitle,
    title: 'Resources',
    description,
    // See app/page.tsx for why this cast exists: the generated image shape leaves crop/hotspot
    // bounds optional, while `Image` from 'sanity' assumes them fully populated.
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}

// Unlike /publications and /people, this route has no `show*` flag and is
// never a 404 (Task 1 brief) -- production has zero `resource` documents
// today (spec §2), and the page's own empty state is the honest rendering
// of that, not a 404.
export default async function ResourcesPage() {
  const { settings, resources } = await getData()

  return (
    <Layout settings={settings} childrenStyles="px-0">
      <Resources resources={resources} />
    </Layout>
  )
}
