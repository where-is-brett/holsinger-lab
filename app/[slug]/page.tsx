import { toPlainText } from '@portabletext/react'
import { Page as PageComponent } from 'components/pages/page/Page'
import { resolveBranding } from 'lib/branding'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { sanityFetch } from 'lib/sanity.live'
import {
  homePageTitleQuery,
  pagePaths,
  pagesBySlugQuery,
  settingsQuery,
} from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { PagePathsResult } from 'sanity.types'
import type { PagePayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

const legacyPageSlugs: Record<string, string> = {
  Miscellaneous: 'miscellaneous',
}

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async (slug: string) => {
  const [{ data: settingsData }, { data: pageData }, { data: homePageTitle }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({ query: pagesBySlugQuery, params: { slug } }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
    ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const page = pageData as PagePayload | null
  return {
    settings,
    page,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<PagePathsResult>(pagePaths)
  return slugs
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({ slug }))
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
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: `/${slug}`,
    siteName,
    baseTitle: homePageTitle,
    title: page.title ?? undefined,
    description: page.overview ? toPlainText(page.overview) : '',
    // See app/page.tsx for why this cast exists: the generated image shape leaves crop/hotspot
    // bounds optional, while `Image` from 'sanity' assumes them fully populated.
    image: (settings.ogImage ?? undefined) as Image | undefined,
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
