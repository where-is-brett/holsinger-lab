import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import ScrollUp from 'components/shared/ScrollUp'
import type { PagePayload, SettingsPayload } from 'types'

import PageHead from './PageHead'

export interface PageProps {
  page: PagePayload
  settings: SettingsPayload | undefined
  homePageTitle: string | undefined
  preview?: boolean
  loading?: boolean
}

export function Page({
  page,
  settings,
  homePageTitle,
  preview,
  loading,
}: PageProps) {
  // Default to an empty object to allow previews on non-existent documents
  const { body, overview, title } = page || {}

  return (
    <>
      <PageHead page={page} settings={settings} title={homePageTitle} />

      <Layout settings={settings} preview={preview} loading={loading}>
        <>
          <div className="mb-14">
            {/* Header */}
            <Header title={title} description={overview} />

            {/* Body */}
            {body && (
              <CustomPortableText
                paragraphClasses="font-ariana max-w-4xl text-gray-900 text-base md:text-lg"
                value={body}
              />
            )}

            {/* Workaround: scroll to top on route change */}
            <ScrollUp />
          </div>
        </>
      </Layout>
    </>
  )
}
