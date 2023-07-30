import { CustomPortableText } from 'components/shared/CustomPortableText'
import ImageBox from 'components/shared/ImageBox'
import type { ShowcaseProject } from 'types'

interface ProjectProps {
  project: ShowcaseProject
  odd: number
}

export function ProjectListItem(props: ProjectProps) {
  const { project, odd } = props

  return (
    <div
      className={`flex flex-col transition hover:bg-gray-100/0 md:flex-row ${
        odd && 'border-b border-t md:flex-row-reverse'
      }`}
    >
      <div className={`w-full md:w-7/12 lg:w-8/12 ${odd ? 'md:border-l' : 'md:border-r'}`}>
        <ImageBox
          image={project.coverImage}
          width={1600}
          height={900}
          alt={`Cover image from ${project.title}`}
          classesWrapper="relative aspect-[16/9] h-full h-full "
        />
      </div>
      <div className={`flex md:px-3 md:w-5/12 lg:w-4/12 border-t md:border-t-0`}>
        <TextBox project={project} />
      </div>
    </div>
  )
}

function TextBox({ project }: { project: ShowcaseProject }) {
  return (
    <div className="relative mt-2 flex w-full flex-col justify-between p-3">
      <div>
        {/* Title */}
        <div className="mb-2 text-xl font-extrabold tracking-tight md:text-2xl">
          {project.title}
        </div>
        {/* Overview  */}
        <div className="font-ariana text-gray-500">
          <CustomPortableText value={project.overview!} />
        </div>
      </div>
      {/* Tags */}
      <div className="md:mt-4 flex flex-row gap-x-2">
        {project.tags?.map((tag, key) => (
          <div className="text-sm font-medium lowercase md:text-lg" key={key}>
            #{tag}
          </div>
        ))}
      </div>
    </div>
  )
}
