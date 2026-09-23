import { toPlainText } from '@portabletext/react'
import { toPublication } from 'components/redesign/publicationModel'
import { toResearchView } from 'components/redesign/researchModel'
import { Home } from 'components/redesign/screens/Home'
import Layout from 'components/shared/Layout'
import { resolveBranding } from 'lib/branding'
import { buildMetadata } from 'lib/metadata'
import { sanityFetch } from 'lib/sanity.live'
import {
  homePageQuery,
  homeRecentPublicationsQuery,
  homeResourceQuery,
  homeSiteCopyQuery,
  maestroProjectQuery,
  profileQuery,
  publicationCountQuery,
  researchProjectsQuery,
  roleGroupQuery,
  settingsQuery,
  supportPageQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { cache } from 'react'
import type { Image } from 'sanity'
import type {
  HomePagePayload,
  HomeResourcePayload,
  MaestroProjectPayload,
  ProfilePayload,
  PublicationPayload,
  ResearchProjectPayload,
  RoleGroupPayload,
  SettingsPayload,
  SiteCopyPayload,
  SupportPagePayload,
} from 'types'
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
//
// Everything the rebuilt Home screen needs, fetched in one
// `Promise.all` -- the settings/home-page pair `generateMetadata` already
// depended on, plus the six new Home-only queries (recent publications,
// the live publication count, the first resource, the `maestro` project,
// the `support-our-research` page, and the shared `siteCopy` singleton
// behind the hero statement) and the People data Home's own member count
// and lab-head card need (`currentMemberCount`,
// `shouldShowLabHeadCard`/`resolveLabHeadHref`, both from homeModel.ts).
const getData = cache(async () => {
  const [
    { data: settingsData },
    { data: pageData },
    { data: siteCopyData },
    { data: publicationsData },
    { data: publicationCountData },
    { data: resourceData },
    { data: maestroData },
    { data: researchProjectsData },
    { data: supportPageData },
    { data: profilesData },
    { data: roleGroupsData },
  ] = await Promise.all([
    sanityFetch({ query: settingsQuery, stega: false }),
    sanityFetch({ query: homePageQuery }),
    sanityFetch({ query: homeSiteCopyQuery, stega: false }),
    // `stega: false`, matching /publications and /resources: this data
    // feeds row titles, journal refs and identifier hrefs, none of which
    // should carry invisible Presentation-mode stega characters.
    sanityFetch({ query: homeRecentPublicationsQuery, stega: false }),
    sanityFetch({ query: publicationCountQuery, stega: false }),
    sanityFetch({ query: homeResourceQuery, stega: false }),
    sanityFetch({ query: maestroProjectQuery, stega: false }),
    sanityFetch({ query: researchProjectsQuery, stega: false }),
    sanityFetch({ query: supportPageQuery, stega: false }),
    sanityFetch({ query: profileQuery, stega: false }),
    sanityFetch({ query: roleGroupQuery, stega: false }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const page = (pageData as HomePagePayload | null) ?? fallbackPage
  const siteCopy = (siteCopyData as SiteCopyPayload | null) ?? null
  const publications = (publicationsData as PublicationPayload[] | null) ?? []
  const publicationCount = (publicationCountData as number | null) ?? 0
  const resource = (resourceData as HomeResourcePayload | null) ?? null
  const maestro = (maestroData as MaestroProjectPayload | null) ?? null
  const researchProjects = (researchProjectsData as ResearchProjectPayload[] | null) ?? []
  const supportPage = (supportPageData as SupportPagePayload | null) ?? null
  const profiles = (profilesData as ProfilePayload[] | null) ?? []
  const roleGroups = (roleGroupsData as RoleGroupPayload[] | null) ?? []
  return {
    settings,
    page,
    siteCopy,
    publications,
    publicationCount,
    resource,
    maestro,
    researchProjects,
    supportPage,
    profiles,
    roleGroups,
  }
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
  const {
    settings,
    page,
    siteCopy,
    publications,
    publicationCount,
    resource,
    maestro,
    researchProjects,
    supportPage,
    profiles,
    roleGroups,
  } = await getData()
  const { siteName } = resolveBranding(settings)

  return (
    <Layout settings={settings} childrenStyles="px-0">
      <Home
        home={page}
        settings={settings}
        siteName={siteName}
        siteCopy={siteCopy}
        publications={publications.map(toPublication)}
        publicationCount={publicationCount}
        resource={resource}
        maestro={maestro}
        researchProjects={researchProjects.map(toResearchView)}
        profiles={profiles}
        roleGroups={roleGroups}
        supportPage={supportPage}
      />
    </Layout>
  )
}
