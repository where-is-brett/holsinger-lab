import { HomePage } from 'components/pages/home/HomePage'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import { homePageQuery, settingsQuery } from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { HomePagePayload, SettingsPayload } from 'types'

interface PageProps {
  page: HomePagePayload
  settings: SettingsPayload
  preview: boolean
}

interface Query {
  [key: string]: string
}

export default function IndexPage(props: PageProps) {
  const { page, settings, preview } = props

  return <HomePage page={page} settings={settings} preview={preview} />
}

const fallbackPage: HomePagePayload = {
  title: '',
  overview: [],
  showcaseProjects: [],
}

export const getStaticProps: GetStaticProps<PageProps, Query> = async (ctx) => {
  const { draftMode = false } = ctx
  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [settings, page] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<HomePagePayload | null>(homePageQuery),
  ])

  return {
    props: {
      page: page ?? fallbackPage,
      settings: settings ?? {},
      preview: draftMode,
    },
    revalidate: 60,
  }
}
