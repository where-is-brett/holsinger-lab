import { ProjectListItem } from 'components/pages/home/ProjectListItem'
import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import ScrollUp from 'components/shared/ScrollUp'
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { HomePagePayload } from 'types'
import { SettingsPayload } from 'types'

import HomePageHead from './HomePageHead'

export interface HomePageProps {
  settings: SettingsPayload
  page: HomePagePayload
  preview?: boolean
  loading?: boolean
}

export function HomePage({ page, settings, preview, loading }: HomePageProps) {
  const { overview, showcaseProjects, title = 'Personal website' } = page ?? {}

  return (
    <>
      <HomePageHead page={page} settings={settings} />

      <Layout
        settings={settings}
        preview={preview}
        loading={loading}
        childrenStyles={`px-0`}
      >
        <div className="mb-16 space-y-8">
          {/* Header */}
          {title && <Header centered title={title} description={overview} />}

          {/* Showcase projects */}
          <h1 className="text-center text-xl font-[600] md:text-left md:text-2xl">
            Our Research Projects
          </h1>

          {showcaseProjects && showcaseProjects.length > 0 && (
            <div className="mx-auto max-w-[100rem] border-y md:border">
              {showcaseProjects.map((project, key) => {
                const href = resolveHref(project._type, project.slug)
                if (!href) {
                  return null
                }
                return (
                  <Link key={key} href={href}>
                    <ProjectListItem project={project} odd={key % 2} />
                  </Link>
                )
              })}
            </div>
          )}

          {/* Workaround: scroll to top on route change */}
          <ScrollUp />
        </div>
      </Layout>
    </>
  )
}
