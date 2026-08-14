import { FeatureRow } from 'components/pages/home/FeatureRow'
import { ProjectListItem } from 'components/pages/home/ProjectListItem'
import { resolveLabHeadHref } from 'components/pages/home/resolveLabHeadHref'
import { shouldShowLabHeadCard } from 'components/pages/home/shouldShowLabHeadCard'
import { Header } from 'components/shared/Header'
import Layout from 'components/shared/Layout'
import { resolveHref } from 'lib/sanity.links'
import Link from 'next/link'
import type { HomePagePayload, SettingsPayload } from 'types'

export interface HomePageProps {
  settings: SettingsPayload
  page: HomePagePayload
}

export function HomePage({ page, settings }: HomePageProps) {
  const { overview, showcaseProjects, title = 'Personal website' } = page ?? {}
  const labHead = settings.labHead
  const showLabHeadCard = shouldShowLabHeadCard(settings) && Boolean(labHead)

  return (
    <Layout settings={settings} childrenStyles={`px-0`}>
      <div className="mb-16 space-y-8">
        {/* Header */}
        {title && <Header centered title={title} description={overview} />}

        {/* Showcase projects */}
        <h2 className="text-center text-xl font-[600] md:text-left md:text-2xl">
          Our Research Projects
        </h2>

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

        {/* Lab head */}
        {showLabHeadCard && labHead && (
          <>
            <h2 className="text-center text-xl font-[600] md:text-left md:text-2xl">
              About {labHead.name}
            </h2>
            <div className="mx-auto max-w-[100rem] border-y md:border">
              <Link href={resolveLabHeadHref(labHead)}>
                <FeatureRow
                  image={labHead.image}
                  alt={
                    labHead.name
                      ? `Portrait of ${labHead.name}`
                      : 'Lab head portrait'
                  }
                  side="right"
                  title={labHead.role ?? ''}
                >
                  {labHead.bio && <p>{labHead.bio}</p>}
                </FeatureRow>
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
