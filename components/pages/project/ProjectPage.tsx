import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import ImageBox from 'components/shared/ImageBox'
import ScrollUp from 'components/shared/ScrollUp'
import Link from 'next/link'
import type { ProjectPayload, SettingsPayload } from 'types'

import Layout from '../../shared/Layout'
import ProjectPageHead from './ProjectPageHead'

export interface ProjectPageProps {
  project: ProjectPayload
  settings: SettingsPayload | undefined
  homePageTitle: string | undefined
  preview?: boolean
  loading?: boolean
}

export function ProjectPage({
  project,
  settings,
  homePageTitle,
  preview,
  loading,
}: ProjectPageProps) {
  // Default to an empty object to allow previews on non-existent documents
  const {
    category,
    coverImage,
    description,
    duration,
    overview,
    site,
    tags,
    title,
  } = project || {}

  const startYear = new Date(duration?.start!).getFullYear()
  const endYear = duration?.end ? new Date(duration?.end).getFullYear() : 'Now'

  return (
    <>
      <ProjectPageHead project={project} title={homePageTitle} />

      <Layout settings={settings} preview={preview} loading={loading}>
        <div>
          <div className="mb-20 space-y-6">
            {/* Header */}
            <Header title={title} description={overview} />

            <div className="border">
              {/* Image  */}
              <ImageBox
                image={coverImage}
                alt={`Cover image for ${title}`}
                classesWrapper="relative aspect-[16/9]"
              />

              <div className="divide-inherit grid grid-cols-1 divide-y border-t lg:grid-cols-4 lg:divide-x lg:divide-y-0">
                {/* Duration */}
                {!!(startYear && endYear) && (
                  <div className="p-3 lg:p-4">
                    <div className="text-xs md:text-sm">Duration</div>
                    <div className="text-md md:text-lg">{`${startYear} -  ${endYear}`}</div>
                  </div>
                )}

                {/* Category */}
                {category && (
                  <div className="p-3 lg:p-4">
                    <div className="text-xs md:text-sm">Category</div>
                    <div className="text-md md:text-lg">{category}</div>
                  </div>
                )}

                {/* Site */}
                {site && (
                  <div className="p-3 lg:p-4">
                    <div className="text-xs md:text-sm">Site</div>
                    {site && (
                      <Link
                        target="_blank"
                        className="text-md break-words hover:underline md:text-lg"
                        href={site}
                      >
                        {site}
                      </Link>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Tags</div>
                  <div className="text-md flex flex-row flex-wrap md:text-lg">
                    {tags?.map((tag, key) => (
                      <div key={key} className="mr-1 break-words">
                        #{tag}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {description && (
              <CustomPortableText
                paragraphClasses="font-ariana max-w-3xl text-xl"
                value={description}
              />
            )}
            {/* Workaround: scroll to top on route change */}
            <ScrollUp />
          </div>
        </div>
      </Layout>
    </>
  )
}
