import { CustomPortableText } from 'components/shared/CustomPortableText'
import { Header } from 'components/shared/Header'
import ImageBox from 'components/shared/ImageBox'
import Link from 'next/link'
import type { ProjectPayload, SettingsPayload } from 'types'

import Layout from '../../shared/Layout'

export interface ProjectPageProps {
  project: ProjectPayload
  settings: SettingsPayload | undefined
}

export function ProjectPage({ project, settings }: ProjectPageProps) {
  const {
    category,
    coverImage,
    description,
    duration,
    overview,
    site,
    status,
    tags,
    title,
  } = project || {}

  // `duration?.start!` (the non-null assertion this replaces) was load-bearing
  // on optional data: when duration/start is unset, `new Date(undefined!)` is
  // an Invalid Date whose getFullYear() is NaN, and the render below only
  // avoided showing "NaN - Now" because `{!!(startYear && endYear) && (...)}`
  // happened to short-circuit on the falsy NaN. Replacing the assertion with
  // real optional handling keeps the same behaviour (hide the block when
  // there's no start date; show "<year> - Now" for an ongoing project with a
  // start but no end date) without depending on that coincidence.
  const startYear = duration?.start ? new Date(duration.start).getFullYear() : undefined
  const endYear = duration?.end ? new Date(duration.end).getFullYear() : 'Now'

  const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    completed: 'Completed',
    'seeking-students': 'Seeking Students',
  }

  return (
    <Layout settings={settings}>
      <div>
        <div className="mb-20 space-y-6">
          <Header title={title} description={overview} />

          <div className="border">
            <ImageBox
              image={coverImage}
              alt={`Cover image for ${title}`}
              size="100vw"
              classesWrapper="relative aspect-[16/9]"
            />

            <div className="divide-inherit grid grid-cols-1 divide-y border-t lg:grid-cols-4 lg:divide-x lg:divide-y-0">
              {startYear && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Duration</div>
                  <div className="text-body md:text-lg">{`${startYear} -  ${endYear}`}</div>
                </div>
              )}

              {category && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Category</div>
                  <div className="text-body md:text-lg">{category}</div>
                </div>
              )}

              {status && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Status</div>
                  <div className="text-body md:text-lg">{STATUS_LABELS[status] ?? status}</div>
                </div>
              )}

              {site && (
                <div className="p-3 lg:p-4">
                  <div className="text-xs md:text-sm">Site</div>
                  {site && (
                    <Link
                      target="_blank"
                      className="text-body break-words hover:underline md:text-lg"
                      href={site}
                    >
                      {site}
                    </Link>
                  )}
                </div>
              )}

              <div className="p-3 lg:p-4">
                <div className="text-xs md:text-sm">Tags</div>
                <div className="text-body flex flex-row flex-wrap md:text-lg">
                  {tags?.map((tag, key) => (
                    <div key={key} className="mr-1 break-words">
                      #{tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {description && (
            <CustomPortableText
              paragraphClasses="font-ariana max-w-3xl text-xl"
              value={description}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}
