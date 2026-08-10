import { ProjectPage as ProjectPageComponent } from 'components/pages/project/ProjectPage'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  projectBySlugQuery,
  projectPaths,
  settingsQuery,
} from 'lib/sanity.queries'
import { sanityFetch } from 'lib/sanity.live'
import { toPlainText } from '@portabletext/react'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import type { ProjectPayload, SettingsPayload } from 'types'

export const revalidate = 60

const legacyProjectSlugs: Record<string, string> = {
  MAESTRO: 'maestro',
  'Publication highlights': 'publication-highlights',
}

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async (slug: string) => {
  const [{ data: settingsData }, { data: projectData }, { data: homePageTitle }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({
        query: projectBySlugQuery,
        params: { slug },
        stega: false,
      }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
    ])
  const settings = (settingsData as SettingsPayload | null) ?? {}
  const project = projectData as ProjectPayload | null
  return {
    settings,
    project,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<string[]>(projectPaths)
  return slugs.map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (Object.prototype.hasOwnProperty.call(legacyProjectSlugs, slug)) {
    return {}
  }
  const { project, homePageTitle } = await getData(slug)
  if (!project) {
    return {}
  }
  return buildMetadata({
    path: `/projects/${slug}`,
    baseTitle: homePageTitle,
    title: project.title,
    description: project.overview ? toPlainText(project.overview) : '',
    image: project.coverImage,
  })
}

export default async function ProjectSlugPage({ params }: Props) {
  const { slug } = await params

  if (Object.prototype.hasOwnProperty.call(legacyProjectSlugs, slug)) {
    permanentRedirect(`/projects/${legacyProjectSlugs[slug]}`)
  }

  const { settings, project } = await getData(slug)

  if (!project) {
    notFound()
  }

  return <ProjectPageComponent project={project} settings={settings} />
}
