import Contact from 'components/pages/contact/Contact'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { SettingsPayload } from 'types'

interface PageProps {
  homePageTitle: string | undefined
  settings: SettingsPayload
}

export default function ContactPage({ homePageTitle, settings }: PageProps) {
  return <Contact homePageTitle={homePageTitle} settings={settings} />
}

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const { draftMode = false } = ctx
  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [homePageTitle, settings] = await Promise.all([
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<SettingsPayload | null>(settingsQuery),
  ])

  if (!settings?.showContactForm) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      homePageTitle: homePageTitle ?? undefined,
      settings: settings ?? {},
    },
    // revalidate: 60,
  }
}
