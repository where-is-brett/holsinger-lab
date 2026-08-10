import Contact from 'components/pages/contact/Contact'
import { buildMetadata } from 'lib/metadata'
import { sanityFetch } from 'lib/sanity.live'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { Image } from 'sanity'
import type { SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

export const revalidate = 60

const description =
  'Get in touch with us using the contact form below. We would love to hear from you!'

// `lib/sanity.queries.ts` defines queries with the `groq` template tag, which
// (per its own .d.ts) cannot preserve literal string types — so `sanityFetch`'s
// `SanityQueries` lookup can't match and `data` resolves to `unknown`. Falling
// back to explicit casts here, per this task's documented fallback.
const getData = cache(async () => {
  const [{ data: homePageTitle }, { data: settingsData }] = await Promise.all([
    sanityFetch({ query: homePageTitleQuery, stega: false }),
    sanityFetch({ query: settingsQuery, stega: false }),
  ])
  const settings = (settingsData as SettingsPayload | null) ?? fallbackSettings
  return {
    homePageTitle: (homePageTitle as string | null) ?? undefined,
    settings,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/contact',
    baseTitle: homePageTitle,
    title: 'Contact',
    description,
    // See app/page.tsx for why this cast exists: the generated image shape leaves crop/hotspot
    // bounds optional, while `Image` from 'sanity' assumes them fully populated.
    image: (settings.ogImage ?? undefined) as Image | undefined,
  })
}

export default async function ContactPage() {
  const { settings } = await getData()

  if (settings.showContactForm === false) {
    notFound()
  }

  return <Contact settings={settings} />
}
