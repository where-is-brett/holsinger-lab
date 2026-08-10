import { toPlainText } from '@portabletext/react'
import { ProjectPage as ProjectPageComponent } from 'components/pages/project/ProjectPage'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  projectBySlugQuery,
  projectPaths,
  settingsQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import type { ProjectPayload, SettingsPayload } from 'types'

export const revalidate = 60

const legacyProjectSlugs: Record<string, string> = {
  MAESTRO: 'maestro',
  'Publication highlights': 'publication-highlights',
}

const getData = cache(async (slug: string) => {
  const client = getClient()
  const [settings, project, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<ProjectPayload | null>(projectBySlugQuery, { slug }),
    client.fetch<string | null>(homePageTitleQuery),
  ])
  return {
    settings: settings ?? {},
    project,
    homePageTitle: homePageTitle ?? undefined,
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
