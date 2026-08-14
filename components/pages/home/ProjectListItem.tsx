import { CustomPortableText } from 'components/shared/CustomPortableText'
import type { ShowcaseProject } from 'types'

import { FeatureRow } from './FeatureRow'

interface ProjectProps {
  project: ShowcaseProject
  odd: number
}

export function ProjectListItem({ project, odd }: ProjectProps) {
  return (
    <FeatureRow
      image={project.coverImage}
      alt={`Cover image from ${project.title}`}
      side={odd ? 'right' : 'left'}
      title={project.title ?? ''}
      footer={
        <div className="flex flex-row gap-x-2 md:mt-4">
          {project.tags?.map((tag, key) => (
            <div className="text-sm font-medium lowercase md:text-lg" key={key}>
              #{tag}
            </div>
          ))}
        </div>
      }
    >
      <CustomPortableText value={project.overview!} />
    </FeatureRow>
  )
}
