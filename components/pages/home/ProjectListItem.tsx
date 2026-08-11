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
      className={`flex flex-col transition hover:bg-surface-raised/0 md:flex-row ${
        odd && 'border-y md:flex-row-reverse'
      }`}
    >
      <div
        className={`w-full md:w-7/12 lg:w-8/12 ${
          odd ? 'md:border-l' : 'md:border-r'
        }`}
      >
        <ImageBox
          image={project.coverImage}
          alt={`Cover image from ${project.title}`}
          // Measured, not the naive Tailwind fraction: `md:w-7/12`/`lg:w-8/12`
          // apply against the content box inside Layout's `md:px-16 lg:px-32`
          // side padding, so as a fraction of the full viewport the card is
          // smaller than 58%/67%. Measured across 900-1536px viewports: ~49vw
          // in the md range, ~49-55vw in the lg range. 50vw/58vw cover the
          // measured range with a small safety margin.
          size="(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw"
          classesWrapper="relative aspect-[16/9] h-full h-full "
        />
      </div>
      <div
        className={`flex border-t md:w-5/12 md:border-t-0 md:px-3 lg:w-4/12`}
      >
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
        <h3 className="mb-2 text-xl font-extrabold tracking-tight md:text-2xl">
          {project.title}
        </h3>
        {/* Overview  */}
        <div className="font-ariana text-text-muted">
          <CustomPortableText value={project.overview!} />
        </div>
      </div>
      {/* Tags */}
      <div className="flex flex-row gap-x-2 md:mt-4">
        {project.tags?.map((tag, key) => (
          <div className="text-sm font-medium lowercase md:text-lg" key={key}>
            #{tag}
          </div>
        ))}
      </div>
    </div>
  )
}
