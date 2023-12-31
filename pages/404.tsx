import { SiteMeta } from 'components/global/SiteMeta'
import Layout from 'components/shared/Layout'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { homePageTitleQuery, settingsQuery } from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import notFoundSVG from 'public/404.svg'
import { SettingsPayload } from 'types'

export default function NotFoundPage({ settings, homePageTitle }) {
  return (
    <>
      <SiteMeta
        baseTitle={homePageTitle}
        description={
          'The page you are looking for cannot be found. It may have been moved, deleted, or the URL might be misspelled. Please check the URL or return to our homepage to explore more of our content and services.'
        }
        image={settings?.ogImage}
        title={'Page Not Found'}
      />
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
              className="text-black underline hover:text-gray-600"
            >
              home page
            </Link>
            ?
          </p>
        </div>
      </Layout>
    </>
  )
}

interface PageProps {
  settings: SettingsPayload | undefined
  homePageTitle: string | null
}

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const { draftMode = false } = ctx
  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [settings, homePageTitle] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<string | null>(homePageTitleQuery),
  ])

  return {
    props: {
      settings: settings ?? {},
      homePageTitle: homePageTitle,
    },
  }
}
