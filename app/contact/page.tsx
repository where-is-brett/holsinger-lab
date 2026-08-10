import Contact from 'components/pages/contact/Contact'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import type { SettingsPayload } from 'types'

export const revalidate = 60

const description =
  'Get in touch with us using the contact form below. We would love to hear from you!'

const getData = cache(async () => {
  const client = getClient()
  const [homePageTitle, settings] = await Promise.all([
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<SettingsPayload | null>(settingsQuery),
  ])
  return { homePageTitle: homePageTitle ?? undefined, settings: settings ?? {} }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  return buildMetadata({
    path: '/contact',
    baseTitle: homePageTitle,
    title: 'Contact',
    description,
    image: settings.ogImage,
  })
}

export default async function ContactPage() {
  const { settings } = await getData()

  if (settings.showContactForm === false) {
    notFound()
  }

  return <Contact settings={settings} />
}
