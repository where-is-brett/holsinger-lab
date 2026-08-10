import { toPlainText } from '@portabletext/react'
import { Page as PageComponent } from 'components/pages/page/Page'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  pagePaths,
  pagesBySlugQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import type { PagePayload, SettingsPayload } from 'types'

export const revalidate = 60

const legacyPageSlugs: Record<string, string> = {
  Miscellaneous: 'miscellaneous',
}

const getData = cache(async (slug: string) => {
  const client = getClient()
  const [settings, page, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<PagePayload | null>(pagesBySlugQuery, { slug }),
    client.fetch<string | null>(homePageTitleQuery),
  ])
  return {
    settings: settings ?? {},
    page,
    homePageTitle: homePageTitle ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<string[]>(pagePaths)
  return slugs.map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (Object.prototype.hasOwnProperty.call(legacyPageSlugs, slug)) {
    return {}
  }
  const { settings, page, homePageTitle } = await getData(slug)
  if (!page) {
    return {}
  }
  return buildMetadata({
    path: `/${slug}`,
    baseTitle: homePageTitle,
    title: page.title,
    description: page.overview ? toPlainText(page.overview) : '',
    image: settings.ogImage,
  })
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params

  if (Object.prototype.hasOwnProperty.call(legacyPageSlugs, slug)) {
    permanentRedirect(`/${legacyPageSlugs[slug]}`)
  }

  const { settings, page } = await getData(slug)

  if (!page) {
    notFound()
  }

  return <PageComponent page={page} settings={settings} />
}
