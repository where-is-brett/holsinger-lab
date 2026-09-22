import { enquiryEmail, toResearchView } from 'components/redesign/researchModel'
import { Research } from 'components/redesign/screens/Research'
import Layout from 'components/shared/Layout'
import { resolveBranding } from 'lib/branding'
import { buildMetadata } from 'lib/metadata'
import { sanityFetch } from 'lib/sanity.live'
import { homePageTitleQuery, researchProjectsQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { ResearchProjectPayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

const description =
  'Active research projects from the Laboratory of Molecular Neuroscience and Dementia.'

// Same fallback-cast reasoning as app/resources/page.tsx: `sanityFetch`'s
// `SanityQueries` lookup can't match a `groq`-tagged template's literal
// string type, so `data` resolves to `unknown` -- cast explicitly, per
// app/publications/page.tsx's own documented precedent.
const getData = cache(async () => {
  const [
    { data: settingsData },
    { data: homePageTitle },
    { data: projectsData },
  ] = await Promise.all([
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: homePageTitleQuery, stega: false }),
    // `stega: false`, matching /resources: this data feeds cover `alt` text
    // and the mailto identifier, neither of which should carry invisible
    // Presentation-mode stega characters.
    sanityFetch({ query: researchProjectsQuery, stega: false }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const projects = (projectsData as ResearchProjectPayload[] | null) ?? []
  return {
    settings,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
    projects,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: '/research',
    siteName,
    baseTitle: homePageTitle,
    title: 'Research',
    description,
    // See app/page.tsx for why this cast exists: the generated image shape
    // leaves crop/hotspot bounds optional, while `Image` from 'sanity'
    // assumes them fully populated.
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}

// Like /resources, this route has no `show*` flag and is never a 404 (task
// brief) -- production has zero `defined(researchOrder)` projects today
// (spec §2), and the page's own empty state is the honest rendering of
// that, not a 404.
export default async function ResearchPage() {
  const { settings, projects } = await getData()
  const email = enquiryEmail(settings)

  return (
    <Layout settings={settings} childrenStyles="px-0">
      <Research
        projects={projects.map(toResearchView)}
        email={email}
        showContactForm={settings.showContactForm}
      />
    </Layout>
  )
}
