import Layout from 'components/shared/Layout'
import { resolveBranding } from 'lib/branding'
import { buildMetadata } from 'lib/metadata'
import { getClient } from 'lib/sanity.client'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import notFoundSVG from 'public/404.svg'
import { cache } from 'react'
import type { SettingsPayload } from 'types'
import { fallbackSettings } from 'types'

const getData = cache(async () => {
  const client = getClient()
  const [settings, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<string | null>(homePageTitleQuery),
  ])
  return {
    settings: settings ?? fallbackSettings,
    homePageTitle: homePageTitle ?? undefined,
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const { settings, homePageTitle } = await getData()
  const { siteName } = resolveBranding(settings)
  return buildMetadata({
    path: '/404',
    siteName,
    baseTitle: homePageTitle,
    title: 'Page Not Found',
    description:
      'The page you are looking for cannot be found. It may have been moved, deleted, or the URL might be misspelled. Please check the URL or return to our homepage to explore more of our content and services.',
    noindex: true,
  })
}

export default async function NotFound() {
  const { settings } = await getData()

  return (
    <Layout settings={settings}>
      <div className="mx-auto mb-16 w-80 max-w-md space-y-6 md:w-[40vw]">
        <Image
          src={notFoundSVG}
          alt={'Page Not Found - Web illustrations by Storyset'}
          className=""
        />
        <p>
          {`We couldn't find the page you were looking for. Perhaps the`}
          <Link
            href={'/'}
            className="text-text underline hover:text-text-muted"
          >
            home page
          </Link>
          ?
        </p>
      </div>
    </Layout>
  )
}
