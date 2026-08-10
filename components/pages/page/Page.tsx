import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import type { PagePayload, SettingsPayload } from 'types'

export interface PageProps {
  page: PagePayload
  settings: SettingsPayload | undefined
}

export function Page({ page, settings }: PageProps) {
  const { body, overview, title } = page || {}

  return (
    <Layout settings={settings}>
      <div className="mb-14">
        <Header title={title} description={overview} />

        {body && (
          <CustomPortableText
            paragraphClasses="font-ariana max-w-4xl text-text-strong text-base md:text-lg"
            value={body}
          />
        )}
      </div>
    </Layout>
  )
}
