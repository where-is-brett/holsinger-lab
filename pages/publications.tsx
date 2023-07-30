import { SiteMeta } from 'components/global/SiteMeta'
import Layout from 'components/shared/Layout'
import Publications from 'components/pages/publications/Publications'
import { readToken } from 'lib/sanity.api'
import { getClient } from 'lib/sanity.client'
import {
  homePageTitleQuery,
  settingsQuery,
  publicationsQuery
} from 'lib/sanity.queries'
import { GetStaticProps } from 'next'
import { SettingsPayload, PublicationPayload } from 'types'

interface PageProps {
  settings: SettingsPayload
  homePageTitle?: string
  preview: boolean
  token: string | null
  publications: Object[]
}

export default function PublicationsPage(props: PageProps) {
  const { homePageTitle, settings, preview, publications } = props

  if (preview) {
    return
  }

  return (
    <>
      <SiteMeta
        baseTitle={homePageTitle}
        description={'Explore the publications by the Laboratory of Molecular Neuroscience and Dementia. Discover the latest advancements and insights in neuroscience, molecular biology, and dementia research, authored by our esteemed team of scientists and researchers.'}
        image={settings?.ogImage}
        title={'Publications'}
      />
      <Layout settings={settings}>
        <Publications publications={publications} />
      </Layout>
    </>
  )
}

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const { draftMode = false, params = {} } = ctx
  const client = getClient(draftMode ? { token: readToken } : undefined)

  const [settings, homePageTitle, publications] = await Promise.all([
    client.fetch<SettingsPayload | null>(settingsQuery),
    client.fetch<string | null>(homePageTitleQuery),
    client.fetch<PublicationPayload[] | null>(publicationsQuery),
  ])

  if (!publications) {
    return {
      notFound: true,
    }
  }

  if (!settings?.showPublications) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      settings: settings ?? {},
      homePageTitle: homePageTitle ?? undefined,
      preview: draftMode,
      token: draftMode ? readToken : null,
      publications: publications,
    },
    // revalidate: 60,
  }
}


