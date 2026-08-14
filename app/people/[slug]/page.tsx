import { toPlainText } from '@portabletext/react'
import { PersonBio } from 'components/pages/people/PersonBio'
import { JsonLd } from 'components/shared/JsonLd'
import Layout from 'components/shared/Layout'
import { resolveBranding } from 'lib/branding'
import { buildPersonJsonLd } from 'lib/json-ld'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { sanityFetch } from 'lib/sanity.live'
import {
  homePageTitleQuery,
  profileBySlugQuery,
  profilePaths,
  settingsQuery,
} from 'lib/sanity.queries'
import { siteUrl } from 'lib/site'
import { truncateAtWordBoundary } from 'lib/text'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { ProfilePathsResult } from 'sanity.types'
import type { ProfileBySlugPayload, SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async (slug: string) => {
  const [{ data: settingsData }, { data: profileData }, { data: homePageTitle }] =
    await Promise.all([
      sanityFetch({ query: settingsQuery, stega: false }),
      sanityFetch({
        query: profileBySlugQuery,
        params: { slug },
        stega: false,
      }),
      sanityFetch({ query: homePageTitleQuery, stega: false }),
    ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  const profile = profileData as ProfileBySlugPayload | null
  return {
    settings,
    profile,
    homePageTitle: (homePageTitle as string | null) ?? undefined,
  }
})

export async function generateStaticParams() {
  const client = getClient()
  const slugs = await client.fetch<ProfilePathsResult>(profilePaths)
  return slugs
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({ slug }))
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { settings, profile, homePageTitle } = await getData(slug)
  if (!profile || settings.showPeople === false) {
    return {}
  }
  const { siteName } = resolveBranding(settings)
  const plainBio = profile.fullBio ? toPlainText(profile.fullBio) : ''
  return buildMetadata({
    path: `/people/${slug}`,
    siteName,
    baseTitle: homePageTitle,
    title: profile.name ?? undefined,
    description: plainBio
      ? truncateAtWordBoundary(plainBio, 155)
      : (profile.role ?? undefined),
    // See app/page.tsx for why this cast exists: the generated image shape leaves crop/hotspot
    // bounds optional, while `Image` from 'sanity' assumes them fully populated.
    image: (profile.image ?? undefined) as Image | undefined,
  })
}

export default async function PersonSlugPage({ params }: Props) {
  const { slug } = await params
  const { settings, profile } = await getData(slug)

  if (!profile || settings.showPeople === false) {
    notFound()
  }

  const personJsonLd = buildPersonJsonLd({
    name: profile.name,
    role: profile.role,
    image: (profile.image ?? undefined) as Image | undefined,
    url: `${siteUrl}/people/${slug}`,
  })

  return (
    <Layout settings={settings}>
      {personJsonLd && <JsonLd data={personJsonLd} />}
      <PersonBio person={profile} layout="page" />
    </Layout>
  )
}
